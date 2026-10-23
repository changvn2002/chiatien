/** Sinh id ngẫu nhiên cho session/member/expense. */
export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Fallback cho môi trường cũ: đủ ngẫu nhiên cho id cục bộ trong localStorage.
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
