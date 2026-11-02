import { hashToken, secureSample, secureShuffle, slugify } from './crypto.util';

describe('crypto utilities', () => {
  it('shuffles every element exactly once without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const output = secureShuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(output).toHaveLength(input.length);
    expect([...output].sort((a, b) => a - b)).toEqual(input);
  });

  it('samples the requested number of unique elements', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const output = secureSample(input, 3);
    expect(output).toHaveLength(3);
    expect(new Set(output).size).toBe(3);
    output.forEach((value) => expect(input).toContain(value));
  });

  it('rejects sampling more items than are available', () => {
    expect(() => secureSample([1, 2], 3)).toThrow(
      'Cannot sample more items than are available',
    );
  });

  it('hashes tokens deterministically without storing the plaintext', () => {
    const token = 'refresh-token-value';
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toHaveLength(64);
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken('other')).not.toBe(hashToken(token));
  });

  it('creates URL-safe slugs', () => {
    expect(slugify('  LearnFlow: Full-Stack 101!  ')).toBe('learnflow-full-stack-101');
    expect(slugify('***')).toBe('');
  });
});
