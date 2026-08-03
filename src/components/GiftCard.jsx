import { useState } from 'react';
import StatusBadge from './StatusBadge.jsx';
import GiftForm from './GiftForm.jsx';

// Currency-neutral: the brief stores a bare number, never a currency.
const formatPrice = (value) => (value == null ? null : `Est. ${value.toLocaleString()}`);
const isHttpUrl = (value) => /^https?:\/\//i.test(value);

export default function GiftCard({ gift, onCycle, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="gift-card is-editing">
        <GiftForm
          initial={gift}
          submitLabel="Save changes"
          onSubmit={(payload) => {
            onUpdate(payload);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  const price = formatPrice(gift.priceEstimate);

  return (
    <li className="gift-card">
      <div className="gift-main">
        <div className="gift-head">
          <h4 className="gift-title">{gift.title}</h4>
          <StatusBadge status={gift.status} onClick={onCycle} />
        </div>
        {(price || gift.urlOrStore) && (
          <div className="gift-meta">
            {price && <span className="gift-price">{price}</span>}
            {gift.urlOrStore &&
              (isHttpUrl(gift.urlOrStore) ? (
                <a
                  className="gift-url"
                  href={gift.urlOrStore}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {gift.urlOrStore}
                </a>
              ) : (
                <span className="gift-url">{gift.urlOrStore}</span>
              ))}
          </div>
        )}
      </div>

      <div className="gift-actions">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setEditing(true)}
          aria-label={`Edit gift: ${gift.title}`}
        >
          Edit
        </button>
        <button
          type="button"
          className="icon-btn is-danger"
          onClick={onDelete}
          aria-label={`Delete gift: ${gift.title}`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
