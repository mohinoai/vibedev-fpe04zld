import { useCallback, useEffect, useState } from 'react';
import {
  addPerson,
  removePerson,
  addGiftIdea,
  updateGiftIdea,
  removeGiftIdea,
  cycleGiftIdeaStatus,
} from './domain/vault.js';
import { loadPeople, savePeople } from './storage.js';
import PersonSection from './components/PersonSection.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import StorageBanner from './components/StorageBanner.jsx';

/**
 * Root application component.
 *
 * Owns the single source of truth (`people`) and delegates every mutation to the
 * pure domain helpers in {@link module:domain/vault}. Persistence is a side
 * effect that mirrors state to localStorage after each change.
 */
export default function App() {
  /** @type {import('./domain/vault.js').Person[]} single source of truth. */
  const [people, setPeople] = useState([]);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [saveBlocked, setSaveBlocked] = useState(false);
  const [name, setName] = useState('');
  /** Person queued for the destructive delete confirmation, or null. */
  const [pendingDelete, setPendingDelete] = useState(null);

  // Hydrate once from storage. `loadStatus === 'loading'` guarantees at least
  // one painted frame with a real visible loading indicator before data lands.
  useEffect(() => {
    const result = loadPeople();
    setPeople(result.people);
    setLoadStatus(result.status);
  }, []);

  // Mirror state to storage after every change (but not during initial load).
  useEffect(() => {
    if (loadStatus === 'loading') return;
    const result = savePeople(people);
    setSaveBlocked(!result.ok);
  }, [people, loadStatus]);

  const handleAddPerson = useCallback(
    (event) => {
      event.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) return;
      setPeople((prev) => addPerson(prev, trimmed));
      setName('');
    },
    [name],
  );

  const handleAddGift = useCallback((personId, payload) => {
    setPeople((prev) => addGiftIdea(prev, personId, payload));
  }, []);

  const handleUpdateGift = useCallback((personId, giftId, payload) => {
    setPeople((prev) => updateGiftIdea(prev, personId, giftId, payload));
  }, []);

  const handleDeleteGift = useCallback((personId, giftId) => {
    setPeople((prev) => removeGiftIdea(prev, personId, giftId));
  }, []);

  const handleCycleGift = useCallback((personId, giftId) => {
    setPeople((prev) => cycleGiftIdeaStatus(prev, personId, giftId));
  }, []);

  const confirmDeletePerson = useCallback(() => {
    if (!pendingDelete) return;
    setPeople((prev) => removePerson(prev, pendingDelete.id));
    setPendingDelete(null);
  }, [pendingDelete]);

  const isLoading = loadStatus === 'loading';

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">🎁</span>
          <div className="brand-text">
            <h1 className="brand-title">Gift Idea Vault</h1>
            <p className="brand-sub">Every gift idea for everyone you love, in one warm place.</p>
          </div>
        </div>

        <form className="add-person" onSubmit={handleAddPerson}>
          <input
            className="add-person-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={200}
            placeholder="Add a person — e.g. Mom, Best Friend Jake…"
            aria-label="New person name"
          />
          <button type="submit" className="btn btn-primary">Add person</button>
        </form>
      </header>

      <StorageBanner loadStatus={loadStatus} saveBlocked={saveBlocked} />

      <main className="app-main">
        {isLoading ? (
          <div className="loading" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span>Loading your vault…</span>
          </div>
        ) : people.length === 0 ? (
          <div className="empty">
            <span className="empty-emoji" aria-hidden="true">🎄</span>
            <h2 className="empty-title">No people yet</h2>
            <p className="empty-text">Add someone above to start collecting gift ideas for them.</p>
          </div>
        ) : (
          <div className="people">
            {people.map((person) => (
              <PersonSection
                key={person.id}
                person={person}
                onAddGift={handleAddGift}
                onUpdateGift={handleUpdateGift}
                onDeleteGift={handleDeleteGift}
                onCycleGift={handleCycleGift}
                onRequestDeletePerson={setPendingDelete}
              />
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        person={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDeletePerson}
      />
    </div>
  );
}
