const express = require('express');
const request = require('supertest');
const { createDatabase } = require('../db/database');
const { createPollStore } = require('../db/polls');
const { createPollController } = require('../controllers/pollController');
const { createPollRouter } = require('../routes/pollRoutes');

const serializePoll = (poll) => ({
  id: poll.id,
  status: poll.status,
  createdAt: poll.created_at,
  updatedAt: poll.updated_at,
});

const createTestContext = () => {
  const db = createDatabase(':memory:');
  const polls = createPollStore(db);
  const emitPollStatus = jest.fn();
  const emitVoteSummary = jest.fn();

  const pollController = createPollController({
    polls,
    serializePoll,
    emitPollStatus,
    emitVoteSummary,
  });

  const app = express();
  app.use(express.json());
  app.use('/polls', createPollRouter(pollController));

  return { app, db, emitPollStatus, emitVoteSummary };
};

describe('Poll API', () => {
  let context;
  let originalConsole;

  beforeAll(() => {
    originalConsole = console.log;
    console.log = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsole;
  });

  beforeEach(() => {
    context = createTestContext();
  });

  afterEach(() => {
    context.db.close();
  });

  const createPoll = async (pollId = 'test-poll', status = 'idle') => {
    const response = await request(context.app)
      .post('/polls')
      .send({ id: pollId, status });
    expect(response.status).toBe(201);
    return response.body;
  };

  test('creates a poll with defaults', async () => {
    const response = await request(context.app).post('/polls').send({});

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        status: 'idle',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
  });

  test('creates a poll with custom id and status', async () => {
    const payload = { id: 'custom-poll', status: 'active' };
    const response = await request(context.app).post('/polls').send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({ id: payload.id, status: payload.status }),
    );
  });

  test('rejects duplicate poll ids', async () => {
    await createPoll('duplicate');
    const response = await request(context.app).post('/polls').send({ id: 'duplicate' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Poll already exists' });
  });

  test('rejects invalid poll status on create', async () => {
    const response = await request(context.app).post('/polls').send({ status: 'unknown' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid poll status: unknown' });
  });

  test('fetches an existing poll', async () => {
    const poll = await createPoll('fetch-me');
    const response = await request(context.app).get(`/polls/${poll.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({ id: poll.id, status: 'idle' }),
    );
  });

  test('returns 404 for missing poll', async () => {
    const response = await request(context.app).get('/polls/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Poll not found' });
  });

  test('updates poll status and notifies listeners', async () => {
    const poll = await createPoll('status-poll', 'idle');
    const response = await request(context.app)
      .post(`/polls/${poll.id}/status`)
      .send({ status: 'active' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({ id: poll.id, status: 'active' }),
    );
    expect(context.emitPollStatus).toHaveBeenCalledTimes(1);
    expect(context.emitPollStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: poll.id, status: 'active' }),
    );
  });

  test('rejects invalid status updates', async () => {
    const poll = await createPoll('invalid-status');
    const response = await request(context.app)
      .post(`/polls/${poll.id}/status`)
      .send({ status: 'bogus' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Status must be one of idle, active, stopped' });
  });

  test('returns 404 when updating status for missing poll', async () => {
    const response = await request(context.app)
      .post('/polls/unknown/status')
      .send({ status: 'active' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Poll not found' });
  });

  test('records a vote and returns summary', async () => {
    const poll = await createPoll('vote-poll');
    const response = await request(context.app)
      .post(`/polls/${poll.id}/votes`)
      .send({ championSlug: 'lee-sin', voterId: 'voter-1' });

    expect(response.status).toBe(201);
    expect(response.body.poll).toMatchObject({ id: poll.id });
    expect(response.body.totalVotes).toBe(1);
    expect(response.body.topVotes).toEqual([
      expect.objectContaining({ championSlug: 'lee-sin', count: 1 }),
    ]);
    expect(response.body.votes).toEqual([
      expect.objectContaining({
        poll_id: poll.id,
        champion_slug: 'lee-sin',
        voter_id: 'voter-1',
      }),
    ]);
    expect(context.emitVoteSummary).toHaveBeenCalledTimes(1);
    expect(context.emitVoteSummary).toHaveBeenCalledWith(poll.id, {
      topVotes: expect.arrayContaining([
        expect.objectContaining({ championSlug: 'lee-sin', count: 1 }),
      ]),
      totalVotes: 1,
    });
  });

  test('prevents duplicate votes from same voter', async () => {
    const poll = await createPoll('dup-vote');
    await request(context.app)
      .post(`/polls/${poll.id}/votes`)
      .send({ championSlug: 'nidalee', voterId: 'voter-1' })
      .expect(201);

    const response = await request(context.app)
      .post(`/polls/${poll.id}/votes`)
      .send({ championSlug: 'nidalee', voterId: 'voter-1' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'You have already voted in this poll.' });
  });

  test('requires champion slug when recording vote', async () => {
    const poll = await createPoll('missing-champion');
    const response = await request(context.app)
      .post(`/polls/${poll.id}/votes`)
      .send({ voterId: 'voter-1' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'championSlug is required' });
  });

  test('requires voter id when recording vote', async () => {
    const poll = await createPoll('missing-voter');
    const response = await request(context.app)
      .post(`/polls/${poll.id}/votes`)
      .send({ championSlug: 'vi' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'voterId is required' });
  });

  test('returns 404 when recording vote for missing poll', async () => {
    const response = await request(context.app)
      .post('/polls/nope/votes')
      .send({ championSlug: 'vi', voterId: 'voter-1' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Poll not found' });
  });

  test('lists votes with summary', async () => {
    const poll = await createPoll('list-votes');
    await request(context.app)
      .post(`/polls/${poll.id}/votes`)
      .send({ championSlug: 'elise', voterId: 'voter-1' })
      .expect(201);
    await request(context.app)
      .post(`/polls/${poll.id}/votes`)
      .send({ championSlug: 'elise', voterId: 'voter-2' })
      .expect(201);

    const response = await request(context.app).get(`/polls/${poll.id}/votes`);

    expect(response.status).toBe(200);
    expect(response.body.poll).toMatchObject({ id: poll.id });
    expect(response.body.totalVotes).toBe(2);
    expect(response.body.topVotes).toEqual([
      expect.objectContaining({ championSlug: 'elise', count: 2 }),
    ]);
    expect(response.body.votes).toEqual([
      expect.objectContaining({
        poll_id: poll.id,
        voter_id: 'voter-1',
        champion_slug: 'elise',
      }),
      expect.objectContaining({
        poll_id: poll.id,
        voter_id: 'voter-2',
        champion_slug: 'elise',
      }),
    ]);
  });

  test('clears votes and emits empty summary', async () => {
    const poll = await createPoll('clear-votes');
    await request(context.app)
      .post(`/polls/${poll.id}/votes`)
      .send({ championSlug: 'udyr', voterId: 'voter-1' })
      .expect(201);

    const response = await request(context.app).delete(`/polls/${poll.id}/votes`);

    expect(response.status).toBe(204);
    expect(context.emitVoteSummary).toHaveBeenCalledWith(poll.id, {
      topVotes: [],
      totalVotes: 0,
    });

    const votesAfterClear = await request(context.app).get(`/polls/${poll.id}/votes`);
    expect(votesAfterClear.body.votes).toHaveLength(0);
    expect(votesAfterClear.body.totalVotes).toBe(0);
    expect(votesAfterClear.body.topVotes).toEqual([]);
  });
});
