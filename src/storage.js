/**
 * @file localStorage persistence. Reads/writes the full nested `Person[]` and
 * distinguishes failure modes: `corrupt` (unparseable / wrong shape),
 * `recovered` (some entries dropped), `blocked` (localStorage threw).
 */

import { normalizePeople } from './domain/vault.js';

/** Versioned key so a future schema change can migrate cleanly. */
export const STORAGE_KEY = 'gift-idea-vault:v1';

/** @typedef {'ok' | 'empty' | 'recovered' | 'corrupt' | 'blocked'} LoadStatus */

/** Load + normalize the vault. Returns `{ people, status }`. */
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

/** Persist the full people structure. Returns `{ ok }` or `{ ok:false, error:'blocked' }`. */
export function savePeople(people) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
    return { ok: true };
  } catch {
    return { ok: false, error: 'blocked' };
  }
}
