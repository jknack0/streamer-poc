import type { PollStatus } from '../../types/poll';

interface PollControlsProps {
  pollStatus: PollStatus;
  isUpdatingPoll: boolean;
  statusMessage: string | null;
  statusError: string | null;
  onStartPoll: () => void | Promise<void>;
  onStopPoll: () => void | Promise<void>;
  onRestartPoll: () => void | Promise<void>;
}

const PollControls = ({
  pollStatus,
  isUpdatingPoll,
  statusMessage,
  statusError,
  onStartPoll,
  onStopPoll,
  onRestartPoll,
}: PollControlsProps) => {
  return (
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
  );
};

export default PollControls;
