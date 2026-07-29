import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyAccessToken } from '../utils/accessToken';
import { inboxRealtimeHub } from './inboxRealtimeHub';
import notificationService from '../services/notificationService';

const WS_PATH = '/api/v1/notifications/inbox/ws';

export function attachInboxWebSocket(server: http.Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = request.url || '';
    if (!url.startsWith(WS_PATH)) {
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', async (ws: WebSocket, request: http.IncomingMessage) => {
    try {
      const requestUrl = new URL(request.url || '', 'http://localhost');
      const token = requestUrl.searchParams.get('token')?.trim();
      if (!token) {
        ws.close(4401, 'Missing token query parameter');
        return;
      }
      const user = verifyAccessToken(token);
      if (!user) {
        ws.close(4401, 'Invalid access token');
        return;
      }

      inboxRealtimeHub.add(user.userId, ws);
      const unreadCount = await notificationService.getInAppUnreadCount(user.userId);
      ws.send(JSON.stringify({ type: 'inbox.connected', unreadCount }));

      ws.on('close', () => {
        inboxRealtimeHub.remove(user.userId, ws);
      });

      ws.on('error', () => {
        inboxRealtimeHub.remove(user.userId, ws);
      });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(String(raw)) as { type?: string };
          if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {
          // ignore malformed client messages
        }
      });
    } catch {
      ws.close(1011, 'Internal error');
    }
  });
}

export { WS_PATH };
