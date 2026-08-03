# Gift Idea Vault

Two-level (people → gift ideas) single-page app for tracking gift ideas. No
backend, no login, no external APIs — everything lives in `localStorage`.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # unit tests (vitest)
npm run build    # production build to dist/
```

## Architecture

- **`src/domain/vault.js`** — pure, immutable, fully-JSDoc'd domain logic (no
  DOM, no storage). Nested CRUD (`addPerson`/`removePerson` with cascade delete,
  `addGiftIdea`/`updateGiftIdea`/`removeGiftIdea`), `cycleGiftStatus`,
  `summarizeGifts`, and the `normalize*` validation pipeline shared by new data
  and storage hydration.
- **`src/storage.js`** — localStorage read/write. Distinguishes `corrupt`
  (unparseable), `recovered` (some entries dropped), and `blocked` (access
  threw) load states.
- **`src/App.jsx` + `src/components/*`** — React UI over the domain layer. State
  lives in `App`; every mutation goes through a pure domain helper.
- **`src/*.test.js`** — 37 unit tests covering nested CRUD (incl. cascade
  delete), duplicate-name people, cycle status, summarize, and storage edge
  cases (corrupt / recovered / blocked).

## Decisions

- **Status cycle loops**: idea → purchased → given → idea. Looping keeps a
  mis-tap recoverable with a single control (no separate undo).
- **Price is currency-neutral** (`Est. 45`) — the brief stores a bare number and
  never names a currency.
- **Collapse** uses a CSS `grid-template-rows` transition; all animations are
  disabled under `prefers-reduced-motion`.
- **Delete person** requires an explicit confirmation that names the cascade
  (person + N gift ideas); deleting a single gift does not.
- **Source budget**: authored app source (`src/` excl. tests + `index.html`) is
  kept under the 40 KB raw cap.
