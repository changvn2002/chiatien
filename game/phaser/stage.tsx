'use client';

// stage.tsx — Component React sở hữu vòng đời Phaser (ARCHITECTURE §1.1–§1.2).
//
// HỢP ĐỒNG VỚI LANE P-CORE:
// - Import component này tại đúng đường dẫn `game/phaser/stage.tsx`, export
//   `GameStage`, props theo `StageProps` trong bridge.ts. P-CORE phải mount
//   GameStage từ phía sau cổng dynamic `ssr: false` của game module
//   (game/entry.tsx) — bản thân file này cũng không import tĩnh phaser.
// - Phaser CHỈ vào bundle qua `import('phaser')` trong effect của file này
//   (kèm import('./scenes')) — không import tĩnh ở entry/screens/stage.
//
// VÒNG ĐỜI (ARCHITECTURE §1.2, đúng thứ tự):
// - Mount / đổi log: tạo ĐÚNG MỘT Phaser.Game gắn vào div container do React
//   sở hữu (Scale.FIT, nền trong suốt), add 2 scene (không auto-start), start
//   scene khớp log.params.game kèm SceneBootData.
// - Unmount / đổi log: (a) dừng scene đang chạy → (b) game.destroy(true)
//   gỡ canvas + huỷ vòng lặp → (c) xoá listener bus của stage. Sau destroy,
//   container không còn canvas. Vào lại = instance mới hoàn toàn.
// - Âm thanh Howler do P-CORE sở hữu (game/audio) và truyền qua prop
//   `sound`; stage chỉ chuyển tiếp setMuted — việc stop/unload Howl khi rời
//   mode thuộc P-CORE (stage không giữ tham chiếu Howl nào).

import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import {
  EventBus,
  STAGE_EVENTS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  type StageDegradedPayload,
  type StageProps,
} from './bridge';
import { FpsDegradeTracker } from './degrade';

export function GameStage(props: StageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const degradeRef = useRef<FpsDegradeTracker | null>(null);

  // Luôn giữ props mới nhất trong ref để các effect dài hơi (boot Phaser,
  // listener bus) không giữ closure cũ. Effect này khai báo TRƯỚC effect
  // boot nên chạy trước nó ở mọi lần render.
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const logKey = props.log.logHash;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let game: Phaser.Game | null = null;

    const onFinished = () => {
      const current = propsRef.current;
      // Không có nơi nhận frame: giữ hành vi cũ.
      if (!current.onFinalFrame || !gameRef.current) {
        current.onFinished();
        return;
      }
      // SPEC §M7 áp cho CẢ HAI game (G1 và G2): chụp frame cuối của ván —
      // scene đã dừng và đã vẽ trạng thái kết ván (highlight ở G2, khung
      // hình cuối trận ở G1) trước khi emit FINISHED — TRƯỚC khi React
      // chuyển sang M7 và stage unmount. onFinished chỉ được gọi ĐÚNG
      // MỘT LẦN: cờ `called` + fallback 700ms nếu snapshot không trả
      // callback + try/catch quanh snapshot (lỗi → vẫn onFinished,
      // không có frame).
      let called = false;
      const timer = setTimeout(() => finishOnce(), 700);
      function finishOnce(dataUrl?: string) {
        if (called) return;
        called = true;
        clearTimeout(timer);
        if (dataUrl) {
          try {
            current.onFinalFrame?.(dataUrl);
          } catch {
            // Không để lỗi ở nơi nhận frame chặn việc chuyển sang M7.
          }
        }
        current.onFinished();
      }
      try {
        const g = gameRef.current;
        // Cast tối thiểu qua unknown: renderer là union Canvas/WebGL của
        // Phaser và SnapshotCallback của nó không khai báo trường hợp
        // HTMLCanvasElement mà ta vẫn phải xử lý ở runtime bên dưới.
        const renderer = g.renderer as unknown as {
          snapshot: (
            callback: (image: unknown) => void,
            type?: string,
            encoderOptions?: number,
          ) => unknown;
        };
        renderer.snapshot(
          (image: unknown) => {
            let dataUrl: string | undefined;
            if (image instanceof HTMLImageElement) {
              dataUrl = image.src;
            } else if (image instanceof HTMLCanvasElement) {
              dataUrl = image.toDataURL('image/png');
            }
            finishOnce(dataUrl);
          },
          // PNG (không phải JPEG): canvas của stage có nền TRONG SUỐT —
          // JPEG không có alpha nên vùng trong suốt thành nền đen ở M7
          // (bắt gặp khi chụp pack đợt PRES). PNG giữ alpha, frame hiển
          // thị đúng trên nền thẻ trắng của app.
          'image/png',
        );
      } catch {
        finishOnce();
      }
    };
    const onDegraded = (payload: StageDegradedPayload) => {
      propsRef.current.onDegrade?.(payload.level);
      // Bậc 2: hạ độ phân giải render — thu nhỏ game size còn 75%, Scale
      // .FIT phóng canvas trở lại kích thước hiển thị cũ (mờ hơn, nhẹ
      // hơn). Scene nghe sự kiện 'resize' và co root container tương ứng
      // nên bố cục không đổi. Chỉ hạ, không nâng lại giữa ván (tracker
      // trong degrade.ts vốn đơn điệu không giảm).
      if (payload.level >= 2 && gameRef.current) {
        const g = gameRef.current;
        const targetW = Math.round(STAGE_WIDTH * 0.75);
        if (g.scale.width !== targetW) {
          g.scale.resize(targetW, Math.round(STAGE_HEIGHT * 0.75));
        }
      }
    };
    EventBus.on(STAGE_EVENTS.FINISHED, onFinished as never);
    EventBus.on(STAGE_EVENTS.DEGRADED, onDegraded as never);

    void (async () => {
      const [phaserModule, scenes] = await Promise.all([import('phaser'), import('./scenes')]);
      if (cancelled || !containerRef.current) return;
      const PhaserLib = phaserModule.default;
      const degrade = new FpsDegradeTracker();
      degradeRef.current = degrade;
      const current = propsRef.current;

      game = new PhaserLib.Game({
        type: PhaserLib.AUTO,
        parent: container,
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        transparent: true,
        scale: {
          mode: PhaserLib.Scale.FIT,
          autoCenter: PhaserLib.Scale.CENTER_BOTH,
        },
        render: { antialias: true },
        fps: { target: 60 },
        // F2 (audit PWA native-feel): canvas Phaser phải có
        // touch-action: none — nếu không, trình duyệt giành cử chỉ
        // chạm trên canvas cho cuộn/zoom trang và Phaser mất sự kiện
        // chạm giữa ván. canvasStyle của Phaser áp thẳng lên element
        // canvas lúc tạo game — điểm sửa DUY NHẤT của file này.
        canvasStyle: 'touch-action: none;',
      });
      gameRef.current = game;
      game.scene.add(scenes.G2_SCENE_KEY, scenes.G2Scene, false);
      game.scene.add(scenes.G1_SCENE_KEY, scenes.G1Scene, false);
      const sceneKey =
        current.log.params.game === 'g2' ? scenes.G2_SCENE_KEY : scenes.G1_SCENE_KEY;
      game.scene.start(sceneKey, {
        log: current.log,
        players: current.players,
        speed: current.speed,
        muted: current.muted,
        sound: current.sound,
        degrade,
      });
    })();

    return () => {
      cancelled = true;
      // (a) Dừng scene đang chạy → (b) destroy gỡ canvas + huỷ loop →
      // (c) xoá listener bus của stage. Đúng thứ tự ARCHITECTURE §1.2.
      if (game) {
        try {
          game.scene.stop(scenesKeyOf(propsRef.current.log.params.game));
        } catch {
          // Scene chưa kịp start — bỏ qua, destroy ở dưới vẫn dọn đủ.
        }
        game.destroy(true);
      }
      gameRef.current = null;
      degradeRef.current = null;
      EventBus.off(STAGE_EVENTS.FINISHED, onFinished as never);
      EventBus.off(STAGE_EVENTS.DEGRADED, onDegraded as never);
    };
    // Chỉ tạo lại instance khi ván đổi (logHash) — speed/muted đi qua bus.
  }, [logKey]);

  // Dịch props speed/muted → bus cho scene đang chạy (cơ chế đã chốt ở
  // bridge.ts). Lần render đầu chưa có scene: giá trị khởi tạo đã đi qua
  // SceneBootData nên việc emit sớm vô hại (không listener nào nhận).
  useEffect(() => {
    EventBus.emit(STAGE_EVENTS.SET_SPEED, { speed: props.speed });
  }, [props.speed]);

  useEffect(() => {
    EventBus.emit(STAGE_EVENTS.SET_MUTED, { muted: props.muted });
    props.sound?.setMuted?.(props.muted);
  }, [props.muted, props.sound]);

  return (
    <div
      ref={containerRef}
      data-aidai-stage=""
      // FIX-V3 P1.5: sân chiếm TỐI ĐA chiều cao khả dụng trong
      // overlay (trước đây container lún trong trang form, sân chỉ
      // ~40% viewport): khung giữ tỉ lệ sân 1:1, cao tối đa 78dvh,
      // căn giữa; Phaser Scale.FIT tự letterbox canvas vào khung.
      style={{
        width: '100%',
        height: '100%',
        minHeight: 320,
        aspectRatio: '1 / 1',
        maxHeight: '78dvh',
        marginInline: 'auto',
      }}
      aria-label={props.log.params.game === 'g2' ? 'Mâm cơm xoay' : 'Đấu trường'}
    />
  );
}

/** Key của scene theo game — trùng hằng số trong scenes-g1/g2 (tránh import tĩnh scenes vào cleanup). */
function scenesKeyOf(game: 'g1' | 'g2'): string {
  return game === 'g2' ? 'aidai-g2' : 'aidai-g1';
}

export default GameStage;
