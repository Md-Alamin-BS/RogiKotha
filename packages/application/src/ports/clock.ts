export interface Clock {
  now(): Date;
}

/** `newId` is a UUIDv7, `newPublicId` 10 lowercase base32 characters (`contracts/ids`). */
export interface IdGenerator {
  newId(): string;
  newPublicId(): string;
}

/** Lets the register, resend and reset timing floors (§ 10.3) wait without a real timer in tests. */
export interface Sleeper {
  sleep(ms: number): Promise<void>;
}
