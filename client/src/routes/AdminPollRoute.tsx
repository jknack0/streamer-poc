import { Navigate, useNavigate, useParams } from 'react-router-dom';
import usePollController from '../hooks/usePollController';
import { PollAdminView } from '../components/poll/PollView';
import { getIsAdmin } from '../utils/pollIdentity';

const AdminPollRoute = () => {
  const navigate = useNavigate();
  const { pollId } = useParams<{ pollId: string }>();

  const controller = usePollController(pollId);

  if (!pollId) {
    return <Navigate to="/" replace />;
  }

  if (!getIsAdmin(pollId)) {
    return <Navigate to={`/polls/${pollId}`} replace />;
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

  const adminUrl = typeof window !== 'undefined' ? window.location.href : '';
  const pollUrl = adminUrl.replace(/\/admin\/?$/, '');

  return (
    <PollAdminView
      pollId={pollId}
      pollUrl={pollUrl}
      poll={controller.poll}
      pollVersion={controller.pollVersion}
      isLoading={controller.isLoadingPoll}
      isUpdatingPoll={controller.isUpdatingStatus}
      statusMessage={controller.statusMessage}
      statusError={controller.statusError}
      topVotes={controller.topVotes}
      totalVotes={controller.totalVotes}
      socketError={controller.socketError}
      onStartPoll={controller.startPoll}
      onStopPoll={controller.stopPoll}
      onRestartPoll={controller.restartPoll}
    />
  );
};

export default AdminPollRoute;
