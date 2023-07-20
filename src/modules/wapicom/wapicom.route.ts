import express from 'express';
import WapicomController from './wapicom.controller';
const router = express.Router();

router.get('/send/', async (req, res) => {
  const sendResult = await WapicomController.sendAllOrders();
  res.status(200).json({ status: 'sent' });
})

export default router;
