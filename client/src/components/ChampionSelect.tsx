import { useEffect, useState } from 'react';
import ChampionGrid from './ChampionGrid';
import LockInButton from './LockInButton';
import { junglers, type Champion } from '../data/junglers';
import type { PollStatus, TopVote } from '../types/poll';

const TIMER_PLACEHOLDER = 81;

type LockInFeedbackState = 'idle' | 'success' | 'error';

const CHAMPIONS_BY_SLUG = new Map(junglers.map((champion) => [champion.slug, champion]));

interface ChampionSelectProps {
  pollId: string;
  pollUrl: string;
  pollStatus: PollStatus;
  isAdmin: boolean;
  isLoading: boolean;
  isUpdatingPoll: boolean;
  isLockingIn: boolean;
  statusMessage?: string | null;
  statusError?: string | null;
  topVotes: TopVote[];
  totalVotes: number;
  socketError?: string | null;
  lockedChampionSlug?: string | null;
  onStartPoll: () => void | Promise<void>;
  onStopPoll: () => void | Promise<void>;
  onRestartPoll: () => void | Promise<void>;
  onLockIn: (champion: Champion) => Promise<void>;
}

const STATUS_LABEL: Record<PollStatus, string> = {
  idle: 'Not Started',
  active: 'Live',
  stopped: 'Closed',
};

const ChampionSelect = ({
  pollId,
  pollUrl,
  pollStatus,
  isAdmin,
  isLoading,
  isUpdatingPoll,
  isLockingIn,
  statusMessage,
  statusError,
  topVotes,
  totalVotes,
  socketError,
  lockedChampionSlug = null,
  onStartPoll,
  onStopPoll,
  onRestartPoll,
  onLockIn,
}: ChampionSelectProps) => {
  const [selectedChampion, setSelectedChampion] = useState<Champion | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
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
    if (pollStatus !== 'active') {
      setSelectedChampion(null);
      setLockInFeedback('idle');
      setLockInError(null);
    }
  }, [pollStatus]);

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }

    const timeout = window.setTimeout(() => setCopyState('idle'), 2200);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

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

  const canSelectChampion = !isAdmin && pollStatus === 'active' && !lockedChampion;

  const handleSelect = (champion: Champion) => {
    if (!canSelectChampion || isLockingIn) {
      return;
    }

    setSelectedChampion(champion);
  };

  const handleCopyLink = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(pollUrl);
        setCopyState('copied');
        return;
      }
    } catch {
      // fall through to other strategies
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = pollUrl;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        setCopyState('copied');
        return;
      }
    } catch {
      // fall through to final prompt
    }

    window.prompt('Copy this poll link:', pollUrl);
    setCopyState('failed');
  };

  const handleLockIn = async () => {
    if (!selectedChampion || pollStatus !== 'active' || isLockingIn || lockedChampion) {
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

  const statusLabel = STATUS_LABEL[pollStatus];
  const showWaitingMessage = !isAdmin && pollStatus !== 'active';
  const voteSummary = totalVotes === 1 ? '1 vote cast' : `${totalVotes} votes cast`;

  const pendingLabel = selectedChampion ? `Lock In ${selectedChampion.name}` : 'Lock In';
  const lockedLabel = lockedChampion ? `Lock In ${lockedChampion.name}` : pendingLabel;
  const shouldDisableLockIn =
    !selectedChampion || pollStatus !== 'active' || Boolean(lockedChampion) || isLockingIn;

  return (
    <div className="champion-select">
      {isLoading && (
        <div className="champion-select__loading-banner">Syncing with server...</div>
      )}

      <header className="champion-select__header">
        <div>
          <h1 className="champion-select__title">Choose Your Champion!</h1>
          <p className="champion-select__subtitle">Jungle roster</p>
          <div className="champion-select__meta">
            <span className={`champion-select__status champion-select__status--${pollStatus}`}>
              {statusLabel}
            </span>
            <span className="champion-select__poll-id">Poll ID: {pollId}</span>
          </div>
          {isAdmin && (
            <button type="button" className="champion-select__copy" onClick={handleCopyLink}>
              Copy Poll Link
            </button>
          )}
          {copyState === 'copied' && (
            <span className="champion-select__copy-feedback champion-select__copy-feedback--success">
              Link copied to clipboard
            </span>
          )}
          {copyState === 'failed' && (
            <span className="champion-select__copy-feedback champion-select__copy-feedback--error">
              Copy failed - use the prompt dialog to grab the link.
            </span>
          )}
        </div>
        <div className="champion-select__timer">{TIMER_PLACEHOLDER}</div>
      </header>

      {isAdmin ? (
        <div className="champion-select__admin-controls">
          <span className="champion-select__admin-label">Poll Controls</span>
          <div className="champion-select__admin-buttons">
            <button
              type="button"
              className="champion-select__admin-button"
              onClick={onStartPoll}
              disabled={pollStatus === 'active' || isUpdatingPoll}
            >
              Start
            </button>
            <button
              type="button"
              className="champion-select__admin-button"
              onClick={onStopPoll}
              disabled={pollStatus !== 'active' || isUpdatingPoll}
            >
              Stop
            </button>
            <button
              type="button"
              className="champion-select__admin-button"
              onClick={onRestartPoll}
              disabled={pollStatus === 'idle' || isUpdatingPoll}
            >
              Restart
            </button>
          </div>
          {statusMessage && (
            <span className="champion-select__status-feedback champion-select__status-feedback--success">
              {statusMessage}
            </span>
          )}
          {statusError && (
            <span className="champion-select__status-feedback champion-select__status-feedback--error">
              {statusError}
            </span>
          )}
        </div>
      ) : (
        <div className="champion-select__viewer-message">
          {showWaitingMessage
            ? 'Waiting for the admin to start the poll.'
            : 'Lock in your jungler below.'}
        </div>
      )}

      <section className="champion-select__standings">
        <div className="champion-select__standings-header">
          <span className="champion-select__standings-title">Top Picks</span>
          <span className="champion-select__standings-total">{voteSummary}</span>
        </div>
        {socketError && (
          <span className="champion-select__standings-warning">{socketError}</span>
        )}
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

      {!isAdmin && (
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
      )}
    </div>
  );
};

export default ChampionSelect;
