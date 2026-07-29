import { WebSocket } from 'ws';

export type InboxRealtimeEvent =
  | { type: 'inbox.connected'; unreadCount: number }
  | { type: 'notification.new'; notification: Record<string, unknown> }
  | { type: 'notification.read'; id: string; readAt: string }
  | { type: 'notification.read_bulk'; ids: string[]; readAt: string }
  | { type: 'notification.deleted'; id: string }
  | { type: 'notification.deleted_bulk'; ids: string[] }
  | { type: 'inbox.unread_count'; unreadCount: number };

class InboxRealtimeHub {
  private rooms = new Map<string, Set<WebSocket>>();

  add(userId: string, ws: WebSocket): void {
    const key = userId.trim();
    if (!this.rooms.has(key)) {
      this.rooms.set(key, new Set());
    }
    this.rooms.get(key)!.add(ws);
  }

  remove(userId: string, ws: WebSocket): void {
    const set = this.rooms.get(userId.trim());
    if (!set) {
      return;
    }
    set.delete(ws);
    if (set.size === 0) {
      this.rooms.delete(userId.trim());
    }
  }

  publish(userId: string, event: InboxRealtimeEvent): void {
    const set = this.rooms.get(userId.trim());
    if (!set || set.size === 0) {
      return;
    }
    const payload = JSON.stringify(event);
    for (const ws of set) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}

export const inboxRealtimeHub = new InboxRealtimeHub();
