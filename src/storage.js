/**
 * @file localStorage persistence for the Gift Idea Vault.
 *
 * Reads/writes the full nested `Person[]` structure and distinguishes three
 * failure modes so the UI can react appropriately:
 *   - `corrupt`   — stored JSON is unparseable or the wrong shape (unrecoverable).
 *   - `recovered` — some entries were invalid and skipped (partial recovery).
 *   - `blocked`   — localStorage itself threw (private mode / quota / denied).
 */

import { normalizePeople } from './domain/vault.js';

/** localStorage key. Versioned so a future schema change can migrate cleanly. */
export const STORAGE_KEY = 'gift-idea-vault:v1';

/**
 * @typedef {'ok' | 'empty' | 'recovered' | 'corrupt' | 'blocked'} LoadStatus
 */

/**
 * @typedef {Object} LoadResult
 * @property {import('./domain/vault.js').Person[]} people
 * @property {LoadStatus} status
 */

/**
 * Load and normalize the vault from storage.
 * @returns {LoadResult}
 */
export function loadPeople() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { people: [], status: 'blocked' };
  }
  if (raw == null) return { people: [], status: 'empty' };

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { people: [], status: 'corrupt' };
  }

  const { people, recovered } = normalizePeople(parsed);
  if (!Array.isArray(parsed)) return { people, status: 'corrupt' };
  return { people, status: recovered ? 'recovered' : 'ok' };
}

/**
 * @typedef {{ ok: true } | { ok: false, error: 'blocked' }} SaveResult
 */

/**
 * Persist the full people structure.
 * @param {import('./domain/vault.js').Person[]} people
 * @returns {SaveResult}
 */
export function savePeople(people) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
    return { ok: true };
  } catch {
    return { ok: false, error: 'blocked' };
  }
}
