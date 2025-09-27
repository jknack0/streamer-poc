const { Router } = require('express');

const createPollRouter = (controller) => {
  const router = Router();

  router.post('/', controller.createPoll);
  router.get('/:id', controller.getPoll);
  router.post('/:id/status', controller.updatePollStatus);
  router.post('/:id/votes', controller.recordVote);
  router.get('/:id/votes', controller.listVotes);
  router.delete('/:id/votes', controller.clearVotes);

  return router;
};

module.exports = { createPollRouter };
