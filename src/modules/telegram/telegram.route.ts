import express from 'express';
import TelegramService from './telegram.service';
const router = express.Router();

router.post('/send/', async (req, res) => {
  try {
    const { message, chat } = req.body;

    const sendResult = await TelegramService.sendMessage(message, chat);

    console.info(
      `sent message, to chat ${sendResult.chat.id} text: ${sendResult.text}`,
    );

    res.status(200).json({ status: 'sent' });
  } catch (error: any) {
    console.error(`TelegramController >> sendMessage :: ${error.message}`);
  }
})

export default router;
