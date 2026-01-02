// src/services/CallService.js
// Call handling - initiate, answer, reject, hangup

const { User } = require('../models');
const PresenceService = require('./PresenceService');
const { publish } = require('../config/rabbitmq');
const config = require('../config');

class CallService {
  
  // Initiate a call
  async initiateCall(callerId, receiverPhone) {
    const [caller, receiver] = await Promise.all([
      User.findById(callerId),
      User.findByPhone(receiverPhone),
    ]);
    
    if (!caller) {
      throw new Error('Caller not found');
    }
    
    if (!receiver) {
      throw new Error('Receiver not found');
    }
    
    // Check if receiver is online
    const isOnline = await PresenceService.isOnline(receiver._id.toString());
    if (!isOnline) {
      throw new Error('User is not online');
    }
    
    // Get receiver's socket IDs for emission
    const receiverSockets = await PresenceService.getUserSockets(receiver._id.toString());
    
    const callData = {
      callId: `call_${Date.now()}_${callerId}`,
      caller: {
        id: caller._id,
        username: caller.username,
        phoneNumber: caller.phoneNumber,
      },
      receiver: {
        id: receiver._id,
        username: receiver.username,
        phoneNumber: receiver.phoneNumber,
      },
      initiatedAt: new Date(),
      status: 'ringing',
    };
    
    // Publish call event (for analytics)
    this.publishEvent('call.initiated', callData)
      .catch(err => console.error('Failed to publish call event:', err));
    
    return {
      callData,
      receiverSockets,
    };
  }
  
  // Answer call
  async answerCall(callId, answererId, callerPhone) {
    const [answerer, caller] = await Promise.all([
      User.findById(answererId),
      User.findByPhone(callerPhone),
    ]);
    
    if (!answerer || !caller) {
      throw new Error('Invalid users for call');
    }
    
    const callerSockets = await PresenceService.getUserSockets(caller._id.toString());
    
    const callData = {
      callId,
      caller: {
        id: caller._id,
        username: caller.username,
        phoneNumber: caller.phoneNumber,
      },
      answerer: {
        id: answerer._id,
        username: answerer.username,
        phoneNumber: answerer.phoneNumber,
      },
      answeredAt: new Date(),
      status: 'connected',
    };
    
    this.publishEvent('call.answered', callData)
      .catch(err => console.error('Failed to publish call event:', err));
    
    return {
      callData,
      callerSockets,
    };
  }
  
  // Reject call
  async rejectCall(callId, rejecterId, callerPhone) {
    const [rejecter, caller] = await Promise.all([
      User.findById(rejecterId),
      User.findByPhone(callerPhone),
    ]);
    
    if (!rejecter || !caller) {
      throw new Error('Invalid users for call');
    }
    
    const callerSockets = await PresenceService.getUserSockets(caller._id.toString());
    
    const callData = {
      callId,
      caller: {
        id: caller._id,
        username: caller.username,
        phoneNumber: caller.phoneNumber,
      },
      rejecter: {
        id: rejecter._id,
        username: rejecter.username,
        phoneNumber: rejecter.phoneNumber,
      },
      rejectedAt: new Date(),
      status: 'rejected',
    };
    
    this.publishEvent('call.rejected', callData)
      .catch(err => console.error('Failed to publish call event:', err));
    
    return {
      callData,
      callerSockets,
    };
  }
  
  // Hang up call
  async hangUp(callId, userId, otherUserPhone) {
    const [user, otherUser] = await Promise.all([
      User.findById(userId),
      User.findByPhone(otherUserPhone),
    ]);
    
    if (!user || !otherUser) {
      throw new Error('Invalid users for call');
    }
    
    const otherUserSockets = await PresenceService.getUserSockets(otherUser._id.toString());
    
    const callData = {
      callId,
      endedBy: {
        id: user._id,
        username: user.username,
      },
      otherUser: {
        id: otherUser._id,
        username: otherUser.username,
      },
      endedAt: new Date(),
      status: 'ended',
    };
    
    this.publishEvent('call.ended', callData)
      .catch(err => console.error('Failed to publish call event:', err));
    
    return {
      callData,
      otherUserSockets,
    };
  }
  
  // Publish event to RabbitMQ
  async publishEvent(routingKey, data) {
    try {
      await publish(config.rabbitmq.exchanges.calls, routingKey, data);
    } catch (error) {
      console.error(`[CallService] Failed to publish ${routingKey}:`, error.message);
    }
  }
}

module.exports = new CallService();