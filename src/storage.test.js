import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadPeople, savePeople, STORAGE_KEY } from './storage.js';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports empty when nothing is stored', () => {
    expect(loadPeople()).toEqual({ people: [], status: 'empty' });
  });

  it('round-trips saved people', () => {
    const people = [{ id: 'p1', name: 'Mom', giftIdeas: [{ id: 'g1', title: 'Scarf', priceEstimate: 20, urlOrStore: '', status: 'idea' }] }];
    expect(savePeople(people)).toEqual({ ok: true });
    const result = loadPeople();
    expect(result.status).toBe('ok');
    expect(result.people).toHaveLength(1);
    expect(result.people[0].giftIdeas[0].title).toBe('Scarf');
  });

  it('flags corrupt JSON and starts empty', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const result = loadPeople();
    expect(result.status).toBe('corrupt');
    expect(result.people).toEqual([]);
  });

  it('flags corrupt when JSON parses but is the wrong shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hello: 'world' }));
    expect(loadPeople().status).toBe('corrupt');
  });

  it('recovers valid entries and reports recovered', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ name: 'Valid' }, { name: '' }, 'junk']),
    );
    const result = loadPeople();
    expect(result.status).toBe('recovered');
    expect(result.people).toHaveLength(1);
    expect(result.people[0].name).toBe('Valid');
  });

  it('returns blocked when reading throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied');
    });
    expect(loadPeople()).toEqual({ people: [], status: 'blocked' });
  });

  it('returns blocked when writing throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(savePeople([])).toEqual({ ok: false, error: 'blocked' });
  });
});
