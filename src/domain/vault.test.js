import { describe, it, expect } from 'vitest';
import {
  GIFT_STATUSES,
  createId,
  sanitizeText,
  parsePrice,
  cycleGiftStatus,
  summarizeGifts,
  normalizeGift,
  normalizePerson,
  normalizePeople,
  addPerson,
  removePerson,
  addGiftIdea,
  updateGiftIdea,
  removeGiftIdea,
  cycleGiftIdeaStatus,
} from './vault.js';

/** Build a small vault: one person "Mom" with one 'idea' gift. */
function seed() {
  let people = addPerson([], 'Mom');
  people = addGiftIdea(people, people[0].id, { title: 'Scarf', priceEstimate: 20 });
  return people;
}

describe('createId', () => {
  it('returns unique, non-empty ids', () => {
    const a = createId();
    const b = createId();
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe('sanitizeText', () => {
  it('collapses whitespace and trims', () => {
    expect(sanitizeText('  hello   world  ')).toBe('hello world');
  });
  it('coerces non-strings to empty', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(42)).toBe('');
  });
  it('caps length at 200 chars', () => {
    expect(sanitizeText('x'.repeat(500))).toHaveLength(200);
  });
});

describe('parsePrice', () => {
  it('treats empty/nullish as null (optional)', () => {
    expect(parsePrice('')).toEqual({ ok: true, value: null });
    expect(parsePrice(null)).toEqual({ ok: true, value: null });
  });
  it('accepts non-negative numbers', () => {
    expect(parsePrice('19.99')).toEqual({ ok: true, value: 19.99 });
    expect(parsePrice('0')).toEqual({ ok: true, value: 0 });
  });
  it('rejects non-numeric input', () => {
    expect(parsePrice('abc').ok).toBe(false);
  });
  it('rejects negatives', () => {
    expect(parsePrice('-5').ok).toBe(false);
  });
});

describe('cycleGiftStatus', () => {
  it('cycles idea -> purchased -> given -> idea', () => {
    expect(cycleGiftStatus('idea')).toBe('purchased');
    expect(cycleGiftStatus('purchased')).toBe('given');
    expect(cycleGiftStatus('given')).toBe('idea');
  });
  it('covers all statuses', () => {
    expect(GIFT_STATUSES).toEqual(['idea', 'purchased', 'given']);
  });
});

describe('summarizeGifts', () => {
  it('counts per status', () => {
    const gifts = [
      { status: 'idea' },
      { status: 'idea' },
      { status: 'purchased' },
      { status: 'given' },
    ];
    expect(summarizeGifts(gifts)).toEqual({ idea: 2, purchased: 1, given: 1 });
  });
  it('returns zeros for empty or invalid input', () => {
    expect(summarizeGifts([])).toEqual({ idea: 0, purchased: 0, given: 0 });
    expect(summarizeGifts(null)).toEqual({ idea: 0, purchased: 0, given: 0 });
    expect(summarizeGifts([{ status: 'bogus' }, null])).toEqual({
      idea: 0,
      purchased: 0,
      given: 0,
    });
  });
});

describe('normalizeGift', () => {
  it('builds a valid gift with defaults', () => {
    const gift = normalizeGift({ title: '  Book ' });
    expect(gift).toMatchObject({ title: 'Book', priceEstimate: null, urlOrStore: '', status: 'idea' });
    expect(gift.id).toBeTruthy();
  });
  it('rejects gifts without a title', () => {
    expect(normalizeGift({ title: '   ' })).toBeNull();
    expect(normalizeGift(null)).toBeNull();
  });
  it('drops invalid price and unknown status', () => {
    const gift = normalizeGift({ title: 'X', priceEstimate: -3, status: 'nope' });
    expect(gift.priceEstimate).toBeNull();
    expect(gift.status).toBe('idea');
  });
});

describe('normalizePerson / normalizePeople', () => {
  it('normalizes nested gifts and drops invalid ones', () => {
    const person = normalizePerson({
      name: 'Dad',
      giftIdeas: [{ title: 'Mug' }, { title: '' }, 'garbage'],
    });
    expect(person.name).toBe('Dad');
    expect(person.giftIdeas).toHaveLength(1);
  });
  it('rejects a person without a name', () => {
    expect(normalizePerson({ name: '' })).toBeNull();
  });
  it('reports partial recovery when entries are dropped', () => {
    const result = normalizePeople([{ name: 'A' }, { name: '' }]);
    expect(result.people).toHaveLength(1);
    expect(result.recovered).toBe(true);
  });
  it('is clean when everything is valid', () => {
    const result = normalizePeople([{ name: 'A' }]);
    expect(result.recovered).toBe(false);
  });
  it('handles non-array input', () => {
    expect(normalizePeople({ not: 'array' })).toEqual({ people: [], recovered: true });
    expect(normalizePeople(null)).toEqual({ people: [], recovered: false });
  });
});

describe('addPerson / removePerson (cascade)', () => {
  it('adds a person immutably', () => {
    const before = [];
    const after = addPerson(before, 'Mom');
    expect(after).toHaveLength(1);
    expect(before).toHaveLength(0);
  });
  it('ignores blank names', () => {
    expect(addPerson([], '   ')).toHaveLength(0);
  });
  it('cascade-deletes the person and all nested gifts', () => {
    let people = seed();
    people = addGiftIdea(people, people[0].id, { title: 'Gloves' });
    expect(people[0].giftIdeas).toHaveLength(2);
    const removed = removePerson(people, people[0].id);
    expect(removed).toHaveLength(0);
  });
  it('two people with identical names stay distinct entities', () => {
    let people = addPerson([], 'Jake');
    people = addPerson(people, 'Jake');
    expect(people[0].id).not.toBe(people[1].id);
    people = addGiftIdea(people, people[0].id, { title: 'Only for first Jake' });
    expect(people[0].giftIdeas).toHaveLength(1);
    expect(people[1].giftIdeas).toHaveLength(0);
  });
});

describe('gift CRUD (nested, immutable)', () => {
  it('adds a gift with default idea status', () => {
    const people = seed();
    expect(people[0].giftIdeas[0]).toMatchObject({ title: 'Scarf', status: 'idea', priceEstimate: 20 });
  });
  it('does not mutate the source array', () => {
    const people = seed();
    const next = addGiftIdea(people, people[0].id, { title: 'New' });
    expect(people[0].giftIdeas).toHaveLength(1);
    expect(next[0].giftIdeas).toHaveLength(2);
  });
  it('edits all fields and keeps the same id', () => {
    const people = seed();
    const giftId = people[0].giftIdeas[0].id;
    const next = updateGiftIdea(people, people[0].id, giftId, {
      title: 'Silk Scarf',
      priceEstimate: 35,
      status: 'purchased',
    });
    const gift = next[0].giftIdeas[0];
    expect(gift.id).toBe(giftId);
    expect(gift).toMatchObject({ title: 'Silk Scarf', priceEstimate: 35, status: 'purchased' });
  });
  it('keeps the original gift when an edit is invalid (blank title)', () => {
    const people = seed();
    const giftId = people[0].giftIdeas[0].id;
    const next = updateGiftIdea(people, people[0].id, giftId, { title: '  ' });
    expect(next[0].giftIdeas[0].title).toBe('Scarf');
  });
  it('removes a single gift without touching others', () => {
    let people = seed();
    people = addGiftIdea(people, people[0].id, { title: 'Keep me' });
    const firstId = people[0].giftIdeas[0].id;
    const next = removeGiftIdea(people, people[0].id, firstId);
    expect(next[0].giftIdeas).toHaveLength(1);
    expect(next[0].giftIdeas[0].title).toBe('Keep me');
  });
  it('cycles a single gift status', () => {
    const people = seed();
    const giftId = people[0].giftIdeas[0].id;
    const next = cycleGiftIdeaStatus(people, people[0].id, giftId);
    expect(next[0].giftIdeas[0].status).toBe('purchased');
  });
});
