// models/verificationCode.js
const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
    phoneNumber: String,
    code: Number,
});

const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);

module.exports = VerificationCode;