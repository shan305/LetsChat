const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../../models');
const { PresenceService } = require('../../services');
const { createLogger } = require('../../utils/logger');
const config = require('../../config');

const logger = createLogger('UserHandler');

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const generateToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      userId: user._id.toString(),
      phoneNumber: user.phoneNumber,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn || '7d' }
  );

const verifyPasscode = async (user, passcode) => {
  if (user.verifyPasscode) return user.verifyPasscode(passcode);
  if (user.comparePasscode) return user.comparePasscode(passcode);
  if (user.passcode?.startsWith('$2')) return bcrypt.compare(passcode, user.passcode);
  return user.passcode === passcode;
};

const requireAuth = (socket, event) => {
  if (!socket.userId) {
    socket.emit(`${event}Error`, 'Not authenticated');
    return false;
  }
  return true;
};

const enrichFriendsWithStatus = async (friends) =>
  Promise.all(
    friends.map(async (friend) => ({
      _id: friend._id,
      phoneNumber: friend.phoneNumber,
      username: friend.username,
      avatarMediaId: friend.avatarMediaId,
      isOnline: await PresenceService.isOnline(friend._id.toString()),
    }))
  );

/* ------------------------------------------------------------------ */
/* Handlers                                                           */
/* ------------------------------------------------------------------ */

const registerUserHandlers = (io, socket) => {

 
socket.on('register', async (data) => {
  try {
    const { phoneNumber, username, passcode, avatar } = data;
const bcrypt = require('bcryptjs');

    if (!phoneNumber || !username || !passcode) {
      socket.emit('registrationError', 'All fields are required');
      return;
    }

    const existing = await User.findByPhone(phoneNumber);
    if (existing) {
      socket.emit('registrationError', 'Phone number already registered');
      return;
    }

    const hash = await bcrypt.hash(passcode, 10);

    const user = new User({
      phoneNumber,
      username,
        passcodeHash: hash,
    });

    if (avatar?.buffer) {
      const MediaService = require('../../services/MediaService');
      const media = await MediaService.saveFile({
        buffer: Buffer.from(avatar.buffer),
        mimetype: avatar.mimetype,
        originalname: avatar.originalname,
        ownerId: user._id,
        type: 'avatar',
      });
      user.avatarMediaId = media._id;
    }

    await user.save();

    socket.emit('registrationSuccess', {
      user: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        username: user.username,
        avatarMediaId: user.avatarMediaId,
      },
    });

  } catch (err) {
    console.error(err);
    socket.emit('registrationError', err.message);
  }
});

 
    /* ---------------------------- SIGN IN ---------------------------- */

socket.on('signIn', async (data) => {
  try {
    const { phoneNumber, username, passcode } = data;

    if (!phoneNumber || !username || !passcode) {
      socket.emit('signInError', 'All fields are required');
      return;
    }

  const user = await User
  .findOne({ phoneNumber, deletedAt: null })
  .select('+passcodeHash');

 if (!user) {
  return socket.emit('signInError', 'Invalid credentials');
}

const valid = await bcrypt.compare(passcode, user.passcodeHash);

if (!valid) {
  return socket.emit('signInError', 'Invalid credentials');
}

    socket.emit('signInSuccess', {
      user: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        username: user.username,
        avatarMediaId: user.avatarMediaId,
      },
    });

  } catch (error) {
    console.error('[signIn]', error);
    socket.emit('signInError', 'Sign in failed');
  }
});


  /* ---------------------------- SIGN OUT ---------------------------- */

  socket.on('signOut', async () => {
    try {
      if (socket.userId) {
        const result = await PresenceService.setOffline(socket.id);
        if (result?.status === 'offline') {
          io.emit('userOffline', { userId: socket.userId, phoneNumber: socket.phoneNumber });
        }
        socket.leave(`user:${socket.userId}`);
        socket.leave(`phone:${socket.phoneNumber}`);
        socket.userId = null;
        socket.phoneNumber = null;
      }
      socket.emit('signOutSuccess');
    } catch (err) {
      socket.emit('signOutError', err.message);
    }
  });

  /* ------------------------- UPDATE PROFILE ------------------------- */

  socket.on('updateProfile', async ({ username, avatarMediaId }) => {
    if (!requireAuth(socket, 'updateProfile')) return;

    try {
      const user = await User.findById(socket.userId);
      if (!user) {
        socket.emit('updateProfileError', 'User not found');
        return;
      }

      if (username) user.username = username;
      if (avatarMediaId !== undefined) user.avatarMediaId = avatarMediaId;
      await user.save();

      socket.emit('updateProfileSuccess', {
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          username: user.username,
          avatarMediaId: user.avatarMediaId,
        },
      });

    } catch (err) {
      socket.emit('updateProfileError', err.message);
    }
  });

  /* --------------------------- ADD FRIEND --------------------------- */

  socket.on('addFriend', async ({ friendPhone }) => {
    if (!requireAuth(socket, 'addFriend')) return;

    try {
      const user = await User.findById(socket.userId);
      const friend = await User.findByPhone(friendPhone);

      if (!friend) {
        socket.emit('addFriendError', 'User not found');
        return;
      }

      if (friend._id.equals(user._id)) {
        socket.emit('addFriendError', 'Cannot add yourself');
        return;
      }

      if (user.friends?.includes(friend._id)) {
        socket.emit('addFriendError', 'Already friends');
        return;
      }

      user.friends.push(friend._id);
      friend.friends.push(user._id);
      await Promise.all([user.save(), friend.save()]);

      socket.emit('addFriendSuccess', {
        friend: {
          _id: friend._id,
          phoneNumber: friend.phoneNumber,
          username: friend.username,
          avatarMediaId: friend.avatarMediaId,
          isOnline: await PresenceService.isOnline(friend._id.toString()),
        },
      });

      io.to(`user:${friend._id}`).emit('friendAdded', {
        friend: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          username: user.username,
          avatarMediaId: user.avatarMediaId,
          isOnline: await PresenceService.isOnline(user._id.toString()),
        },
      });

    } catch (err) {
      socket.emit('addFriendError', err.message);
    }
  });

  /* -------------------------- REMOVE FRIEND ------------------------- */

  socket.on('removeFriend', async ({ friendId }) => {
    if (!requireAuth(socket, 'removeFriend')) return;

    try {
      const user = await User.findById(socket.userId);
      const friend = await User.findById(friendId);

      if (!friend) {
        socket.emit('removeFriendError', 'Friend not found');
        return;
      }

      user.friends = user.friends.filter(f => f.toString() !== friendId);
      friend.friends = friend.friends.filter(f => f.toString() !== socket.userId);
      await Promise.all([user.save(), friend.save()]);

      socket.emit('removeFriendSuccess', { friendId });
      io.to(`user:${friendId}`).emit('friendRemoved', { friendId: socket.userId });

    } catch (err) {
      socket.emit('removeFriendError', err.message);
    }
  });

  /* --------------------------- GET FRIENDS -------------------------- */

  socket.on('getFriends', async () => {
    if (!requireAuth(socket, 'getFriends')) return;

    try {
      const user = await User.findById(socket.userId).populate(
        'friends',
        '_id phoneNumber username avatarMediaId'
      );

      socket.emit('getFriendsSuccess', {
        friends: await enrichFriendsWithStatus(user.friends || []),
      });

    } catch (err) {
      socket.emit('getFriendsError', err.message);
    }
  });

  /* ---------------------------- HEARTBEAT --------------------------- */

  socket.on('heartbeat', () => {
    if (socket.userId) {
      PresenceService.setOnline(socket.userId, socket.id).catch(() => {});
    }
  });

};

module.exports = { registerUserHandlers };
