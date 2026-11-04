// The holder's own address, masked (FD-096, T-101 BR4.10): the first grapheme of the local part,
// `****`, `@` and the domain. The mask never reflects the local part's length.

export const EMAIL_MASK = '****';

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function firstGrapheme(text: string): string {
  for (const { segment } of segmenter.segment(text)) return segment;
  return '';
}

/**
 * Masks a stored, already validated address. Throws for a value without a local part or a
 * domain: that is a programmer error, never user input.
 */
export function maskEmail(address: string): string {
  const at = address.lastIndexOf('@');
  const local = at > 0 ? address.slice(0, at) : '';
  const domain = at > 0 ? address.slice(at + 1) : '';
  if (local === '' || domain === '') {
    throw new Error('maskEmail: the value is not an email address');
  }
  return `${firstGrapheme(local.normalize('NFC'))}${EMAIL_MASK}@${domain}`;
}
