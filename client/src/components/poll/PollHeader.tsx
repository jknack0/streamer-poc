import { useCallback, useEffect, useState } from 'react';
import type { PollStatus } from '../../types/poll';

const STATUS_LABEL: Record<PollStatus, string> = {
  idle: 'Not Started',
  active: 'Live',
  stopped: 'Closed',
};

type CopyState = 'idle' | 'copied' | 'failed';

interface PollHeaderProps {
  pollId: string;
  pollStatus: PollStatus;
  pollUrl: string;
  showCopyLink?: boolean;
}

const PollHeader = ({ pollId, pollStatus, pollUrl, showCopyLink = false }: PollHeaderProps) => {
  const [copyState, setCopyState] = useState<CopyState>('idle');

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }

    const timeout = window.setTimeout(() => setCopyState('idle'), 2200);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const handleCopyLink = useCallback(async () => {
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
  }, [pollUrl]);

  const statusLabel = STATUS_LABEL[pollStatus];

  return (
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
        {showCopyLink && (
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
    </header>
  );
};

export default PollHeader;
