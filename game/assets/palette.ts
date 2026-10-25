// palette.ts — ĐÃ GỘP vào nguồn danh tính duy nhất (đợt FIX-V3, P0.4).
//
// Hệ gán màu áo theo id trên tập con người chơi từng sống ở file này
// đã bị XOÁ hẳn: nó là hệ danh tính thứ hai song song với lib/identity
// và làm cùng một người đổi màu khi cỡ nhóm / màn thay đổi (panel v3).
// Bảng màu đậm của game giờ là STRONG_HEX_BY_COLOR_INDEX trong
// game/assets/identity.ts — ánh xạ theo colorIndex do
// assignIdentityColors của lib gán trên roster ĐẦY ĐỦ của phiên
// (họ màu Material bậc 700, cùng thứ tự họ với nền avatar V4 của app
// chính). File này chỉ tái xuất bảng đó để các import cũ theo đường
// palette không gãy; KHÔNG còn hàm gán màu nào ở đây — mọi điểm cần
// màu / initials phải đi qua buildIdentityMap của identity.ts.

export { STRONG_HEX_BY_COLOR_INDEX, STRONG_NAME_BY_COLOR_INDEX } from './identity';
