import { Navigate, useNavigate, useParams } from 'react-router-dom';
import usePollController from '../hooks/usePollController';
import { PollParticipantView } from '../components/poll/PollView';

const ParticipantPollRoute = () => {
  const navigate = useNavigate();
  const { pollId } = useParams<{ pollId: string }>();

  const controller = usePollController(pollId);

  if (!pollId) {
    return <Navigate to="/" replace />;
  }

  if (controller.pollError) {
    return (
      <div className="poll-message">
        <div className="poll-message__panel">
          <h1 className="poll-message__title">{controller.pollError}</h1>
          <button type="button" className="poll-message__cta" onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    );
  }

  if (!controller.poll) {
    return (
      <div className="poll-message">
        <div className="poll-message__panel">
          <h1 className="poll-message__title">Loading poll...</h1>
        </div>
      </div>
    );
  }

  const pollUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <PollParticipantView
      pollId={pollId}
      pollUrl={pollUrl}
      poll={controller.poll}
      pollVersion={controller.pollVersion}
      isLoading={controller.isLoadingPoll}
      isUpdatingPoll={controller.isUpdatingStatus}
      isLockingIn={controller.isLockingIn}
      statusMessage={controller.statusMessage}
      statusError={controller.statusError}
      topVotes={controller.topVotes}
      totalVotes={controller.totalVotes}
      socketError={controller.socketError}
      lockedChampionSlug={controller.lockedChampionSlug}
      onLockIn={controller.lockIn}
    />
  );
};

export default ParticipantPollRoute;
