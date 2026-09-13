// `IdGenerator` port fake (03-routes-and-contracts.md §3: `newId()`,
// `newPublicId()`). Deterministic sequence, never `Math.random` — matches
// the real ids' shape (`newId` = uuid-looking, `newPublicId` = 10-char
// lowercase base32) closely enough for tests that only assert on
// uniqueness and format, not on the real generator's exact algorithm.
const PUBLIC_ID_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

export class SequentialIds {
  private idCounter = 0;
  private publicIdCounter = 0;

  newId(): string {
    this.idCounter += 1;
    const hex = this.idCounter.toString(16).padStart(12, '0');
    return `00000000-0000-7000-8000-${hex}`;
  }

  newPublicId(): string {
    this.publicIdCounter += 1;
    let n = this.publicIdCounter;
    let out = '';
    for (let i = 0; i < 10; i += 1) {
      out = PUBLIC_ID_ALPHABET[n % PUBLIC_ID_ALPHABET.length]! + out;
      n = Math.floor(n / PUBLIC_ID_ALPHABET.length);
    }
    return out;
  }
}
