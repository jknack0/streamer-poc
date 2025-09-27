
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
const { openDatabase } = require('./db/database');
const { createPollStore } = require('./db/polls');
const { createPollController } = require('./controllers/pollController');
const { createPollRouter } = require('./routes/pollRoutes');
const { createPollSocket } = require('./sockets/pollSocket');

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

const clientDistPath = path.resolve(__dirname, '..', 'client', 'dist');
if (isProduction) {
  app.use(express.static(clientDistPath));
}

const db = openDatabase();
const polls = createPollStore(db);

const serializePoll = (poll) => ({
  id: poll.id,
  status: poll.status,
  createdAt: poll.created_at,
  updatedAt: poll.updated_at,
});

const pollSocket = createPollSocket({ io, polls, serializePoll });
const pollController = createPollController({
  polls,
  serializePoll,
  emitPollStatus: pollSocket.emitPollStatus,
  emitVoteSummary: pollSocket.emitVoteSummary,
});

app.use('/polls', createPollRouter(pollController));

pollSocket.register();

if (isProduction) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/polls') || req.path.startsWith('/socket.io')) {
      return next();
    }

    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
  });
}

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
