//chatController.js

const VerificationCode = require('../models/verificationCode');
const { User, Media } = require('../models/users');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });


async function handleChatMessage(io, socket, { sender, receiver, message, messageType, mediaFile }) {
    try {
        // Find sender and receiver by phoneNumber
        const senderUser = await User.findOne({ phoneNumber: sender });
        const receiverUser = await User.findOne({ phoneNumber: receiver });

        if (!senderUser || !receiverUser) {
            // Emit an error if either sender or receiver is not found
            socket.emit('chatMessageError', 'Sender or receiver not found');
            return;
        }

        // Create a new chat message
        const newChatMessage = {
            sender: senderUser._id,
            receiver: receiverUser._id,
            message,
            messageType,
        };

        // If it's a media message, handle the media file
        if (messageType === 'image' && mediaFile) {
            try {
                const newMedia = new Media({
                    user: senderUser._id,
                    content: mediaFile.buffer,
                    contentType: mediaFile.mimetype,
                    messageType: 'image',
                });

                await newMedia.save();
                newChatMessage.media = newMedia._id;

                // Save the chat message to the sender and receiver's chatMessages array
                senderUser.chatMessages.push(newChatMessage);
                receiverUser.chatMessages.push(newChatMessage);

                // Save changes to the database
                await senderUser.save();
                await receiverUser.save();

                // Emit success event
                socket.emit('chatMessageSuccess', newChatMessage);
            } catch (error) {
                console.error('Error saving media:', error.message);
                socket.emit('chatMessageError', 'Error saving media');
            }
        } else if (messageType === 'video' && mediaFile) {
            try {
                const newMedia = new Media({
                    user: senderUser._id,
                    content: mediaFile.buffer,
                    contentType: mediaFile.mimetype,
                    messageType: 'video',
                });

                await newMedia.save();
                newChatMessage.media = newMedia._id;

                //... existing code for saving chat message

            } catch (error) {
                console.error('Error saving video:', error.message);
                socket.emit('chatMessageError', 'Error saving video');
            }
        } else if (messageType === 'audio' && mediaFile) {
            try {
                const newMedia = new Media({
                    user: senderUser._id,
                    content: mediaFile.buffer,
                    contentType: mediaFile.mimetype,
                    messageType: 'audio',
                });

                await newMedia.save();
                newChatMessage.media = newMedia._id;

                //... existing code for saving chat message

            } catch (error) {
                console.error('Error saving audio:', error.message);
                socket.emit('chatMessageError', 'Error saving audio');
            }
        } else if (messageType === 'recorded_video' && mediaFile) {
            try {
                const newMedia = new Media({
                    user: senderUser._id,
                    content: mediaFile.buffer,
                    contentType: mediaFile.mimetype,
                    messageType: 'recorded_video',
                });

                await newMedia.save();
                newChatMessage.media = newMedia._id;

                //... existing code for saving chat message

            } catch (error) {
                console.error('Error saving recorded video:', error.message);
                socket.emit('chatMessageError', 'Error saving recorded video');
            }
        } else if (messageType === 'audio_clip' && mediaFile) {
            try {
                const newMedia = new Media({
                    user: senderUser._id,
                    content: mediaFile.buffer,
                    contentType: mediaFile.mimetype,
                    messageType: 'audio_clip',
                });

                await newMedia.save();
                newChatMessage.media = newMedia._id;

                //... existing code for saving chat message

            } catch (error) {
                console.error('Error saving audio clip:', error.message);
                socket.emit('chatMessageError', 'Error saving audio clip');
            }
        } else {
            // Handle text message
            // Save the chat message to the sender and receiver's chatMessages array
            senderUser.chatMessages.push(newChatMessage);
            receiverUser.chatMessages.push(newChatMessage);

            // Save changes to the database
            await senderUser.save();
            await receiverUser.save();

            // Emit success event
            socket.emit('chatMessageSuccess', newChatMessage);
            io.to(receiverUser._id).emit('newMessage', newChatMessage);

            // Add a notification event for the receiver
            io.to(receiverUser._id).emit('newNotification', {
                type: 'message',
                sender: senderUser.username,
                message: 'You have a new message!',
            });
        }
    } catch (error) {
        console.error('Error during chat message:', error.message);
        socket.emit('chatMessageError', 'Error during chat message');
    }
}




async function handleGetChatMessages(io, socket, userPhoneNumber, friendPhoneNumber) {
    try {

        const user = await User.findOne({ phoneNumber: userPhoneNumber });

        if (user) {
            const friend = await User.findOne({ phoneNumber: friendPhoneNumber });

            if (friend) {
                const chatMessages = [];

                for (const message of user.chatMessages) {
                    const isUserSender = message.sender.toString() === user._id.toString();
                    const isFriendSender = message.sender.toString() === friend._id.toString();
                    const isUserReceiver = message.receiver.toString() === user._id.toString();
                    const isFriendReceiver = message.receiver.toString() === friend._id.toString();

                    if ((isUserSender && isFriendReceiver) || (isFriendSender && isUserReceiver)) {
                        const msg = {...message._doc };

                        if (message.media) {
                            // If the message contains a media ID, retrieve the media
                            const media = await Media.findById(message.media);

                            if (media) {
                                msg.media = {
                                    content: media.content.toString('base64'),
                                    contentType: media.contentType,
                                };
                            }
                        }

                        chatMessages.push(msg);
                    }
                }

                socket.emit('getChatMessagesSuccess', chatMessages);
            } else {
                socket.emit('getChatMessagesError', 'Friend not found');
            }
        } else {
            socket.emit('getChatMessagesError', 'User not found');
        }
    } catch (error) {
        console.error('Error during get chat messages:', error.message);
        socket.emit('getChatMessagesError', 'Error during get chat messages');
    }
}



module.exports = {
    handleChatMessage,
    handleGetChatMessages,

};