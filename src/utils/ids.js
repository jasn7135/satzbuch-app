export const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
