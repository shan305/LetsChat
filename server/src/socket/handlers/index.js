const { registerUserHandlers } = require('./userHandler');
const { registerChatHandlers } = require('./chatHandler');
const { registerCallHandlers } = require('./callHandler');

module.exports = {
  registerUserHandlers,
  registerChatHandlers,
  registerCallHandlers,
};