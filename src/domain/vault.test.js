import { describe, it, expect } from 'vitest';
import {
  GIFT_STATUSES, parsePrice, cycleGiftStatus, summarizeGifts,
  normalizeGift, normalizePerson, normalizePeople,
  addPerson, removePerson, addGiftIdea, updateGiftIdea, removeGiftIdea, cycleGiftIdeaStatus,
} from './vault.js';

/** One person "Mom" with one 'idea' gift. */
const seed = () => {
  const people = addPerson([], 'Mom');
  return addGiftIdea(people, people[0].id, { title: 'Scarf', priceEstimate: 20 });
};

describe('pure helpers', () => {
  it('parsePrice: empty→null, valid, rejects non-numeric & negative', () => {
    expect(parsePrice('')).toEqual({ ok: true, value: null });
    expect(parsePrice('19.99')).toEqual({ ok: true, value: 19.99 });
    expect(parsePrice('abc').ok).toBe(false);
    expect(parsePrice('-5').ok).toBe(false);
  });
  it('cycleGiftStatus loops idea→purchased→given→idea', () => {
    expect(GIFT_STATUSES).toEqual(['idea', 'purchased', 'given']);
    expect(['idea', 'purchased', 'given'].map(cycleGiftStatus)).toEqual(['purchased', 'given', 'idea']);
  });
  it('summarizeGifts counts, zeros on empty/invalid', () => {
    expect(summarizeGifts([{ status: 'idea' }, { status: 'idea' }, { status: 'given' }]))
      .toEqual({ idea: 2, purchased: 0, given: 1 });
    expect(summarizeGifts(null)).toEqual({ idea: 0, purchased: 0, given: 0 });
  });
});

describe('normalization (shared: new data + storage hydration)', () => {
  it('gift needs a title; drops bad price/status; person drops invalid nested gifts', () => {
    expect(normalizeGift({ title: 'X', priceEstimate: -3, status: 'nope' })).toMatchObject({ priceEstimate: null, status: 'idea' });
    expect(normalizeGift({ title: '  ' })).toBeNull();
    expect(normalizePerson({ name: 'Dad', giftIdeas: [{ title: 'Mug' }, { title: '' }, 'junk'] }).giftIdeas).toHaveLength(1);
    expect(normalizePerson({ name: '' })).toBeNull();
  });
  it('normalizePeople: recovery vs clean vs non-array', () => {
    expect(normalizePeople([{ name: 'A' }, { name: '' }]).recovered).toBe(true);
    expect(normalizePeople([{ name: 'A' }]).recovered).toBe(false);
    expect(normalizePeople({ x: 1 })).toEqual({ people: [], recovered: true });
    expect(normalizePeople(null)).toEqual({ people: [], recovered: false });
  });
});

describe('person CRUD + cascade', () => {
  it('adds immutably, ignores blank names, cascade-deletes with nested gifts', () => {
    const before = [];
    expect(addPerson(before, 'Mom')).toHaveLength(1);
    expect(before).toHaveLength(0);
    expect(addPerson([], '   ')).toHaveLength(0);
    let people = seed();
    people = addGiftIdea(people, people[0].id, { title: 'Gloves' });
    expect(people[0].giftIdeas).toHaveLength(2);
    expect(removePerson(people, people[0].id)).toHaveLength(0);
  });
  it('identical names stay distinct entities', () => {
    let people = addPerson(addPerson([], 'Jake'), 'Jake');
    expect(people[0].id).not.toBe(people[1].id);
    people = addGiftIdea(people, people[0].id, { title: 'Only first Jake' });
    expect(people[0].giftIdeas).toHaveLength(1);
    expect(people[1].giftIdeas).toHaveLength(0);
  });
});

describe('nested gift CRUD (immutable)', () => {
  it('adds at status idea without mutating source', () => {
    const people = seed();
    expect(people[0].giftIdeas[0]).toMatchObject({ title: 'Scarf', status: 'idea', priceEstimate: 20 });
    expect(addGiftIdea(people, people[0].id, { title: 'New' })[0].giftIdeas).toHaveLength(2);
    expect(people[0].giftIdeas).toHaveLength(1);
  });
  it('edits all fields, keeps id, keeps original on invalid edit', () => {
    const people = seed();
    const id = people[0].giftIdeas[0].id;
    expect(updateGiftIdea(people, people[0].id, id, { title: 'Silk', priceEstimate: 35, status: 'purchased' })[0].giftIdeas[0])
      .toMatchObject({ id, title: 'Silk', priceEstimate: 35, status: 'purchased' });
    expect(updateGiftIdea(people, people[0].id, id, { title: '  ' })[0].giftIdeas[0].title).toBe('Scarf');
  });
  it('removes one gift and cycles a status', () => {
    const people = seed();
    const id = people[0].giftIdeas[0].id;
    expect(removeGiftIdea(people, people[0].id, id)[0].giftIdeas).toHaveLength(0);
    expect(cycleGiftIdeaStatus(people, people[0].id, id)[0].giftIdeas[0].status).toBe('purchased');
  });
});
