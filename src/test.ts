import path from 'path';
import dotenv from 'dotenv';
dotenv.config({
  path: path.resolve('.env'),
});

import moment from "moment";
import { Client } from './database/client';
import axios from 'axios';
import _ from 'lodash';
import { ViberService } from './modules/viber/viber.service';
import { ViberController } from './modules/viber/viber.controller';
import { Api } from './api/api';
import { Filters } from './api/filters';
import YousendController from './modules/yousend/yousend.controller';
import YousendService from './modules/yousend/yousend.service';
import WapicomService from './modules/wapicom/wapicom.service';
import WapicomController from './modules/wapicom/wapicom.controller';
import { SmspService } from './modules/smsp/smsp.service';
import { sleep } from './helpers/ArrayHelpers';
import SmspController from './modules/smsp/smsp.controller';


(async function run_test() {

  try {
    await Client.connect();
    console.log('connected to database');

    // const viberResponse = await SmspService.sendMessageToViber('375336431205', 'test', '123');
    // console.log(viberResponse);
    // const messages = await SmspService.getAllMessagesWithErrorFromDatabase();
    // console.log(messages);

    // await SmspController.sendDelayedMessagesToViber();
    // const messageItems = await SmspService.getAllSentMessagesFromDatabase();
    // const messageStatuses = await SmspService.getAllMessagesStatusFromSmsp(messageItems);
    // await SmspService.updateAllOrdersWithMessageStatus(messageStatuses);

    // console.log(await ViberController.getMessagesStatusFromViberAndUpdateOrders());

    await YousendController.sendAllOrdersToYousend(1);

    // await WapicomController.getAndChangeTrackingStatuses();

    // const orders = await WapicomService.getOrdersFromCrmInStatus();
    // await WapicomService.sendOrdersToWapicomAndChangeStatusInCrm(orders);

  } catch (e: any) {
    console.error(e.message);
  }

})()