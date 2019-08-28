//  __   __  ___        ___
// |__) /  \  |  |__/ |  |  
// |__) \__/  |  |  \ |  |  

// This is the main file for the Advbot bot.

// Import Botkit's core features
const { Botkit } = require('botkit');
const { BotkitCMSHelper } = require('botkit-plugin-cms');
const request = require('request');

// Import a platform-specific adapter for slack.

const { SlackAdapter, SlackMessageTypeMiddleware, SlackEventMiddleware } = require('botbuilder-adapter-slack');

const { MongoDbStorage } = require('botbuilder-storage-mongodb');

const responses = require('./scripts/responses');

const MessageController = require('./scripts/MessageController');

const Message = new MessageController();

// Load process.env values from .env file
require('dotenv').config();

let storage = null;
if (process.env.MONGO_URI) {
    storage = mongoStorage = new MongoDbStorage({
        url : process.env.MONGO_URI,
    });
}

const JsonDB = require('node-json-db').JsonDB;
const Config = require('node-json-db/dist/lib/JsonDBConfig').Config;
 
// The second argument is used to tell the DB to save after each push
// If you put false, you'll have to call the save() method.
// The third argument is to ask JsonDB to save the database in an human readable format. (default false)
// The last argument is the separator. By default it's slash (/)
var db = new JsonDB(new Config("adventures", true, false, '/'));
// db.push("/test3", {test:"test", json: {test:["test"]}});


const adapter = new SlackAdapter({
    // REMOVE THIS OPTION AFTER YOU HAVE CONFIGURED YOUR APP!
    enable_incomplete: true,

    // parameters used to secure webhook endpoint
    verificationToken: process.env.verificationToken,
    clientSigningSecret: process.env.clientSigningSecret,  

    // auth token for a single-team app
    botToken: process.env.botToken,

    // credentials used to set up oauth for multi-team apps
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    scopes: ['bot'], 
    redirectUri: process.env.redirectUri,
 
    // functions required for retrieving team-specific info
    // for use in multi-team apps
    getTokenForTeam: getTokenForTeam,
    getBotUserByTeam: getBotUserByTeam,
});

// Use SlackEventMiddleware to emit events that match their original Slack event types.
adapter.use(new SlackEventMiddleware());

// Use SlackMessageType middleware to further classify messages as direct_message, direct_mention, or mention
adapter.use(new SlackMessageTypeMiddleware());


const controller = new Botkit({
    webhook_uri: '/api/messages',

    adapter: adapter,

    storage
});

controller.webserver.get('/', (req, res) => {

    res.send(`This app is running Botkit ${ controller.version }.`);

});


controller.webserver.get('/install', (req, res) => {
    // getInstallLink points to slack's oauth endpoint and includes clientId and scopes
    res.redirect(controller.adapter.getInstallLink());
});

controller.webserver.get('/install/auth', async (req, res) => {
    try {
        const results = await controller.adapter.validateOauthCode(req.query.code);

        console.log('FULL OAUTH DETAILS', results);

        // Store token by team in bot state.
        tokenCache[results.team_id] = results.bot.bot_access_token;

        // Capture team to bot id
        userCache[results.team_id] =  results.bot.bot_user_id;

        res.json('Success! Bot installed.');

    } catch (err) {
        console.error('OAUTH ERROR:', err);
        res.status(401);
        res.send(err.message);
    }
});

let tokenCache = {};
let userCache = {};

if (process.env.TOKENS) {
    tokenCache = JSON.parse(process.env.TOKENS);
} 

if (process.env.USERS) {
    userCache = JSON.parse(process.env.USERS);
} 

async function getTokenForTeam(teamId) {
    if (tokenCache[teamId]) {
        return new Promise((resolve) => {
            setTimeout(function() {
                resolve(tokenCache[teamId]);
            }, 150);
        });
    } else {
        console.error('Team not found in tokenCache: ', teamId);
    }
}

async function getBotUserByTeam(teamId) {
    if (userCache[teamId]) {
        return new Promise((resolve) => {
            setTimeout(function() {
                resolve(userCache[teamId]);
            }, 150);
        });
    } else {
        console.error('Team not found in userCache: ', teamId);
    }
}

const admins = ['sferrari']

// Move this into its own file
Message.on('^help$', '', (req, res, headers) => {
    var options = {
        uri: "https://slack.com/api/chat.postMessage",
        method: 'POST',
        headers: headers,
        json: true,
        body: {
          text:
          `To use Adventure bot\nadd - Add a place to adventure list\nlist - List all current suggestions for adventure`,
          channel: req.body.event.channel
        }
      }
    request(options, function (error, response, body) {
    console.log('error:', error); // Print the error if one occurred
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the HTML for the Google homepage.
    })

    res.sendStatus(200);
})

const getWeekOf = () => {
    var curr = new Date; // get current date
    var first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
    var last = first + 6; // last day is the first day + 6

    var firstdate = new Date(curr.setDate(first))
    return `${firstdate.getMonth() + 1}-${first}-${firstdate.getFullYear()}`
}

Message.on('^add (.+)', '', (req, res, headers) => {
    console.log(req.messageRegex[1])
    const spot = req.messageRegex[1];
    // week of? 
    const weekPath = getWeekOf()
    db.push(`/${weekPath}/spots`, [spot], false)
    db.save()
    // console.log(db.getData(`/${weekPath}/spots`))
    var options = {
        uri: "https://slack.com/api/chat.postMessage",
        method: 'POST',
        headers: headers,
        json: true,
        body: {
          text: `${spot}, added to Adventure Friday ${weekPath}`,
          channel: req.body.event.channel
        }
      }
      request(options, function (error, response, body) {
      console.log('error:', error); // Print the error if one occurred
      console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
      console.log('body:', body); // Print the HTML for the Google homepage.
      })
    res.sendStatus(200)
})

Message.on('^delete (.+)', '', (req, res, headers) => {
    const spotToDelete = req.messageRegex[1];
    const weekPath = getWeekOf()
    const spots = db.getData(`/${weekPath}/spots`)
    const newSpots = spots.filter(spot => spot !== spotToDelete)
    if (spots.length !== newSpots.length) {
      db.push(`/${weekPath}/spots`, newSpots, true)
      var options = {
        uri: "https://slack.com/api/chat.postMessage",
        method: 'POST',
        headers: headers,
        json: true,
        body: {
          text: `${spotToDelete}, successfully deleted`,
          channel: req.body.event.channel
        }
      }
      request(options, function (error, response, body) {
      console.log('error:', error); // Print the error if one occurred
      console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
      console.log('body:', body); // Print the HTML for the Google homepage.
      })
    }
    res.sendStatus(200);
})

Message.on('^ping$', '', (req, res, headers) => {
  var options = {
    uri: "https://slack.com/api/chat.postMessage",
    method: 'POST',
    headers: headers,
    json: true,
    body: {
      text: `pong`,
      channel: req.body.event.channel
    }
  }
  request(options, function (error, response, body) {
  console.log('error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  console.log('body:', body); // Print the HTML for the Google homepage.
  })
  res.sendStatus(200)
})

Message.on('^list$', '', (req, res, headers) => {
    console.log('List')
    let spotData = []
    try {
        spotData = db.getData(`/${getWeekOf()}/spots`)
    } catch (e) {
        var options = {
            uri: "https://slack.com/api/chat.postMessage",
            method: 'POST',
            headers: headers,
            json: true,
            body: {
              text: `No spots for this Adventure Friday`,
              channel: req.body.event.channel
            }
          }
        request(options, function (error, response, body) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
        })
        res.sendStatus(200);
        return;
    }
    spotData = spotData.map(spot => {
        return `<https://www.google.com/maps?q=${spot}+bosston+ma|${spot}>`
    });
    var options = {
        uri: "https://slack.com/api/chat.postMessage",
        method: 'POST',
        headers: headers,
        json: true,
        body: {
          text: `Here are all the spot suggestions for this week\n${spotData.length > 0 ? spotData.join('\r\n') : 'None'}`,
          channel: req.body.event.channel
        }
      }
    request(options, function (error, response, body) {
    console.log('error:', error); // Print the error if one occurred
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the HTML for the Google homepage.
    })

    res.sendStatus(200);
})

controller.webserver.post('/event', (req, res) => {
    if (req.body.challenge) {
        console.log('Accepting challenge');
        res.send(req.body.challenge)
    }

    // Verification token
    if (req.body.token == process.env.signingToken) {
        console.log('Verified');
    }

    if (req.body.event && req.body.event.subtype === 'bot_message' ) {
        console.log('Bot Message')
        return;
    }

    if (req.body.event && req.body.event.type !== 'app_mention') {
        console.log('App Mention')
        return;
    }

    const botToken = tokenCache[req.body.team_id]
    var headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + botToken
      }
    
    // Can move this to a function on the controller
    Object.keys(Message.responses).forEach(response => {
        const resRegex = new RegExp(`${response}`)
        const text = req.body.event.text.replace('<@U84T9NXT5> ', '') // Figure out how to get bots id
        console.log(response)
        console.log(resRegex.exec(text))
        if (resRegex.exec(text) !== null) {
            console.log('matched');
            req.messageRegex = resRegex.exec(text)
            Message.responses[response](req, res, headers);
        }
        console.log('didn\'t match');
    })
});

controller.webserver.post('/slack/receive', (req, res) => {
    console.log(req.body)
    console.log(tokenCache)
    console.log(userCache)
});

controller.webserver.post('/slack/options', (req, res) => {
    console.log(req.body)
    console.log(tokenCache)
    console.log(userCache)
});