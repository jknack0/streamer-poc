const pollRoom = (pollId) => `poll:${pollId}`;

const createPollSocket = ({ io, polls, serializePoll }) => {
  if (!io) {
    throw new Error('Socket.io server instance is required');
  }

  if (!polls) {
    throw new Error('Poll store is required for socket handlers');
  }

  const emitPollStatus = (poll) => {
    if (!poll) {
      return;
    }

    const payload = { poll: serializePoll(poll) };
    io.to(pollRoom(poll.id)).emit('poll:update', payload);
    io.to(pollRoom(poll.id)).emit('poll:status', { pollId: poll.id, status: poll.status });
  };

  const emitVoteSummary = (pollId, summary) => {
    if (!pollId) {
      return;
    }

    const payload = summary ?? {
      topVotes: polls.topVotes(pollId, 3),
      totalVotes: polls.totalVotes(pollId),
    };

    io.to(pollRoom(pollId)).emit('poll:votes', {
      pollId,
      topVotes: payload.topVotes,
      totalVotes: payload.totalVotes,
    });
  };

  const handleJoin = (socket, pollId) => {
    if (typeof pollId !== 'string' || pollId.trim().length === 0) {
      socket.emit('poll:error', { pollId, error: 'Invalid poll id' });
      return;
    }

    const normalized = pollId.trim();
    const poll = polls.findById(normalized);
    if (!poll) {
      socket.emit('poll:error', { pollId: normalized, error: 'Poll not found' });
      return;
    }

    socket.join(pollRoom(normalized));
    socket.emit('poll:update', { poll: serializePoll(poll) });
    socket.emit('poll:votes', {
      pollId: normalized,
      topVotes: polls.topVotes(normalized, 3),
      totalVotes: polls.totalVotes(normalized),
    });
  };

  const handleLeave = (socket, pollId) => {
    if (typeof pollId !== 'string' || pollId.trim().length === 0) {
      return;
    }

    socket.leave(pollRoom(pollId.trim()));
  };

  const register = () => {
    io.on('connection', (socket) => {
      socket.on('poll:join', (pollId) => handleJoin(socket, pollId));
      socket.on('poll:leave', (pollId) => handleLeave(socket, pollId));
    });
  };

  return {
    register,
    emitPollStatus,
    emitVoteSummary,
  };
};

module.exports = { createPollSocket };
