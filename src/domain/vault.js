/**
 * @file Pure domain logic for the Gift Idea Vault.
 *
 * Zero DOM, zero storage, zero side effects. Every mutation helper receives the
 * current `Person[]` and returns a brand-new array/object graph — callers never
 * mutate in place. The same normalization pipeline validates both freshly
 * created data and data hydrated from storage, so hand-edited localStorage
 * cannot smuggle invalid shapes past the app's constraints.
 */

/**
 * @typedef {'idea' | 'purchased' | 'given'} GiftStatus
 */

/**
 * @typedef {Object} GiftIdea
 * @property {string} id                    Stable unique id.
 * @property {string} title                 Required, sanitized, non-empty.
 * @property {number | null} priceEstimate  Optional non-negative number.
 * @property {string} urlOrStore            Optional link or store name ('' when unset).
 * @property {GiftStatus} status            Defaults to 'idea'.
 */

/**
 * @typedef {Object} Person
 * @property {string} id            Stable unique id.
 * @property {string} name          Required, sanitized, non-empty.
 * @property {GiftIdea[]} giftIdeas Nested gift ideas (may be empty).
 */

/**
 * @typedef {Object} StatusSummary
 * @property {number} idea
 * @property {number} purchased
 * @property {number} given
 */

/**
 * Ordered gift statuses. This array doubles as the cycle order used by
 * {@link cycleGiftStatus}: idea → purchased → given → idea.
 * @type {readonly GiftStatus[]}
 */
export const GIFT_STATUSES = ['idea', 'purchased', 'given'];

/** Zero-valued summary, reused as the base for every count. @type {StatusSummary} */
export const EMPTY_SUMMARY = { idea: 0, purchased: 0, given: 0 };

/** Max characters kept for any text field — guards layout and storage size. */
export const MAX_TEXT_LENGTH = 200;

/**
 * Generate a unique id. Prefers `crypto.randomUUID`, falls back to a
 * time + random string when unavailable.
 * @returns {string}
 */
export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Normalize free text: coerce non-strings to '', collapse whitespace, trim, and
 * cap length. React escapes HTML at render time, so this is about hygiene and
 * layout safety (very long / whitespace-only input) rather than tag stripping.
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_LENGTH);
}

/**
 * @typedef {{ ok: true, value: number | null } | { ok: false, error: string }} PriceResult
 */

/**
 * Parse and validate a price estimate. Empty/blank/nullish → `null` (the field
 * is optional). Non-numeric or negative input is rejected.
 * @param {unknown} value
 * @returns {PriceResult}
 */
export function parsePrice(value) {
  if (value === null || value === undefined) return { ok: true, value: null };
  const raw = String(value).trim();
  if (raw === '') return { ok: true, value: null };
  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false, error: 'Price must be a number.' };
  if (n < 0) return { ok: false, error: 'Price cannot be negative.' };
  return { ok: true, value: n };
}

/**
 * Return the next status in the cycle idea → purchased → given → idea.
 *
 * Looping (rather than stopping at "given") is a deliberate choice: a single
 * control advances status, and looping keeps a mis-tap recoverable without a
 * separate "undo" affordance.
 * @param {GiftStatus} status
 * @returns {GiftStatus}
 */
export function cycleGiftStatus(status) {
  const index = GIFT_STATUSES.indexOf(status);
  return GIFT_STATUSES[(index + 1) % GIFT_STATUSES.length];
}

/**
 * Count gifts per status. Defensive against non-arrays and malformed entries.
 * @param {GiftIdea[]} giftIdeas
 * @returns {StatusSummary}
 */
export function summarizeGifts(giftIdeas) {
  const summary = { ...EMPTY_SUMMARY };
  if (!Array.isArray(giftIdeas)) return summary;
  for (const gift of giftIdeas) {
    if (gift && Object.prototype.hasOwnProperty.call(summary, gift.status)) {
      summary[gift.status] += 1;
    }
  }
  return summary;
}

/**
 * Build a valid {@link GiftIdea} from raw input, or `null` when unusable
 * (missing title). Shared by gift creation and storage hydration.
 * @param {any} raw
 * @returns {GiftIdea | null}
 */
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

/**
 * Build a valid {@link Person} from raw input, or `null` when unusable
 * (missing name). Nested gifts are individually normalized; invalid ones drop.
 * @param {any} raw
 * @returns {Person | null}
 */
export function normalizePerson(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = sanitizeText(raw.name);
  if (!name) return null;
  const giftIdeas = Array.isArray(raw.giftIdeas)
    ? raw.giftIdeas.map(normalizeGift).filter(Boolean)
    : [];
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : createId(),
    name,
    giftIdeas,
  };
}

/**
 * Normalize a whole people array (e.g. from storage). Keeps every valid person
 * and reports whether anything invalid had to be dropped, so callers can tell
 * a clean load from a partially-recovered one.
 * @param {any} raw
 * @returns {{ people: Person[], recovered: boolean }}
 */
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

/* Immutable mutation helpers — each returns a new Person[] (same ref on no-op),
   never mutating the input. */

/**
 * Append a new person. No-op (returns input) when the name is blank.
 * @param {Person[]} people
 * @param {string} name
 * @returns {Person[]}
 */
export function addPerson(people, name) {
  const person = normalizePerson({ name, giftIdeas: [] });
  return person ? [...people, person] : people;
}

/**
 * Remove a person and cascade-delete all of their gift ideas.
 * @param {Person[]} people
 * @param {string} personId
 * @returns {Person[]}
 */
export function removePerson(people, personId) {
  return people.filter((person) => person.id !== personId);
}

/**
 * Add a gift idea under a person. New gifts always start at status 'idea'.
 * No-op when the payload has no valid title.
 * @param {Person[]} people
 * @param {string} personId
 * @param {Partial<GiftIdea>} payload
 * @returns {Person[]}
 */
export function addGiftIdea(people, personId, payload) {
  const gift = normalizeGift({ ...payload, id: undefined, status: 'idea' });
  if (!gift) return people;
  return people.map((person) =>
    person.id === personId
      ? { ...person, giftIdeas: [...person.giftIdeas, gift] }
      : person,
  );
}

/**
 * Edit an existing gift idea. The patch is merged over the current gift and the
 * result re-validated through {@link normalizeGift}; the original id is kept,
 * and an invalid merge (e.g. blank title) leaves the gift unchanged.
 * @param {Person[]} people
 * @param {string} personId
 * @param {string} giftId
 * @param {Partial<GiftIdea>} patch
 * @returns {Person[]}
 */
export function updateGiftIdea(people, personId, giftId, patch) {
  return people.map((person) => {
    if (person.id !== personId) return person;
    return {
      ...person,
      giftIdeas: person.giftIdeas.map((gift) => {
        if (gift.id !== giftId) return gift;
        return normalizeGift({ ...gift, ...patch, id: gift.id }) || gift;
      }),
    };
  });
}

/**
 * Remove a single gift idea from a person.
 * @param {Person[]} people
 * @param {string} personId
 * @param {string} giftId
 * @returns {Person[]}
 */
export function removeGiftIdea(people, personId, giftId) {
  return people.map((person) =>
    person.id === personId
      ? { ...person, giftIdeas: person.giftIdeas.filter((gift) => gift.id !== giftId) }
      : person,
  );
}

/**
 * Advance a single gift's status to the next value in the cycle.
 * @param {Person[]} people
 * @param {string} personId
 * @param {string} giftId
 * @returns {Person[]}
 */
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
