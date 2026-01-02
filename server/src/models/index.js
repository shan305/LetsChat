// src/models/index.js
// Central export for all models

const User = require('./User');
const Conversation = require('./Conversation');
const Message = require('./Message');
const Media = require('./Media');
const ReadState = require('./ReadState');
const Passcode = require('./Passcode');

module.exports = {
  User,
  Conversation,
  Message,
  Media,
  ReadState,
  Passcode,
};