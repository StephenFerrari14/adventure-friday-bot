/**
 * Write function
 * Add regex pattern as key and function as value
 */

const request = require('request')

const help = (req, res, headers) => {
  var options = {
    uri: "https://slack.com/api/chat.postMessage",
    method: 'POST',
    headers: headers,
    json: true,
    body: {
      text:
      "To use Adventure bot\nAdd - \nList -",
      channel: req.body.event.channel
    }
  }
  request(options, function (error, response, body) {
    console.log('error:', error); // Print the error if one occurred
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the HTML for the Google homepage.
  })

  res.sendStatus(200);
};

module.exports = {
  'help': help
}