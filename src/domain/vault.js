/**
 * @file Pure domain logic — no DOM, no storage, no side effects. Every mutation
 * helper takes the current `Person[]` and returns a new graph (never mutates).
 * The same normalization validates new data and data hydrated from storage.
 * Function argument/return shapes are the typedefs below.
 */

/** @typedef {'idea' | 'purchased' | 'given'} GiftStatus */

/**
 * @typedef {Object} GiftIdea
 * @property {string} id
 * @property {string} title                 Required, sanitized, non-empty.
 * @property {number | null} priceEstimate  Optional, non-negative.
 * @property {string} urlOrStore            Optional link/store ('' when unset).
 * @property {GiftStatus} status            Defaults to 'idea'.
 */

/**
 * @typedef {Object} Person
 * @property {string} id
 * @property {string} name          Required, sanitized, non-empty.
 * @property {GiftIdea[]} giftIdeas Nested gifts (may be empty).
 */

/** @typedef {{ idea: number, purchased: number, given: number }} StatusSummary */

/** Ordered statuses; also the cycle order (idea→purchased→given→idea). @type {readonly GiftStatus[]} */
export const GIFT_STATUSES = ['idea', 'purchased', 'given'];

/** Zero-valued summary, base for every count. @type {StatusSummary} */
export const EMPTY_SUMMARY = { idea: 0, purchased: 0, given: 0 };

/** Max characters kept for any text field — guards layout and storage size. */
export const MAX_TEXT_LENGTH = 200;

/** Unique id (prefers `crypto.randomUUID`, else time + random). */
export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Coerce to string, collapse whitespace, trim, cap length. */
export function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_LENGTH);
}

/** Parse a price: empty/nullish→null (optional); rejects non-numeric/negative. Returns `{ok,value}` or `{ok:false,error}`. */
export function parsePrice(value) {
  if (value === null || value === undefined) return { ok: true, value: null };
  const raw = String(value).trim();
  if (raw === '') return { ok: true, value: null };
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false, error: 'Price must be a number.' };
  if (n < 0) return { ok: false, error: 'Price cannot be negative.' };
  return { ok: true, value: n };
}

/** Next status; looping keeps a mis-tap reversible with one control. */
export function cycleGiftStatus(status) {
  return GIFT_STATUSES[(GIFT_STATUSES.indexOf(status) + 1) % GIFT_STATUSES.length];
}

/** Count gifts per status; defensive against non-arrays/malformed. Returns a {@link StatusSummary}. */
export function summarizeGifts(giftIdeas) {
  const summary = { ...EMPTY_SUMMARY };
  if (!Array.isArray(giftIdeas)) return summary;
  for (const gift of giftIdeas) {
    if (gift && Object.prototype.hasOwnProperty.call(summary, gift.status)) summary[gift.status] += 1;
  }
  return summary;
}

/** Build a valid {@link GiftIdea}, or null when missing a title. Shared by creation + storage hydration. */
export function normalizeGift(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = sanitizeText(raw.title);
  if (!title) return null;
  const price = parsePrice(raw.priceEstimate);
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : createId(),
    title,
    priceEstimate: price.ok ? price.value : null,
    urlOrStore: sanitizeText(raw.urlOrStore),
    status: GIFT_STATUSES.includes(raw.status) ? raw.status : 'idea',
  };
}

/** Build a valid {@link Person} (nested gifts normalized), or null when missing a name. */
export function normalizePerson(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = sanitizeText(raw.name);
  if (!name) return null;
  const giftIdeas = Array.isArray(raw.giftIdeas) ? raw.giftIdeas.map(normalizeGift).filter(Boolean) : [];
  return { id: typeof raw.id === 'string' && raw.id ? raw.id : createId(), name, giftIdeas };
}

/** Normalize a people array; `recovered` flags a partial recovery. Returns `{ people, recovered }`. */
export function normalizePeople(raw) {
  if (!Array.isArray(raw)) return { people: [], recovered: raw != null };
  const people = [];
  let dropped = 0;
  for (const item of raw) {
    const person = normalizePerson(item);
    if (person) people.push(person);
    else dropped += 1;
  }
  return { people, recovered: dropped > 0 };
}

/* Mutation helpers below are immutable: each takes and returns `Person[]` (same ref on no-op). */

/** Append a new person; no-op when the name is blank. */
export function addPerson(people, name) {
  const person = normalizePerson({ name, giftIdeas: [] });
  return person ? [...people, person] : people;
}

/** Remove a person and cascade-delete all their gifts. */
export function removePerson(people, personId) {
  return people.filter((person) => person.id !== personId);
}

/** Add a gift under a person (always starts at 'idea'); no-op without a valid title. */
export function addGiftIdea(people, personId, payload) {
  const gift = normalizeGift({ ...payload, id: undefined, status: 'idea' });
  if (!gift) return people;
  return people.map((person) =>
    person.id === personId ? { ...person, giftIdeas: [...person.giftIdeas, gift] } : person,
  );
}

/** Edit a gift: patch merged + re-validated, id kept; an invalid merge leaves it unchanged. */
export function updateGiftIdea(people, personId, giftId, patch) {
  return people.map((person) => {
    if (person.id !== personId) return person;
    return {
      ...person,
      giftIdeas: person.giftIdeas.map((gift) =>
        gift.id === giftId ? normalizeGift({ ...gift, ...patch, id: gift.id }) || gift : gift,
      ),
    };
  });
}

/** Remove a single gift from a person. */
export function removeGiftIdea(people, personId, giftId) {
  return people.map((person) =>
    person.id === personId
      ? { ...person, giftIdeas: person.giftIdeas.filter((gift) => gift.id !== giftId) }
      : person,
  );
}

/** Advance a single gift's status to the next in the cycle. */
export function cycleGiftIdeaStatus(people, personId, giftId) {
  return people.map((person) => {
    if (person.id !== personId) return person;
    return {
      ...person,
      giftIdeas: person.giftIdeas.map((gift) =>
        gift.id === giftId ? { ...gift, status: cycleGiftStatus(gift.status) } : gift,
      ),
    };
  });
}
