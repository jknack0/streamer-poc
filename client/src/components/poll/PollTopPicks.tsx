import { junglers } from '../../data/junglers';
import type { TopVote } from '../../types/poll';

const CHAMPIONS_BY_SLUG = new Map(junglers.map((champion) => [champion.slug, champion]));

interface PollTopPicksProps {
  topVotes: TopVote[];
  totalVotes: number;
  socketError?: string | null;
}

const PollTopPicks = ({ topVotes, totalVotes, socketError = null }: PollTopPicksProps) => {
  const voteSummary = totalVotes === 1 ? '1 vote cast' : `${totalVotes} votes cast`;

  return (
    <section className="champion-select__standings">
      <div className="champion-select__standings-header">
        <span className="champion-select__standings-title">Top Picks</span>
        <span className="champion-select__standings-total">{voteSummary}</span>
      </div>
      {socketError && <span className="champion-select__standings-warning">{socketError}</span>}
      {totalVotes === 0 ? (
        <span className="champion-select__standings-empty">No votes yet. Be the first to lock in!</span>
      ) : (
        <ol className="champion-select__standings-list">
          {topVotes.map((entry, index) => {
            const champion = CHAMPIONS_BY_SLUG.get(entry.championSlug);
            const displayName = champion?.name ?? entry.championSlug;

            return (
              <li key={entry.championSlug} className="champion-select__standings-item">
                <span className="champion-select__standings-rank">#{index + 1}</span>
                <span className="champion-select__standings-name">{displayName}</span>
                <span className="champion-select__standings-count">{entry.count}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

export default PollTopPicks;
