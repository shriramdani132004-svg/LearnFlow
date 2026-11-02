import { createHash, randomInt } from 'node:crypto';

export function secureShuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function secureSample<T>(items: readonly T[], count: number): T[] {
  if (count > items.length) {
    throw new Error('Cannot sample more items than are available');
  }
  return secureShuffle(items).slice(0, count);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

export function uniqueSlug(base: string): string {
  const safeBase = base.length > 0 ? base : 'course';
  return `${safeBase}-${Math.random().toString(36).slice(2, 8)}`;
}
