const express = require('express');
const http = require('http');
const { randomUUID } = require('crypto');
const { Server } = require('socket.io');
const cors = require('cors');
const { openDatabase } = require('./db/database');
const { createPollStore, VALID_STATUSES } = require('./db/polls');

const app = express();
const server = http.createServer(app);

const isProduction = process.env.NODE_ENV === 'production';
const defaultDevOrigin = process.env.DEV_CLIENT_ORIGIN || 'http://localhost:5173';
const allowedOrigins = [];

if (process.env.CLIENT_ORIGIN) {
  allowedOrigins.push(process.env.CLIENT_ORIGIN);
} else if (!isProduction) {
  allowedOrigins.push(defaultDevOrigin);
}

if (allowedOrigins.length > 0) {
  app.use(cors({ origin: allowedOrigins, credentials: true }));
} else {
  app.use(cors());
}

const io = new Server(server, {
  cors: allowedOrigins.length > 0 ? { origin: allowedOrigins, credentials: true } : undefined,
});
const PORT = process.env.PORT || 3000;

app.use(express.json());

const db = openDatabase();
const polls = createPollStore(db);

const serializePoll = (poll) => ({
  id: poll.id,
  status: poll.status,
  createdAt: poll.created_at,
  updatedAt: poll.updated_at,
});

const pollRoom = (pollId) => `poll:${pollId}`;

const emitPollStatus = (poll) => {
  const payload = { poll: serializePoll(poll) };
  io.to(pollRoom(poll.id)).emit('poll:update', payload);
  io.to(pollRoom(poll.id)).emit('poll:status', { pollId: poll.id, status: poll.status });
};

const emitVoteSummary = (pollId, summary) => {
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

io.on('connection', (socket) => {
  socket.on('poll:join', (pollId) => {
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
  });

  socket.on('poll:leave', (pollId) => {
    if (typeof pollId !== 'string' || pollId.trim().length === 0) {
      return;
    }

    socket.leave(pollRoom(pollId.trim()));
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.post('/polls', (req, res) => {
  const { id = randomUUID(), status = 'idle' } = req.body ?? {};

  try {
    const poll = polls.create({ id, status });
    res.status(201).json(serializePoll(poll));
  } catch (error) {
    if (/UNIQUE constraint failed: polls\.id/.test(error.message)) {
      res.status(409).json({ error: 'Poll already exists' });
      return;
    }

    if (/Invalid poll status/.test(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to create poll' });
  }
});

app.get('/polls/:id', (req, res) => {
  const poll = polls.findById(req.params.id);

  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  res.json(serializePoll(poll));
});

app.post('/polls/:id/status', (req, res) => {
  const { status } = req.body ?? {};

  if (typeof status !== 'string' || !VALID_STATUSES.has(status)) {
    res.status(400).json({ error: 'Status must be one of idle, active, stopped' });
    return;
  }

  const poll = polls.setStatus(req.params.id, status);

  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  emitPollStatus(poll);
  res.json(serializePoll(poll));
});

app.post('/polls/:id/votes', (req, res) => {
  const { championSlug, voterId } = req.body ?? {};

  if (typeof championSlug !== 'string' || championSlug.trim().length === 0) {
    res.status(400).json({ error: 'championSlug is required' });
    return;
  }

  const poll = polls.findById(req.params.id);
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  try {
    const result = polls.recordVote({
      pollId: req.params.id,
      voterId: typeof voterId === 'string' && voterId.trim().length > 0 ? voterId : null,
      championSlug: championSlug.trim(),
    });

    emitVoteSummary(req.params.id, { topVotes: result.topVotes, totalVotes: result.totalVotes });
    res.status(201).json({ poll: serializePoll(poll), votes: result.votes, topVotes: result.topVotes, totalVotes: result.totalVotes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

app.get('/polls/:id/votes', (req, res) => {
  const poll = polls.findById(req.params.id);

  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  const votes = polls.allVotes(req.params.id);
  res.json({
    poll: serializePoll(poll),
    votes,
    topVotes: polls.topVotes(req.params.id, 3),
    totalVotes: polls.totalVotes(req.params.id),
  });
});

app.delete('/polls/:id/votes', (req, res) => {
  const poll = polls.findById(req.params.id);

  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  polls.clearVotes(req.params.id);
  emitVoteSummary(req.params.id, { topVotes: [], totalVotes: 0 });
  res.status(204).send();
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});

const shutdown = () => {
  // eslint-disable-next-line no-console
  console.log('Shutting down API server');
  io.close();
  server.close(() => {
    db.close();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
