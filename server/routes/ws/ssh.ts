import { Client } from 'ssh2';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { environment } from '~/core/globals';
import { loadJsonFile } from '~/util/jsonLoader';

export default defineWebSocketHandler({
  open(peer) {
    // crossws exposes the upgrade request URL via peer.request.url (not peer.url)
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
    // Try query param first (API/testing), then cookie from upgrade request headers
    let token = url.searchParams.get('token');

    if (!token) {
      // Parse token from cookie header on the WebSocket upgrade request
      // crossws peer.request.headers is a Web API Headers object (use .get()),
      // fall back to the underlying node IncomingMessage headers (plain object)
      const req = (peer as any).request;
      const nodeReq = (peer as any)._internal?.nodeReq;
      const cookieHeader =
        req?.headers?.get?.('cookie')           // crossws NodeReqProxy Headers object
        || nodeReq?.headers?.cookie              // raw node IncomingMessage
        || (req?.headers as any)?.cookie         // plain object fallback
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
      jwt.verify(token, environment.jwt_globals.secret);
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

    const ssh = new Client();
    (peer as any)._ssh = ssh;

    const host = machine.ip || '127.0.0.1';
    const port = machine.sshPort || 22;
    const user = machine.sshUser || 'root';

    peer.send(JSON.stringify({ type: 'status', data: `\x1b[33mConnecting to ${machine.name} (${user}@${host}:${port})...\x1b[0m\r\n` }));

    ssh.on('ready', () => {
      peer.send(JSON.stringify({ type: 'status', data: `\x1b[32mSSH Connection Established to ${machine.name}.\x1b[0m\r\n\r\n` }));

      const initialCols = Number((peer as any)._pendingCols) || 80;
      const initialRows = Number((peer as any)._pendingRows) || 24;

      ssh.shell(
        {
          term: 'xterm-256color',
          cols: initialCols,
          rows: initialRows
        },
        (err, stream) => {
          if (err) {
            peer.send(JSON.stringify({ type: 'error', data: `\r\n\x1b[31mSSH Shell creation failed: ${err.message}\x1b[0m\r\n` }));
            peer.close();
            return;
          }

          (peer as any)._sshStream = stream;

          // Apply client dimensions to PTY if resize was received before shell ready
          if ((peer as any)._pendingCols && (peer as any)._pendingRows) {
            const cols = (peer as any)._pendingCols;
            const rows = (peer as any)._pendingRows;
            try {
              stream.setWindow(rows, cols, rows * 17, cols * 9);
            } catch {}
          }

          stream.on('data', (data: Buffer) => {
            peer.send(JSON.stringify({ type: 'output', data: data.toString('utf-8') }));
          });

          stream.on('close', () => {
            peer.send(JSON.stringify({ type: 'status', data: '\r\n\x1b[33m[ControlCenter] Connection closed by remote host.\x1b[0m\r\n' }));
            peer.close();
          });
        }
      );
    });

    ssh.on('error', (err: any) => {
      peer.send(JSON.stringify({ type: 'error', data: `\r\n\x1b[31mSSH Error: ${err.message || err}\x1b[0m\r\n` }));
      peer.close();
    });

    const connectConfig: any = {
      host,
      port,
      username: user,
      readyTimeout: 10000
    };

    if (machine.sshAuthType === 'key') {
      let keyContent = '';
      if (machine.sshKeyFile) {
        const keyFileName = machine.sshKeyFile.trim();
        if (!keyFileName.includes('/') && !keyFileName.includes('\\') && !keyFileName.includes('..')) {
          const keyPath = path.join(environment.paths.sshKeys, keyFileName);
          if (fs.existsSync(keyPath)) {
            keyContent = fs.readFileSync(keyPath, 'utf8');
          }
        }
      }
      if (!keyContent && (machine as any).sshPrivateKey) {
        keyContent = (machine as any).sshPrivateKey;
      }
      if (keyContent) {
        connectConfig.privateKey = keyContent;
      } else {
        peer.send(JSON.stringify({ type: 'error', data: `\r\n\x1b[31m[ControlCenter] Error: SSH key file "${machine.sshKeyFile || 'unspecified'}" not found in ~/.ssh/ControlCenterKeys/\x1b[0m\r\n` }));
        peer.close();
        return;
      }
    } else if (machine.sshPassword) {
      connectConfig.password = machine.sshPassword;
    }

    try {
      ssh.connect(connectConfig);
    } catch (e: any) {
      peer.send(JSON.stringify({ type: 'error', data: `\r\n\x1b[31mFailed to initiate SSH connection: ${e.message}\x1b[0m\r\n` }));
      peer.close();
    }
  },

  message(peer, message) {
    try {
      const payload = JSON.parse(message.text());
      const stream = (peer as any)._sshStream;

      if (payload.type === 'input' && stream) {
        stream.write(payload.data);
      } else if (payload.type === 'resize') {
        const cols = Number(payload.cols) || 80;
        const rows = Number(payload.rows) || 24;
        (peer as any)._pendingCols = cols;
        (peer as any)._pendingRows = rows;
        if (stream) {
          try {
            stream.setWindow(rows, cols, rows * 17, cols * 9);
          } catch {}
        }
      }
    } catch {
      const stream = (peer as any)._sshStream;
      if (stream) {
        stream.write(message.text());
      }
    }
  },

  close(peer) {
    const ssh = (peer as any)._ssh as Client;
    if (ssh) {
      ssh.end();
    }
  }
});
