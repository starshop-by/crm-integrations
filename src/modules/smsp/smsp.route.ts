import express, { Request, Response } from 'express';
import SmspController from './smsp.controller';
const router = express.Router();

router.post('/send/:id', async (req, res) => {
  const { id, site, tel, message, prevMessagesStatus } = req.body;

  const sendToViberStatus = await SmspController.sendMessageToViber(tel, message, id, site, prevMessagesStatus);

  res.send(sendToViberStatus);
});

export default router;