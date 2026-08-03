import { useId, useState } from 'react';
import SummaryBadges from './SummaryBadges.jsx';
import GiftCard from './GiftCard.jsx';
import GiftForm from './GiftForm.jsx';

export default function PersonSection({
  person,
  onAddGift,
  onUpdateGift,
  onDeleteGift,
  onCycleGift,
  onRequestDeletePerson,
}) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const bodyId = useId();
  const gifts = person.giftIdeas;

  return (
    <section className="person">
      <div className="person-header">
        <button
          type="button"
          className="person-toggle"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className={`chevron ${expanded ? 'is-open' : ''}`} aria-hidden="true" />
          <span className="person-name">{person.name}</span>
        </button>

        <SummaryBadges giftIdeas={gifts} />

        <button
          type="button"
          className="icon-btn is-danger person-delete"
          onClick={() => onRequestDeletePerson(person)}
          aria-label={`Delete ${person.name} and all their gift ideas`}
        >
          Delete
        </button>
      </div>

      <div className={`person-collapse ${expanded ? 'is-open' : ''}`}>
        <div className="person-collapse-inner">
          <div id={bodyId} className="person-body">
            {adding ? (
              <GiftForm
                onSubmit={(payload) => {
                  onAddGift(person.id, payload);
                  setAdding(false);
                }}
                onCancel={() => setAdding(false)}
              />
            ) : (
              <button
                type="button"
                className="btn btn-add"
                onClick={() => setAdding(true)}
              >
                + Add gift idea
              </button>
            )}

            {gifts.length === 0 ? (
              <p className="empty-mini">No gift ideas yet — add the first one above.</p>
            ) : (
              <ul className="gift-list">
                {gifts.map((gift) => (
                  <GiftCard
                    key={gift.id}
                    gift={gift}
                    onCycle={() => onCycleGift(person.id, gift.id)}
                    onUpdate={(payload) => onUpdateGift(person.id, gift.id, payload)}
                    onDelete={() => onDeleteGift(person.id, gift.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
