import { summarizeGifts } from '../domain/vault.js';

export default function SummaryBadges({ giftIdeas }) {
  const summary = summarizeGifts(giftIdeas);
  const label = `${summary.idea} ideas, ${summary.purchased} purchased, ${summary.given} given`;

  return (
    <span className="summary" aria-label={label}>
      <span className="summary-part summary-idea">
        {summary.idea} idea{summary.idea === 1 ? '' : 's'}
      </span>
      <span className="summary-sep" aria-hidden="true">·</span>
      <span className="summary-part summary-purchased">{summary.purchased} purchased</span>
      <span className="summary-sep" aria-hidden="true">·</span>
      <span className="summary-part summary-given">{summary.given} given</span>
    </span>
  );
}
