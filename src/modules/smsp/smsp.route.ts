import express, { Request, Response } from 'express';
import SmspController from './smsp.controller';
const router = express.Router();

router.post('/send/:id', async (req, res) => {
  const sendToViberStatus = await SmspController.sendMessageToViber(req.body);

  res.send(sendToViberStatus);
});

export default router;