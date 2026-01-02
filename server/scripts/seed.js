require('dotenv').config();

const mongoose = require('mongoose');
const Chance = require('chance');
const config = require('../src/config');
const { User, Conversation, Message, Passcode } = require('../src/models');

const chance = new Chance();

const SEED_CONFIG = {
  userCount: 5,
  messagesPerConversation: 10,
  defaultPasscode: '123456',
};

const clearDatabase = async () => {
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    Passcode.deleteMany({}),
  ]);
};

const createUsers = async (count) => {
  console.log(`Creating ${count} users...`);
  const users = [];

  for (let i = 0; i < count; i++) {
    const phoneNumber = `+1${chance.string({ length: 10, pool: '0123456789' })}`;
    const username = `user_${i}_${chance.word({ length: 5 })}`;

    await Passcode.setPasscode(phoneNumber, SEED_CONFIG.defaultPasscode);

    const user = new User({
      phoneNumber,
      username,
    });

    await user.save();
    users.push(user);

    console.log(`  Created: ${username} (${phoneNumber})`);
  }

  return users;
};

const createFriendships = async (users) => {
  console.log('Creating friendships...');

  for (const user of users) {
    const otherUsers = users.filter(u => !u._id.equals(user._id));
    const friendCount = Math.min(2, otherUsers.length);
    const friends = chance.pickset(otherUsers, friendCount);

    user.friends = friends.map(f => f._id);
    await user.save();

    console.log(`  ${user.username} is friends with: ${friends.map(f => f.username).join(', ')}`);
  }
};

const createConversationsAndMessages = async (users) => {
  console.log('Creating conversations and messages...');

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const userA = users[i];
      const userB = users[j];

      const conversation = await Conversation.findOrCreateDM(userA._id, userB._id);

      console.log(`  Conversation: ${userA.username} <-> ${userB.username}`);

      for (let k = 0; k < SEED_CONFIG.messagesPerConversation; k++) {
        const sender = k % 2 === 0 ? userA : userB;
        const text = chance.sentence({ words: chance.integer({ min: 3, max: 12 }) });

        const message = new Message({
          conversationId: conversation._id,
          senderId: sender._id,
          type: 'text',
          text,
        });

        await message.save();
      }

      const lastMessage = await Message.findOne({ conversationId: conversation._id })
        .sort({ createdAt: -1 });

      if (lastMessage) {
        await conversation.updateLastMessage(lastMessage);
      }

      console.log(`    Created ${SEED_CONFIG.messagesPerConversation} messages`);
    }
  }
};

const seed = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(config.mongo.uri, config.mongo.options);
    console.log('Connected to MongoDB');

    await clearDatabase();

    const users = await createUsers(SEED_CONFIG.userCount);
    await createFriendships(users);
    await createConversationsAndMessages(users);

    console.log('\nSeed completed successfully');
    console.log('\nTest credentials:');
    console.log(`  Passcode for all users: ${SEED_CONFIG.defaultPasscode}`);
    console.log('\nUsers created:');
    for (const user of users) {
      console.log(`  - ${user.username} (${user.phoneNumber})`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();