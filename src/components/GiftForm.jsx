import { useState } from 'react';
import { parsePrice } from '../domain/vault.js';

export default function GiftForm({ initial, onSubmit, onCancel, submitLabel = 'Add gift' }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [price, setPrice] = useState(
    initial?.priceEstimate != null ? String(initial.priceEstimate) : '',
  );
  const [urlOrStore, setUrlOrStore] = useState(initial?.urlOrStore ?? '');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }
    const parsed = parsePrice(price);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    onSubmit({
      title: trimmedTitle,
      priceEstimate: parsed.value,
      urlOrStore: urlOrStore.trim(),
    });
  };

  return (
    <form className="gift-form" onSubmit={submit}>
      <label className="field">
        <span className="field-label">Title<span className="req" aria-hidden="true">*</span></span>
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          required
          autoFocus
          placeholder="e.g. Cozy wool scarf"
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field-label">Price estimate</span>
          <input
            className="input"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            inputMode="decimal"
            placeholder="Optional"
          />
        </label>
        <label className="field">
          <span className="field-label">URL / store</span>
          <input
            className="input"
            value={urlOrStore}
            onChange={(event) => setUrlOrStore(event.target.value)}
            maxLength={200}
            placeholder="Optional"
          />
        </label>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
