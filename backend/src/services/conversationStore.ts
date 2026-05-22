export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  ts: number;
}

const store = new Map<string, ChatMessage[]>();
const MAX_MESSAGES = 20;

export function getHistory(phone: string): ChatMessage[] {
  return store.get(phone) ?? [];
}

export function appendMessage(phone: string, role: ChatRole, content: string): void {
  const history = store.get(phone) ?? [];
  history.push({ role, content, ts: Date.now() });
  if (history.length > MAX_MESSAGES) {
    history.splice(0, history.length - MAX_MESSAGES);
  }
  store.set(phone, history);
}

export function clearHistory(phone: string): void {
  store.delete(phone);
}
