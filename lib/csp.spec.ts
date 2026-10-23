import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

/**
 * SEC-02 header-assertion: CSP khai trong next.config.ts phải khớp HỒ SƠ
 * đã đăng ký — docs/security/CSP-EXCEPTION-P02.md (đường C) + sổ đăng ký
 * docs/security/EXCEPTION-REGISTRY.md. Lệch directive, xuất hiện token
 * ngoài hồ sơ, hoặc ngoại lệ hết hạn mà chưa gia hạn kèm bằng chứng mới
 * -> test fail (đúng quy định "hết hạn = quay về FAIL" của checklist).
 */
function parseCsp(csp: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of csp.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    map.set(tokens[0], tokens.slice(1));
  }
  return map;
}

interface RegistryEntry {
  id: string;
  directive: string;
  token: string;
  expires: string; // YYYY-MM-DD
}

function loadRegistry(): RegistryEntry[] {
  const url = new URL('../docs/security/EXCEPTION-REGISTRY.md', import.meta.url);
  const text = readFileSync(url, 'utf8');
  const entries: RegistryEntry[] = [];
  const re = /^(\S+) \| directive: (\S+) \| token: (\S+) \| expires: (\d{4}-\d{2}-\d{2})$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    entries.push({ id: m[1], directive: m[2], token: m[3], expires: m[4] });
  }
  return entries;
}

async function cspDirectives(): Promise<Map<string, string[]>> {
  const rules = await nextConfig.headers!();
  const rule = rules.find((r) => r.source === '/:path*');
  const header = rule?.headers.find((h) => h.key === 'Content-Security-Policy');
  if (!header) throw new Error('Không tìm thấy header Content-Security-Policy trong next.config');
  return parseCsp(header.value);
}

describe('SEC-02 — CSP khớp hồ sơ ngoại lệ P-02 đã đăng ký', () => {
  it('các directive nền ở mức chặt nhất theo checklist', async () => {
    const csp = await cspDirectives();
    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'self'"]);
    expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
    expect(csp.get('connect-src')).toEqual(["'self'"]);
  });

  it("script-src không chứa 'unsafe-eval', *, data: và không origin ngoài", async () => {
    const csp = await cspDirectives();
    const scriptSrc = csp.get('script-src') ?? [];
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain('*');
    expect(scriptSrc).not.toContain('data:');
    // Chỉ hai token được phép tồn tại: 'self' + token ngoại lệ đã đăng ký.
    for (const token of scriptSrc) {
      expect(["'self'", "'unsafe-inline'"]).toContain(token);
    }
  });

  it("mọi 'unsafe-inline' trong CSP đều có mục sổ đăng ký chưa hết hạn", async () => {
    const csp = await cspDirectives();
    const registry = loadRegistry();
    expect(registry.length).toBeGreaterThan(0);
    const today = new Date().toISOString().slice(0, 10);
    for (const directive of ['script-src', 'style-src']) {
      const tokens = csp.get(directive) ?? [];
      if (!tokens.includes("'unsafe-inline'")) continue;
      const entry = registry.find(
        (e) => e.directive === directive && e.token === "'unsafe-inline'",
      );
      expect(entry, `${directive} có 'unsafe-inline' nhưng sổ đăng ký thiếu mục`).toBeDefined();
      expect(
        entry!.expires >= today,
        `Ngoại lệ ${entry!.id} hết hạn ${entry!.expires} — gia hạn kèm bằng chứng mới hoặc đóng ngoại lệ`,
      ).toBe(true);
    }
  });
});
