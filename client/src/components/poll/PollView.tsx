import { useEffect, useState } from 'react';
import PollControls from './PollControls';
import PollHeader from './PollHeader';
import PollTopPicks from './PollTopPicks';
import ChampionGrid from '../ChampionGrid';
import LockInButton from '../LockInButton';
import { junglers, type Champion } from '../../data/junglers';
import type { Poll } from '../../services/polls';
import type { TopVote } from '../../types/poll';

const CHAMPIONS_BY_SLUG = new Map(junglers.map((champion) => [champion.slug, champion]));

type LockInFeedbackState = 'idle' | 'success' | 'error';

interface PollViewCommonProps {
  pollId: string;
  pollUrl: string;
  poll: Poll;
  pollVersion: number;
  isLoading: boolean;
  isUpdatingPoll: boolean;
  statusMessage: string | null;
  statusError: string | null;
  topVotes: TopVote[];
  totalVotes: number;
  socketError: string | null;
}

interface PollAdminViewProps extends PollViewCommonProps {
  onStartPoll: () => Promise<void>;
  onStopPoll: () => Promise<void>;
  onRestartPoll: () => Promise<void>;
}

interface PollParticipantViewProps extends PollViewCommonProps {
  isLockingIn: boolean;
  lockedChampionSlug: string | null;
  onLockIn: (champion: Champion) => Promise<void>;
}

export const PollAdminView = ({
  pollId,
  pollUrl,
  poll,
  pollVersion,
  isLoading,
  isUpdatingPoll,
  statusMessage,
  statusError,
  topVotes,
  totalVotes,
  socketError,
  onStartPoll,
  onStopPoll,
  onRestartPoll,
}: PollAdminViewProps) => {
  return (
    <div key={`${pollId}-${pollVersion}`} className="champion-select">
      {isLoading && <div className="champion-select__loading-banner">Syncing with server...</div>}
      <PollHeader pollId={pollId} pollStatus={poll.status} pollUrl={pollUrl} showCopyLink />
      <PollControls
        pollStatus={poll.status}
        isUpdatingPoll={isUpdatingPoll}
        statusMessage={statusMessage}
        statusError={statusError}
        onStartPoll={onStartPoll}
        onStopPoll={onStopPoll}
        onRestartPoll={onRestartPoll}
      />
      <PollTopPicks topVotes={topVotes} totalVotes={totalVotes} socketError={socketError} />
    </div>
  );
};

export const PollParticipantView = (props: PollParticipantViewProps) => {
  const {
    pollId,
    pollUrl,
    poll,
    pollVersion,
    isLoading,
    isLockingIn,
    topVotes,
    totalVotes,
    socketError,
    lockedChampionSlug,
    onLockIn,
  } = props;

  const [selectedChampion, setSelectedChampion] = useState<Champion | null>(null);
  const [lockInFeedback, setLockInFeedback] = useState<LockInFeedbackState>('idle');
  const [lockInError, setLockInError] = useState<string | null>(null);

  const lockedChampion = lockedChampionSlug
    ? CHAMPIONS_BY_SLUG.get(lockedChampionSlug) ?? null
    : null;

  useEffect(() => {
    if (lockedChampion) {
      setSelectedChampion(lockedChampion);
    }
  }, [lockedChampion]);

  useEffect(() => {
    if (poll.status !== 'active') {
      setSelectedChampion(null);
      setLockInFeedback('idle');
      setLockInError(null);
    }
  }, [poll.status]);

  useEffect(() => {
    if (lockInFeedback === 'idle') {
      return;
    }

    const timeout = window.setTimeout(() => {
      setLockInFeedback('idle');
      setLockInError(null);
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [lockInFeedback]);

  const handleSelect = (champion: Champion) => {
    if (poll.status !== 'active' || isLockingIn || lockedChampion) {
      return;
    }

    setSelectedChampion(champion);
  };

  const handleLockIn = async () => {
    if (!selectedChampion || poll.status !== 'active' || isLockingIn || lockedChampion) {
      return;
    }

    try {
      setLockInFeedback('idle');
      setLockInError(null);
      await onLockIn(selectedChampion);
      setLockInFeedback('success');
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : 'Failed to lock in champion';
      setLockInError(message);
      setLockInFeedback('error');
    }
  };

  const pendingLabel = selectedChampion ? `Lock In ${selectedChampion.name}` : 'Lock In';
  const lockedLabel = lockedChampion ? `Lock In ${lockedChampion.name}` : pendingLabel;
  const shouldDisableLockIn =
    !selectedChampion || poll.status !== 'active' || Boolean(lockedChampion) || isLockingIn;
  const showWaitingMessage = poll.status !== 'active';

  return (
    <div key={`${pollId}-${pollVersion}`} className="champion-select">
      {isLoading && <div className="champion-select__loading-banner">Syncing with server...</div>}
      <PollHeader pollId={pollId} pollStatus={poll.status} pollUrl={pollUrl} />

      {showWaitingMessage ? (
        <div className="champion-select__viewer-message">Waiting for the admin to start the poll.</div>
      ) : (
        <div className="champion-select__viewer-message">Lock in your jungler below.</div>
      )}

      <PollTopPicks topVotes={topVotes} totalVotes={totalVotes} socketError={socketError} />

      <div className="champion-select__content">
        <div className="champion-select__grid">
          <ChampionGrid
            champions={junglers}
            selectedChampionSlug={selectedChampion?.slug}
            onSelect={handleSelect}
          />
        </div>

        <div className="champion-select__lock-in">
          <LockInButton
            disabled={shouldDisableLockIn}
            label={lockedLabel}
            loading={isLockingIn}
            onClick={handleLockIn}
          />
          {lockInFeedback === 'success' && (
            <span className="champion-select__lock-in-feedback champion-select__lock-in-feedback--success">
              Pick submitted
            </span>
          )}
          {lockInFeedback === 'error' && lockInError && (
            <span className="champion-select__lock-in-feedback champion-select__lock-in-feedback--error">
              {lockInError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
