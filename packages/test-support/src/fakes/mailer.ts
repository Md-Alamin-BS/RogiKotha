// `MailTransport` port fake (the worker's SMTP side, T-101 § 6.2; the old `Mailer` port became
// `queueEmail` plus this transport). Records what was sent and can be scripted to fail.
import {
  portErr,
  portOk,
  type MailTransport,
  type MailTransportErrorCode,
  type OutgoingMail,
  type PortResult,
} from '@rogikotha/application';

export class RecordingMailTransport implements MailTransport {
  readonly sent: OutgoingMail[] = [];
  private readonly scripted: MailTransportErrorCode[] = [];

  /** The next sends fail with these codes, in order. */
  failWith(...codes: MailTransportErrorCode[]): void {
    this.scripted.push(...codes);
  }

  send(mail: OutgoingMail): Promise<PortResult<{ messageId: string }, MailTransportErrorCode>> {
    const failure = this.scripted.shift();
    if (failure !== undefined) return Promise.resolve(portErr(failure));
    this.sent.push({ ...mail });
    return Promise.resolve(portOk({ messageId: `message-${this.sent.length}` }));
  }
}
