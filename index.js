/**
 * Copyright 2017-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
// Imports dependencies and set up http server
const   request = require('request');

var _axios = require('axios');

var _https = require('https');
const bodyParser = require('body-parser'),
      express = require('express');
  var app = express();
var _https2 = _interopRequireDefault(_https);

var _axios2 = _interopRequireDefault(_axios);
_axios2.default.defaults.timeout = 6000;

_axios2.default.interceptors.request.use(function (config) {
    config.requestTime = new Date().getTime();
    return config;
}, function (err) {
    return Promise.reject(err);
});

_axios2.default.interceptors.response.use(function (res) {
   // logger.logService({}, res.config, res, res.request.connection);
    return res;
}, function (err) {
    //logger.logService(err, err.config, {}, err.request.connection);
    return Promise.reject(err);
});

// import helper libs
const sendQuickReply = require('./utils/quick-reply'),
      HandoverProtocol = require('./utils/handover-protocol');



app.set('port', process.env.PORT || 5000);
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('public'));

app.listen(app.get('port'), () => {
    console.log('Node app is running on port', app.get('port'));
});

 module.exports = app;
// webhook verification

app.get('/webhook', (req, res) => {
      console.log('webhook');
  if (req.query['hub.verify_token'] === "webhookAunjai1") {
    res.status(200).send(req.query['hub.challenge']);
  }
});

// webhook
app.post('/webhook', (req, res) => {

  // parse messaging array
  const webhook_events = req.body.entry[0];

  // initialize quick reply properties
  let text, title, payload;
   console.log('webhook_events.standby:'+webhook_events.standby);
  // Secondary Receiver is in control - listen on standby channel
  if (webhook_events.standby) {
    
    // iterate webhook events from standby channel
    webhook_events.standby.forEach(event => {
    
      const psid = event.sender.id;
      const message = event.message;
      console.log(message);
      if (message && message.quick_reply && message.quick_reply.payload == 'take_from_inbox') {
        // quick reply to take from Page inbox was clicked          
        text = 'The Primary Receiver is taking control back. \n\n Tap "Pass to Inbox" to pass thread control to the Page Inbox.';
        title = 'Pass to Inbox';
        payload = 'pass_to_inbox';
        
        sendQuickReply(psid, text, title, payload);
        HandoverProtocol.takeThreadControl(psid);
      }

    });   
  }
   console.log('webhook_events.messaging:'+webhook_events.messaging);
  // Bot is in control - listen for messages 
  if (webhook_events.messaging) {
   
    // iterate webhook events
    webhook_events.messaging.forEach(event => {      
      // parse sender PSID and message
      const psid = event.sender.id;
      const message = event.message;
      console.log(message + ' pass_to_inbox');
      if (message && message.quick_reply && message.quick_reply.payload == 'pass_to_inbox') {
        
        // quick reply to pass to Page inbox was clicked
        let page_inbox_app_id = 263902037430900;          
        text = 'The Primary Receiver is passing control to the Page Inbox. \n\n Tap "Take From Inbox" to have the Primary Receiver take control back.';
        title = 'Take From Inbox';
        payload = 'take_from_inbox';
        
        sendQuickReply(psid, text, title, payload);
        HandoverProtocol.passThreadControl(psid, page_inbox_app_id);
        
      } else if (event.pass_thread_control) {
         console.log(message + ' pass_thread_control');
        // thread control was passed back to bot manually in Page inbox
        text = 'You passed control back to the Primary Receiver by marking "Done" in the Page Inbox. \n\n Tap "Pass to Inbox" to pass control to the Page Inbox.';
        title = 'Pass to Inbox';
        payload = 'pass_to_inbox';
        
        sendQuickReply(psid, text, title, payload);

      } else if (message && !message.is_echo) {      
         console.log(message + ' is_echo');
        // default
        text = 'Welcome! The bot is currently in control. \n\n Tap "Pass to Inbox" to pass control to the Page Inbox.';
        title = 'Pass to Inbox';
        payload = 'pass_to_inbox';

        sendQuickReply(psid, text, title, payload);
      }
      
    });
  }

  // respond to all webhook events with 200 OK
  res.sendStatus(200);
});
