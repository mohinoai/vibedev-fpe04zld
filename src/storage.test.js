import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadPeople, savePeople, STORAGE_KEY } from './storage.js';

describe('storage', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  afterEach(() => vi.restoreAllMocks());

  it('empty when nothing stored; round-trips saved people', () => {
    expect(loadPeople()).toEqual({ people: [], status: 'empty' });
    const people = [{ id: 'p1', name: 'Mom', giftIdeas: [{ id: 'g1', title: 'Scarf', priceEstimate: 20, urlOrStore: '', status: 'idea' }] }];
    expect(savePeople(people)).toEqual({ ok: true });
    const result = loadPeople();
    expect(result.status).toBe('ok');
    expect(result.people[0].giftIdeas[0].title).toBe('Scarf');
  });

  it('flags corrupt (bad JSON + wrong shape), starting empty', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(loadPeople()).toEqual({ people: [], status: 'corrupt' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hello: 'world' }));
    expect(loadPeople().status).toBe('corrupt');
  });

  it('reports recovered when some entries are invalid', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ name: 'Valid' }, { name: '' }]));
    expect(loadPeople().status).toBe('recovered');
  });

  it('blocked when reading or writing throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(loadPeople()).toEqual({ people: [], status: 'blocked' });
    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(savePeople([])).toEqual({ ok: false, error: 'blocked' });
  });
});
