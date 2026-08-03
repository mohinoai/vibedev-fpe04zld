import { useEffect, useRef } from 'react';

/**
 * Modal confirmation for the destructive "delete person" action. Unlike a plain
 * gift delete, this spells out the cascade (person + N gift ideas) and requires
 * an explicit confirm. Escape and backdrop click cancel; focus lands on Cancel.
 */
export default function ConfirmDialog({ open, person, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (open && cancelRef.current) cancelRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open || !person) return null;

  const count = person.giftIdeas.length;

  return (
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        <h2 id="confirm-title" className="dialog-title">Delete {person.name}?</h2>
        <p id="confirm-desc" className="dialog-desc">
          This permanently removes <strong>{person.name}</strong> and all{' '}
          <strong>
            {count} gift idea{count === 1 ? '' : 's'}
          </strong>{' '}
          saved under them. This can’t be undone.
        </p>
        <div className="dialog-actions">
          <button type="button" ref={cancelRef} className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            Delete everything
          </button>
        </div>
      </div>
    </div>
  );
}
