'use strict'

class MessageController {
  constructor() {
    this.responses = {}
  }

  on(pattern, source, callback) {
    pattern = String(pattern);
    this.responses[pattern] = callback;
  }
}

// controller = new ResponseController()
// controller.on('/\w/i', '', function () {
//   console.log('here');
// })

// console.log(controller.responses)

module.exports = MessageController;