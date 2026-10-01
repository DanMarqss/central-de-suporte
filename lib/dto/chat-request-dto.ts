export type ChatRequestDto = { message: string };

export function parseChatRequest(value: unknown): ChatRequestDto | null {
  if (!value || typeof value !== "object" || !("message" in value)) return null;
  const message = (value as { message?: unknown }).message;
  if (typeof message !== "string" || !message.trim() || message.length > 4000) return null;
  return { message: message.trim() };
}
