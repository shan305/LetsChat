const { User, Passcode } = require('../models');
const PresenceService = require('./PresenceService');

class UserService {

  /* =========================================================
   * REGISTRATION
   * ========================================================= */

  async register({ phoneNumber, username, passcode, avatar }) {
    const existingPhone = await User.findByPhone(phoneNumber);
    if (existingPhone) {
      throw new Error('Phone number already registered');
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      throw new Error('Username already taken');
    }

    await Passcode.setPasscode(phoneNumber, passcode);

    const user = new User({
      phoneNumber,
      username,
    });

    if (avatar && avatar.buffer) {
      const MediaService = require('./MediaService');

      const media = await MediaService.saveFile({
        buffer: avatar.buffer,
        mimetype: avatar.mimetype || 'image/png',
        originalname: avatar.originalname || 'avatar.png',
        ownerId: user._id,
        type: 'avatar',
      });

      user.avatarMediaId = media._id;
    }

    await user.save();

    return this.formatUser(user);
  }

  /* =========================================================
   * AUTHENTICATION
   * ========================================================= */

  async signIn({ phoneNumber, username, passcode }) {
    const verification = await Passcode.verify(phoneNumber, passcode);

    if (!verification.valid) {
      const messages = {
        not_found: 'Invalid phone number',
        locked: `Account locked. Try again after ${verification.until}`,
        expired: 'Passcode expired',
        invalid: 'Invalid passcode',
      };

      throw new Error(messages[verification.reason] || 'Authentication failed');
    }

    const user = await User.findOne({
      phoneNumber,
      username,
      deletedAt: null,
    });

    if (!user) {
      throw new Error('Invalid phone number or username');
    }

    return this.formatUser(user);
  }

  /* =========================================================
   * PROFILE
   * ========================================================= */

  async getProfile(userId) {
    const user = await User.findById(userId);

    if (!user || user.deletedAt) {
      throw new Error('User not found');
    }

    return this.formatUser(user);
  }

  async updateProfile(userId, updates) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const allowedFields = ['username'];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        user[field] = updates[field];
      }
    }

    if (updates.avatar && updates.avatar.buffer) {
      const MediaService = require('./MediaService');

      const media = await MediaService.saveFile({
        buffer: updates.avatar.buffer,
        mimetype: updates.avatar.mimetype || 'image/png',
        originalname: updates.avatar.originalname || 'avatar.png',
        ownerId: user._id,
        type: 'avatar',
      });

      user.avatarMediaId = media._id;
    }

    await user.save();

    return this.formatUser(user);
  }

  /* =========================================================
   * LOOKUPS
   * ========================================================= */

  async getByPhone(phoneNumber) {
    const user = await User.findByPhone(phoneNumber);
    if (!user) throw new Error('User not found');
    return this.formatUser(user);
  }

  async search(query, excludeUserId = null) {
    const users = await User.searchUsers(query, 20);

    const filtered = users.filter(
      u => !excludeUserId || u._id.toString() !== excludeUserId.toString()
    );

    const results = [];
    for (const u of filtered) {
      results.push(await this.formatUser(u));
    }

    return results;
  }

  /* =========================================================
   * FRIENDS
   * ========================================================= */

  async addFriend(userId, friendPhoneNumber) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const friend = await User.findByPhone(friendPhoneNumber);
    if (!friend) throw new Error('Friend not found');

    if (user._id.toString() === friend._id.toString()) {
      throw new Error('Cannot add yourself as friend');
    }

    const alreadyFriends = user.friends.some(
      f => f.toString() === friend._id.toString()
    );

    if (!alreadyFriends) {
      user.friends.push(friend._id);
      await user.save();
    }

    return this.formatUser(friend);
  }

  async removeFriend(userId, friendId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.friends = user.friends.filter(
      f => f.toString() !== friendId.toString()
    );

    await user.save();

    return { removed: true, friendId };
  }

  async getFriends(userId) {
    const user = await User.findById(userId).populate(
      'friends',
      'username phoneNumber avatarMediaId'
    );

    if (!user) throw new Error('User not found');

    const friendIds = user.friends.map(f => f._id.toString());
    const presenceMap = await PresenceService.getPresenceBatch(friendIds);

    const friends = [];

    for (const friend of user.friends) {
      const formatted = await this.formatUser(friend);
      const presence = presenceMap[friend._id.toString()];

      friends.push({
        ...formatted,
        isOnline: presence?.status === 'online',
        lastSeen: presence?.lastSeen || null,
      });
    }

    return friends;
  }

  async searchFriends(userId, searchTerm) {
    const user = await User.findById(userId).populate('friends');
    if (!user) throw new Error('User not found');

    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const results = [];

    for (const friend of user.friends) {
      if (regex.test(friend.username) || regex.test(friend.phoneNumber)) {
        results.push(await this.formatUser(friend));
      }
    }

    return results;
  }

  /* =========================================================
   * FORMATTER
   * ========================================================= */

  async formatUser(user) {
    const result = {
      id: user._id.toString(),
      _id: user._id.toString(),
      phoneNumber: user.phoneNumber,
      username: user.username,
      avatarMediaId: user.avatarMediaId,
      avatarData: null,
    };

    if (user.avatarMediaId) {
      try {
        const MediaService = require('./MediaService');
        result.avatarData = await MediaService.getFileBase64(user.avatarMediaId);
      } catch {
        // ignore missing avatar
      }
    }

    return result;
  }
}

module.exports = new UserService();
