const LABELS = { idea: 'Idea', purchased: 'Purchased', given: 'Given' };

/**
 * Colored status badge. When `onClick` is given it renders as a button that
 * advances the status (cycle interaction); otherwise a static label.
 */

export default function StatusBadge({ status, onClick }) {
  const label = LABELS[status] || status;

  if (onClick) {
    return (
      <button
        type="button"
        className={`badge badge-${status} badge-btn`}
        onClick={onClick}
        aria-label={`Status: ${label}. Activate to advance to the next status.`}
        title="Advance status"
      >
        <span className="badge-dot" aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
