import jwt from 'jsonwebtoken';
import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';
import { sshSessionManager } from '~/server/util/sshSessionManager';

export default defineWebSocketHandler({
  open(peer) {
    let rawUrl = (peer as any).request?.url
      || (peer as any)._internal?.nodeReq?.url
      || '';
    if (rawUrl && !rawUrl.startsWith('http') && !rawUrl.startsWith('/')) {
      rawUrl = '/' + rawUrl;
    }

    const url = new URL(rawUrl || '/ws/ssh', 'http://localhost');

    if (!environment.settings || !environment.settings.jwt_secret) {
      loadJsonFile();
    }

    // --- AUTHENTICATION CHECK ---
    let token = url.searchParams.get('token');

    if (!token) {
      const req = (peer as any).request;
      const nodeReq = (peer as any)._internal?.nodeReq;
      const cookieHeader =
        req?.headers?.get?.('cookie')
        || nodeReq?.headers?.cookie
        || (req?.headers as any)?.cookie
        || '';
      const cookieMatch = cookieHeader.match(/(?:^|;\s*)token=([^;]*)/);
      if (cookieMatch) {
        token = cookieMatch[1];
      }
    }

    if (!token) {
      peer.send(JSON.stringify({ type: 'error', data: '\r\n\x1b[31m[ControlCenter] Error: Authentication required. No token provided.\x1b[0m\r\n' }));
      peer.close();
      return;
    }

    try {
      const decoded = jwt.verify(token, environment.jwt_globals.secret) as any;
      if (decoded && decoded.isPartial) {
        peer.send(JSON.stringify({ type: 'error', data: '\r\n\x1b[31m[ControlCenter] Error: Incomplete authentication. 2FA verification required.\x1b[0m\r\n' }));
        peer.close();
        return;
      }
    } catch {
      peer.send(JSON.stringify({ type: 'error', data: '\r\n\x1b[31m[ControlCenter] Error: Invalid or expired authentication token.\x1b[0m\r\n' }));
      peer.close();
      return;
    }
    // --- END AUTHENTICATION CHECK ---

    const machineId = url.searchParams.get('machineId') || url.searchParams.get('machineid') || url.searchParams.get('id');

    if (!machineId || machineId === 'undefined') {
      peer.send(JSON.stringify({ type: 'error', data: '\r\n\x1b[31m[ControlCenter] Error: Missing or invalid machineId parameter.\x1b[0m\r\n' }));
      peer.close();
      return;
    }

    const machine = environment.settings.machines.find(m => m.id === machineId);
    if (!machine) {
      peer.send(JSON.stringify({ type: 'error', data: `\r\n\x1b[31m[ControlCenter] Error: Machine not found (ID: ${machineId}).\x1b[0m\r\n` }));
      peer.close();
      return;
    }

    const cols = Number(url.searchParams.get('cols')) || Number((peer as any)._pendingCols) || 80;
    const rows = Number(url.searchParams.get('rows')) || Number((peer as any)._pendingRows) || 24;

    let session = sshSessionManager.getSession(machineId);

    if (session && session.status === 'connected') {
      (peer as any)._session = session;
      session.attachPeer(peer);
      session.resize(cols, rows);
    } else {
      session = sshSessionManager.createSession(machine, cols, rows);
      (peer as any)._session = session;
      session.attachPeer(peer);
    }
  },

  message(peer, message) {
    const session = (peer as any)._session;
    try {
      const payload = JSON.parse(message.text());

      if (payload.type === 'input' && session) {
        session.writeInput(payload.data);
      } else if (payload.type === 'resize') {
        const cols = Number(payload.cols) || 80;
        const rows = Number(payload.rows) || 24;
        (peer as any)._pendingCols = cols;
        (peer as any)._pendingRows = rows;
        if (session) {
          session.resize(cols, rows);
        }
      } else if (payload.type === 'reset' && session) {
        // Force session reset
        const machine = environment.settings.machines.find(m => m.id === session.machineId);
        if (machine) {
          const newSession = sshSessionManager.createSession(machine, session.cols, session.rows);
          (peer as any)._session = newSession;
          newSession.attachPeer(peer);
        }
      }
    } catch {
      if (session) {
        session.writeInput(message.text());
      }
    }
  },

  close(peer) {
    const session = (peer as any)._session;
    if (session) {
      session.detachPeer(peer);
    }
  }
});
