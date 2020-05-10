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

module.exports = MessageController;