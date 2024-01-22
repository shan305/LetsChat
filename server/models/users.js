const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    message: {
        type: String,
        required: false,
    },
    media: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
});

const mediaSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    content: {
        type: Buffer,
    },
    contentType: {
        type: String,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'recorded_video', 'audio_clip'],
        default: 'text',
    },
    media: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
    },
});

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    avatar: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    chatMessages: [chatMessageSchema],
});

const passcodeSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    passcode: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
});

const User = mongoose.model('User', userSchema);
const Media = mongoose.model('Media', mediaSchema);
const Passcode = mongoose.model('Passcode', passcodeSchema);

module.exports = { User, Media, Passcode };