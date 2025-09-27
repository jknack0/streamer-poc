const express = require('express');
const { randomUUID } = require('crypto');
const { openDatabase } = require('./db/database');
const { createPollStore, VALID_STATUSES } = require('./db/polls');

const app = express();
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
    const votes = polls.recordVote({
      pollId: req.params.id,
      voterId: typeof voterId === 'string' && voterId.trim().length > 0 ? voterId : null,
      championSlug: championSlug.trim(),
    });

    res.status(201).json({ poll: serializePoll(poll), votes });
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

  res.json({ poll: serializePoll(poll), votes: polls.allVotes(req.params.id) });
});

app.delete('/polls/:id/votes', (req, res) => {
  const poll = polls.findById(req.params.id);

  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  polls.clearVotes(req.params.id);
  res.status(204).send();
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});

const shutdown = () => {
  // eslint-disable-next-line no-console
  console.log('Shutting down API server');
  db.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
