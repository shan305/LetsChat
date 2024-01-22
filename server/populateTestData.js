const { User, Media } = require('../models/users');
const mongoose = require('mongoose');
const Chance = require('chance');
const axios = require('axios');
const fetch = url => axios.get(url);
const chance = new Chance();

mongoose.connect('mongodb+srv://zeeshan:zeeshan@cluster0.pzexlr4.mongodb.net/letschat');
const db = mongoose.connection;

// Check connection
db.once('open', () => {
    console.log('Connected to MongoDB');
    seedData();
});

// Check for DB errors
db.on('error', (err) => {
    console.error(err);
});

const fetchAndConvertToBuffer = async(imageUrl) => {
    try {
        const response = await axios({
            method: 'get',
            url: imageUrl,
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
        });

        console.log('Response Status:', response.status);
        console.log('Response Headers:', response.headers);
        console.log('Content-Disposition:', response.headers['content-disposition']);

        if (response.status !== 200) {
            throw new Error(`Failed to fetch image, status: ${response.status}`);
        }

        const contentType = response.headers['content-type'];
        console.log('Content-Type:', contentType);

        const buffer = Buffer.from(response.data, 'binary');
        console.log('Buffer Length:', buffer.length);

        return buffer;
    } catch (error) {
        console.error('Fetch Error:', error.message);
        throw error;
    }
};

// Function to generate random avatar URL and convert to buffer
const getRandomAvatarBuffer = async(userIdentifier) => {
    const avatarUrl = chance.avatar({ seed: userIdentifier });
    console.log('Avatar URL:', avatarUrl);

    const avatarBuffer = await fetchAndConvertToBuffer(avatarUrl);
    return avatarBuffer;
};

// Function to seed data
const seedData = async() => {
    try {
        // Create users and avatars
        const users = [];
        for (let i = 0; i < 5; i++) {
            const userIdentifier = `user_${i}`;
            const avatarBuffer = await getRandomAvatarBuffer(userIdentifier);

            // Create and save the avatar with the user field
            const avatar = new Media({
                content: avatarBuffer,
                contentType: 'image/png', // Adjust as needed
                user: new mongoose.Types.ObjectId(),
            });
            await avatar.save();

            const user = new User({
                phoneNumber: chance.phone(),
                username: chance.word(),
                avatar: avatar._id,
            });

            await user.save();
            users.push(user);
        }

        // Establish friendships between users
        for (const user of users) {
            const otherUsers = users.filter(u => u._id !== user._id);
            const randomFriends = chance.pickset(otherUsers, 2); // Assume 2 friends per user

            user.friends = randomFriends.map(friend => friend._id);
            await user.save();
        }

        // Generate random chat messages
        for (const user of users) {
            const otherUsers = users.filter(u => u._id !== user._id);
            for (let i = 0; i < 3; i++) { // Generate 3 messages per user
                const receiver = chance.pickone(otherUsers);
                const message = chance.sentence();

                user.chatMessages.push({
                    sender: user._id,
                    receiver: receiver._id,
                    message: message,
                });

                receiver.chatMessages.push({
                    sender: user._id,
                    receiver: receiver._id,
                    message: message,
                });

                await user.save();
                await receiver.save();
            }
        }

        console.log('Data seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};