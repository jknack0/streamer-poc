const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { openDatabase } = require('./db/database');
const { createPollStore } = require('./db/polls');
const { createPollController } = require('./controllers/pollController');
const { createPollRouter } = require('./routes/pollRoutes');

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

const pollController = createPollController({
  polls,
  serializePoll,
  emitPollStatus,
  emitVoteSummary,
});

app.use('/polls', createPollRouter(pollController));

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
