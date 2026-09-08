/**
 * Throwaway SMTP server for local work, so the lead flow can be exercised
 * without real mail credentials:
 *
 *   node scripts/dev-smtp.mjs                 # listens on 127.0.0.1:1025
 *   SMTP_HOST=127.0.0.1 SMTP_PORT=1025 npm run dev
 *
 * It accepts any sender, prints one line per message, and writes the raw mail
 * to tmp/mail/. It authenticates nobody and delivers nothing. Never point a
 * deployed environment at it.
 */
import net from 'net';
import fs from 'fs';
import path from 'path';

const PORT = Number(process.env.DEV_SMTP_PORT || 1025);
const DIR = path.join(process.cwd(), 'tmp', 'mail');
fs.mkdirSync(DIR, { recursive: true });
let count = 0;

net
  .createServer((socket) => {
    let mode = 'command';
    let buffer = '';
    let envelope = { to: [] };
    socket.write('220 dev-smtp ready\r\n');

    socket.on('data', (chunk) => {
      const text = chunk.toString();

      if (mode === 'data') {
        buffer += text;
        if (!buffer.includes('\r\n.\r\n')) return;
        const body = buffer.split('\r\n.\r\n')[0];
        const subject = (body.match(/^Subject: (.*)$/m) || [])[1] || '(no subject)';
        count += 1;
        const file = path.join(DIR, `${String(count).padStart(3, '0')}.eml`);
        fs.writeFileSync(file, body);
        console.log(JSON.stringify({ mail: count, from: envelope.from, to: envelope.to, subject, file }));
        mode = 'command';
        buffer = '';
        envelope = { to: [] };
        socket.write('250 OK queued\r\n');
        return;
      }

      for (const line of text.split('\r\n').filter(Boolean)) {
        const verb = line.toUpperCase();
        if (verb.startsWith('EHLO') || verb.startsWith('HELO')) socket.write('250-dev-smtp\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (verb.startsWith('AUTH')) socket.write('235 accepted\r\n');
        else if (verb.startsWith('MAIL FROM')) { envelope.from = line.slice(10).trim(); socket.write('250 OK\r\n'); }
        else if (verb.startsWith('RCPT TO')) { envelope.to.push(line.slice(8).trim()); socket.write('250 OK\r\n'); }
        else if (verb.startsWith('DATA')) { mode = 'data'; socket.write('354 send it\r\n'); }
        else if (verb.startsWith('RSET')) { envelope = { to: [] }; socket.write('250 OK\r\n'); }
        else if (verb.startsWith('QUIT')) { socket.write('221 bye\r\n'); socket.end(); }
        else socket.write('250 OK\r\n');
      }
    });

    socket.on('error', () => {});
  })
  .listen(PORT, '127.0.0.1', () => console.log(`dev-smtp listening on 127.0.0.1:${PORT}, saving to ${DIR}`));
