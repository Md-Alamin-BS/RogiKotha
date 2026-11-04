// `UnitOfWork` port fake (T-101 BR7.11). It commits or rolls back by the port's own
// `shouldCommit`, and a rollback really undoes the writes of every in-memory fake that took part,
// so a test can assert that a failed command left nothing behind.
import { shouldCommit, type HandlerResult, type Tx, type UnitOfWork } from '@rogikotha/application';

/** An in-memory fake whose state a rollback can restore. */
export interface Transactional {
  snapshot(): unknown;
  restore(state: unknown): void;
}

export type UnitOfWorkOutcome = 'commit' | 'rollback' | 'read';

const FAKE_TX = Object.freeze({ fake: 'tx' }) as unknown as Tx;

export class InMemoryUnitOfWork implements UnitOfWork {
  readonly outcomes: UnitOfWorkOutcome[] = [];
  private readonly participants: Transactional[];
  private failNextCommits = 0;

  constructor(participants: Transactional[] = []) {
    this.participants = [...participants];
  }

  /** Adds a fake whose writes a rollback must undo. */
  enlist(participant: Transactional): void {
    this.participants.push(participant);
  }

  /** The next `count` transactions throw at commit, after their work ran, and are rolled back. */
  failCommits(count = 1): void {
    this.failNextCommits = count;
  }

  async run<T>(work: (tx: Tx) => Promise<HandlerResult<T>>): Promise<HandlerResult<T>> {
    const states = this.participants.map((p) => p.snapshot());
    try {
      const result = await work(FAKE_TX);
      if (shouldCommit(result) && this.failNextCommits > 0) {
        this.failNextCommits -= 1;
        throw new Error('InMemoryUnitOfWork: commit failed (scripted)');
      }
      this.finish(shouldCommit(result) ? 'commit' : 'rollback', states);
      return result;
    } catch (error) {
      this.finish('rollback', states);
      throw error;
    }
  }

  async read<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    this.outcomes.push('read');
    return work(FAKE_TX);
  }

  count(outcome: UnitOfWorkOutcome): number {
    return this.outcomes.filter((o) => o === outcome).length;
  }

  private finish(outcome: 'commit' | 'rollback', states: unknown[]): void {
    if (outcome === 'rollback') {
      this.participants.forEach((p, i) => p.restore(states[i]));
    }
    this.outcomes.push(outcome);
  }
}
