import { createServer, type AddressInfo, type Server, type Socket } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import type { OutgoingMail } from '@rogikotha/application';

import { createSmtpMailTransport, smtpErrorCode, type SmtpSettings } from './mail-smtp';

const MAILPIT_SMTP_PORT = 1025;
const MAILPIT_API = 'http://localhost:8025/api/v1';

function buildMail(overrides: Partial<OutgoingMail> = {}): OutgoingMail {
  return {
    to: 'shirin.synthetic@example.test',
    subject: 'Synthetic subject',
    text: 'Synthetic body with a link https://demo.rogikotha.local/en/verify?token=abc',
    ...overrides,
  };
}

function buildSettings(port: number, overrides: Partial<SmtpSettings> = {}): SmtpSettings {
  return {
    host: '127.0.0.1',
    port,
    from: 'RogiKotha <no-reply@demo.rogikotha.local>',
    timeoutMs: 2000,
    ...overrides,
  };
}

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

/** A local SMTP stand-in that answers each command line with the reply `respond` picks. */
async function startScriptedServer(
  respond: (line: string) => string | null,
  greeting: string | null = '220 synthetic.test ESMTP',
): Promise<number> {
  const sockets: Socket[] = [];
  const server = createServer((socket) => {
    sockets.push(socket);
    if (greeting !== null) socket.write(`${greeting}\r\n`);
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let end = buffer.indexOf('\r\n');
      while (end !== -1) {
        const reply = respond(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        if (reply !== null) socket.write(`${reply}\r\n`);
        end = buffer.indexOf('\r\n');
      }
    });
    socket.on('error', () => undefined);
  });
  server.on('close', () => sockets.forEach((socket) => socket.destroy()));
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return (server.address() as AddressInfo).port;
}

async function unusedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

async function isMailpitRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${MAILPIT_API}/info`, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

const mailpitRunning = await isMailpitRunning();

describe('smtpErrorCode', () => {
  it('maps a timeout to smtp_timeout', () => {
    expect(smtpErrorCode(Object.assign(new Error('t'), { code: 'ETIMEDOUT' }))).toBe(
      'smtp_timeout',
    );
  });

  it('maps a permanent refusal to smtp_rejected', () => {
    expect(smtpErrorCode(Object.assign(new Error('r'), { code: 'EENVELOPE' }))).toBe(
      'smtp_rejected',
    );
    expect(
      smtpErrorCode(Object.assign(new Error('r'), { code: 'EPROTOCOL', responseCode: 554 })),
    ).toBe('smtp_rejected');
  });

  it('maps connection failures and temporary replies to smtp_unavailable', () => {
    expect(smtpErrorCode(Object.assign(new Error('c'), { code: 'ESOCKET' }))).toBe(
      'smtp_unavailable',
    );
    expect(
      smtpErrorCode(Object.assign(new Error('c'), { code: 'EENVELOPE', responseCode: 451 })),
    ).toBe('smtp_unavailable');
    expect(
      smtpErrorCode(Object.assign(new Error('c'), { code: 'EPROTOCOL', responseCode: 421 })),
    ).toBe('smtp_unavailable');
  });

  it('returns null for an error that is not a mail failure', () => {
    expect(smtpErrorCode(new TypeError('a bug'))).toBeNull();
    expect(smtpErrorCode('a string')).toBeNull();
  });
});

describe('createSmtpMailTransport', () => {
  it('reports smtp_unavailable when nothing listens on the port', async () => {
    const transport = createSmtpMailTransport(buildSettings(await unusedPort()));

    await expect(transport.send(buildMail())).resolves.toEqual({
      ok: false,
      error: { code: 'smtp_unavailable' },
    });
  });

  it('reports smtp_timeout when the server never greets', async () => {
    const port = await startScriptedServer(() => null, null);
    const transport = createSmtpMailTransport(buildSettings(port, { timeoutMs: 300 }));

    await expect(transport.send(buildMail())).resolves.toEqual({
      ok: false,
      error: { code: 'smtp_timeout' },
    });
  });

  it('reports smtp_rejected when the server refuses the recipient', async () => {
    const port = await startScriptedServer((line) => {
      if (/^(EHLO|HELO)/i.test(line)) return '250 synthetic.test';
      if (/^MAIL FROM/i.test(line)) return '250 OK';
      if (/^RCPT TO/i.test(line)) return '550 5.1.1 No such synthetic user';
      if (/^QUIT/i.test(line)) return '221 Bye';
      return '250 OK';
    });
    const transport = createSmtpMailTransport(buildSettings(port));

    await expect(transport.send(buildMail())).resolves.toEqual({
      ok: false,
      error: { code: 'smtp_rejected' },
    });
  });

  it.skipIf(!mailpitRunning)('delivers a plain-text mail through Mailpit', async () => {
    const subject = `Synthetic delivery ${Date.now()}`;
    const transport = createSmtpMailTransport(
      buildSettings(MAILPIT_SMTP_PORT, { host: 'localhost' }),
    );

    const result = await transport.send(buildMail({ subject }));

    expect(result.ok && result.data.messageId).toMatch(/^<.+@.+>$/);
    const search = (await (
      await fetch(`${MAILPIT_API}/search?query=${encodeURIComponent(`subject:"${subject}"`)}`)
    ).json()) as {
      messages: { ID: string; From: { Address: string }; To: { Address: string }[] }[];
    };
    expect(search.messages).toHaveLength(1);
    const [message] = search.messages;
    expect(message?.From.Address).toBe('no-reply@demo.rogikotha.local');
    expect(message?.To.map((to) => to.Address)).toEqual(['shirin.synthetic@example.test']);
    const detail = (await (await fetch(`${MAILPIT_API}/message/${message?.ID}`)).json()) as {
      Text: string;
      HTML: string;
    };
    expect(detail.Text).toContain('https://demo.rogikotha.local/en/verify?token=abc');
    expect(detail.HTML).toBe('');
  });
});
