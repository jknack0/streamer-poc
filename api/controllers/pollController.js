const { randomUUID } = require('crypto');
const { VALID_STATUSES } = require('../db/polls');

const createPollController = ({ polls, serializePoll, emitPollStatus, emitVoteSummary }) => {
  if (!polls) {
    throw new Error('polls store is required');
  }

  const createPoll = (req, res) => {
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
  };

  const getPoll = (req, res) => {
    const poll = polls.findById(req.params.id);

    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }

    res.json(serializePoll(poll));
  };

  const updatePollStatus = (req, res) => {
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

    emitPollStatus?.(poll);
    res.json(serializePoll(poll));
  };

  const recordVote = (req, res) => {
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

      emitVoteSummary?.(req.params.id, {
        topVotes: result.topVotes,
        totalVotes: result.totalVotes,
      });

      res.status(201).json({
        poll: serializePoll(poll),
        votes: result.votes,
        topVotes: result.topVotes,
        totalVotes: result.totalVotes,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to record vote' });
    }
  };

  const listVotes = (req, res) => {
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
  };

  const clearVotes = (req, res) => {
    const poll = polls.findById(req.params.id);

    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }

    polls.clearVotes(req.params.id);
    emitVoteSummary?.(req.params.id, { topVotes: [], totalVotes: 0 });
    res.status(204).send();
  };

  return {
    createPoll,
    getPoll,
    updatePollStatus,
    recordVote,
    listVotes,
    clearVotes,
  };
};

module.exports = { createPollController };
