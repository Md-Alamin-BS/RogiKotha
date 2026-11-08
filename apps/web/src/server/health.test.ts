// @vitest-environment node
import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  healthReport,
  probeDatabase,
  probeMail,
  probeQueue,
  probeScanner,
  type ProbeSocket,
  type ProbeState,
  type SocketFactory,
} from './health';

vi.mock('./db', () => ({ getDb: vi.fn() }));

afterEach(() => {
  vi.useRealTimers();
});

interface FakeBehaviour {
  /** What the server sends on its own once connected. */
  greeting?: string;
  /** What the server answers after the probe writes. */
  reply?: string;
  /** Emit an error instead of connecting. */
  refuse?: boolean;
  /** Close right after connecting. */
  hangUp?: boolean;
}

class FakeSocket extends EventEmitter implements ProbeSocket {
  readonly written: string[] = [];
  destroyed = false;

  constructor(private readonly behaviour: FakeBehaviour) {
    super();
    queueMicrotask(() => {
      if (behaviour.refuse) {
        this.emit('error', new Error('ECONNREFUSED 10.0.0.1:1025 secret-detail'));
        return;
      }
      this.emit('connect');
      if (behaviour.hangUp) this.emit('close');
      if (behaviour.greeting !== undefined) this.emit('data', Buffer.from(behaviour.greeting));
    });
  }

  write(data: string): boolean {
    this.written.push(data);
    if (this.behaviour.reply !== undefined) {
      const reply = this.behaviour.reply;
      queueMicrotask(() => this.emit('data', Buffer.from(reply)));
    }
    return true;
  }

  destroy(): this {
    this.destroyed = true;
    return this;
  }
}

function factory(behaviour: FakeBehaviour): { connect: SocketFactory; sockets: FakeSocket[] } {
  const sockets: FakeSocket[] = [];
  const connect: SocketFactory = () => {
    const socket = new FakeSocket(behaviour);
    sockets.push(socket);
    return socket;
  };
  return { connect, sockets };
}

describe('the database probe', () => {
  it('reports the database ok when select 1 answers', async () => {
    await expect(probeDatabase(() => Promise.resolve({ rows: [{}] }))).resolves.toBe('ok');
  });

  it('reports the database down when the query fails', async () => {
    await expect(probeDatabase(() => Promise.reject(new Error('refused')))).resolves.toBe('down');
  });

  it('reports the database down when it does not answer within two seconds', async () => {
    vi.useFakeTimers();
    const probe = probeDatabase(() => new Promise(() => undefined));
    await vi.advanceTimersByTimeAsync(2000);
    await expect(probe).resolves.toBe('down');
  });
});

describe('the queue probe', () => {
  it('reports the queue ok when the pg-boss version row answers', async () => {
    await expect(probeQueue(() => Promise.resolve({ rows: [{}] }))).resolves.toBe('ok');
  });

  it('reports the queue down when the query fails', async () => {
    await expect(probeQueue(() => Promise.reject(new Error('no schema')))).resolves.toBe('down');
  });

  it('reports the queue down when it does not answer within two seconds', async () => {
    vi.useFakeTimers();
    const probe = probeQueue(() => new Promise(() => undefined));
    await vi.advanceTimersByTimeAsync(2000);
    await expect(probe).resolves.toBe('down');
  });
});

describe('the mail probe', () => {
  it('reports mail ok on a 220 greeting and then says QUIT', async () => {
    const { connect, sockets } = factory({ greeting: '220 mailpit ESMTP Service ready\r\n' });

    await expect(probeMail('localhost', 1025, connect)).resolves.toBe('ok');
    expect(sockets[0]?.written).toEqual(['QUIT\r\n']);
    expect(sockets[0]?.destroyed).toBe(true);
  });

  it('reads a greeting that arrives in two pieces', async () => {
    const socket = new FakeSocket({});
    const probe = probeMail('localhost', 1025, () => socket);
    await Promise.resolve();
    socket.emit('data', Buffer.from('22'));
    socket.emit('data', Buffer.from('0 ready\r\n'));

    await expect(probe).resolves.toBe('ok');
  });

  it('reports mail down on a wrong greeting', async () => {
    const { connect } = factory({ greeting: '554 no service\r\n' });

    await expect(probeMail('localhost', 1025, connect)).resolves.toBe('down');
  });

  it('reports mail down when the connection is refused', async () => {
    const { connect } = factory({ refuse: true });

    await expect(probeMail('localhost', 1025, connect)).resolves.toBe('down');
  });

  it('reports mail down when the server hangs up without a greeting', async () => {
    const { connect } = factory({ hangUp: true });

    await expect(probeMail('localhost', 1025, connect)).resolves.toBe('down');
  });

  it('reports mail down when the factory throws', async () => {
    const connect: SocketFactory = () => {
      throw new Error('no socket');
    };

    await expect(probeMail('localhost', 1025, connect)).resolves.toBe('down');
  });

  it('reports mail down when the server stays silent for two seconds', async () => {
    vi.useFakeTimers();
    const { connect, sockets } = factory({});
    const probe = probeMail('localhost', 1025, connect);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(probe).resolves.toBe('down');
    expect(sockets[0]?.destroyed).toBe(true);
  });
});

describe('the scanner probe', () => {
  it('reports the scanner ok when zPING is answered with PONG', async () => {
    const { connect, sockets } = factory({ reply: 'PONG\0' });

    await expect(probeScanner('localhost', 3310, connect)).resolves.toBe('ok');
    expect(sockets[0]?.written).toEqual(['zPING\0']);
    expect(sockets[0]?.destroyed).toBe(true);
  });

  it('reports the scanner down on a wrong answer', async () => {
    const { connect } = factory({ reply: 'ERROR\0' });

    await expect(probeScanner('localhost', 3310, connect)).resolves.toBe('down');
  });

  it('reports the scanner down when the connection is refused', async () => {
    const { connect } = factory({ refuse: true });

    await expect(probeScanner('localhost', 3310, connect)).resolves.toBe('down');
  });

  it('reports the scanner down when the socket closes without an answer', async () => {
    const { connect } = factory({ hangUp: true });

    await expect(probeScanner('localhost', 3310, connect)).resolves.toBe('down');
  });

  it('reports the scanner down when it does not answer within two seconds', async () => {
    vi.useFakeTimers();
    const { connect } = factory({});
    const probe = probeScanner('localhost', 3310, connect);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(probe).resolves.toBe('down');
  });

  it('connects to the host and port it is given', async () => {
    const seen: Array<[number, string]> = [];
    const connect: SocketFactory = (port, host) => {
      seen.push([port, host]);
      return new FakeSocket({ reply: 'PONG\0' });
    };

    await probeScanner('clamd.internal', 4000, connect);

    expect(seen).toEqual([[4000, 'clamd.internal']]);
  });
});

const STATES: ProbeState[] = ['ok', 'down'];

describe('the health report (BR9.2)', () => {
  const combinations = STATES.flatMap((db) =>
    STATES.flatMap((queue) =>
      STATES.flatMap((mail) => STATES.map((scanner) => ({ db, queue, mail, scanner }))),
    ),
  );

  it.each(combinations)(
    'is ok only when the database, the queue and mail are ok (db $db, queue $queue, mail $mail, scanner $scanner)',
    async ({ db, queue, mail, scanner }) => {
      const report = await healthReport({
        db: () => Promise.resolve(db),
        queue: () => Promise.resolve(queue),
        mail: () => Promise.resolve(mail),
        scanner: () => Promise.resolve(scanner),
      });

      expect(report.ok).toBe(db === 'ok' && queue === 'ok' && mail === 'ok');
      expect(report).toMatchObject({ db, queue, mail, scanner });
    },
  );

  it('carries no error text, only the five fields and the mode', async () => {
    const { connect } = factory({ refuse: true });
    const report = await healthReport({
      db: () => probeDatabase(() => Promise.reject(new Error('password authentication failed'))),
      queue: () => probeQueue(() => Promise.reject(new Error('relation pgboss.version missing'))),
      mail: () => probeMail('10.0.0.1', 1025, connect),
      scanner: () => probeScanner('10.0.0.1', 3310, connect),
    });
    const body = JSON.stringify(report);

    expect(Object.keys(report).sort()).toEqual(['db', 'mail', 'mode', 'ok', 'queue', 'scanner']);
    expect(body).not.toMatch(/password|pgboss|ECONNREFUSED|secret-detail|10\.0\.0\.1/);
  });

  it('runs the probes in parallel', async () => {
    vi.useFakeTimers();
    const slow = () => new Promise<ProbeState>((resolve) => setTimeout(() => resolve('ok'), 1500));
    const report = healthReport({ db: slow, queue: slow, mail: slow, scanner: slow });
    await vi.advanceTimersByTimeAsync(1500);

    await expect(report).resolves.toMatchObject({ ok: true });
  });
});
