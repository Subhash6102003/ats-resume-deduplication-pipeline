import { describe, it, expect, beforeEach } from 'vitest';
import { CanonicalIdentityStore } from '../src/identity-store.js';

describe('CanonicalIdentityStore (Union-Find)', () => {
  let store: CanonicalIdentityStore;

  beforeEach(() => {
    store = new CanonicalIdentityStore();
  });

  it('a new ID is not a duplicate', () => {
    store.register('app-1', ['anchor-a']);
    expect(store.isDuplicate('app-1')).toBe(false);
  });

  it('two IDs sharing an anchor are merged', () => {
    store.register('app-1', ['anchor-a']);
    store.register('app-2', ['anchor-a']);

    const isD1 = store.isDuplicate('app-1');
    const isD2 = store.isDuplicate('app-2');
    expect(isD1 !== isD2).toBe(true);
  });

  it('transitive merging works (A-B, B-C → A-B-C cluster)', () => {
    store.register('app-1', ['anchor-email']);
    store.register('app-2', ['anchor-email', 'anchor-phone']);
    store.register('app-3', ['anchor-phone']);

    const canonical1 = store.getCanonical('app-1');
    const canonical2 = store.getCanonical('app-2');
    const canonical3 = store.getCanonical('app-3');

    expect(canonical1).toBe(canonical2);
    expect(canonical2).toBe(canonical3);
  });

  it('clear resets all state', () => {
    store.register('app-1', ['anchor-a']);
    store.clear();
    store.register('app-2', ['anchor-a']);
    expect(store.isDuplicate('app-2')).toBe(false);
  });
});
