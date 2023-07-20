process.env['NODE_CONFIG_DIR'] = __dirname + '/configs';

// CRON setup
import cron from 'node-cron';

// moment setup and locale
import 'moment/locale/ru';

// Database setup
import { Client } from './database/client';

// Express setup
import express, { Application } from 'express';
const port = process.env.PORT || 3000;

// Socket.io setup
import { createServer } from "http";
const app: Application = express();
const server = createServer(app);

// Express body-parser for POST requests
app.use(express.json());

// CORS-enabling headers
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  next();
});

// Imports
import SmspController from './modules/smsp/smsp.controller';
import YousendController from './modules/yousend/yousend.controller';
import WapicomController from './modules/wapicom/wapicom.controller';

import TelegramService from './modules/telegram/telegram.service';

// Define route controllers
import smspRouter from './modules/smsp/smsp.route';
import wapicomRouter from './modules/wapicom/wapicom.route'
import telegramRouter from './modules/telegram/telegram.route'

// Use route controllers
app.use('/viber', smspRouter);
app.use('/telegram', telegramRouter);
app.use('/wapicom', wapicomRouter);

// Send all delayed messages to viber
cron.schedule('*/15 * * * *', async () => {
  await SmspController.sendDelayedMessagesToViber();
}, {timezone: "Europe/Moscow"});

// Update message statuses for orders
cron.schedule('*/10 * * * *', async () => {
  await SmspController.getStatusesFromSmspAndUpdateInOrders();
}, {timezone: "Europe/Moscow"});

// Send orders to yousend at mon,tue,wed,thu 12:15
cron.schedule('15 12 * * 1,2,3,4,5', async () => {
  await YousendController.sendAllOrdersToYousend(1);
}, {timezone: "Europe/Moscow"});

// Send orders to yousend at mon,tue,wed,thu 13:15
cron.schedule('15 13 * * 1,2,3,4,5', async () => {
  await YousendController.sendAllOrdersToYousend(1);
}, {timezone: "Europe/Moscow"});

// get tracking statuses for orders from WAPI
cron.schedule('0 */1 * * *', async () => {
  await WapicomController.getAndChangeTrackingStatuses();
}, {timezone: "Europe/Moscow"});

// server.listen
server.listen(port, async () => {
  try {
    console.log(`=================================`);
    console.log(`======= ENV: ${process.env.NODE_ENV || 'development'} =======`);
    console.log(`🚀 App listening on the port ${port}`);
    console.log(`=================================`);
    await Client.connect();
    console.log('connected to database');

    TelegramService.startTelegramBot();

  } catch (e) {
    console.error(e);
  }
});
