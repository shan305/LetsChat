// controllers/userController.js
const { User, Media, Passcode } = require('../models/users');
const fs = require('fs');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);



const saveMediaFile = async(file, userId) => {
    try {
        const media = new Media({
            user: userId,
            content: Buffer.from(file.buffer),
            contentType: file.mimetype,
        });

        await media.save();
        return media._id;
    } catch (error) {
        console.error('Error saving media file:', error.message);
        throw error;
    }
};


const handleRegister = async(io, socket, userData) => {
    console.log('Received userData:', userData);

    if (!socket || typeof socket.emit !== 'function') {
        console.error('Socket is not defined or does not have an emit method');
        return;
    }

    if (!userData || typeof userData !== 'object') {
        socket.emit('registrationError', 'Invalid registration data');
        return;
    }

    const { phoneNumber, username, avatar, passcode } = userData;

    console.log('phoneNumber:', phoneNumber);
    console.log('username:', username);

    if (!phoneNumber || !username || !passcode) {
        socket.emit('registrationError', 'Phone number, username, and passcode are required.');
        return;
    }

    try {
        // Create a new passcode entry for the user
        const newPasscodeEntry = new Passcode({
            phoneNumber,
            passcode,
        });

        await newPasscodeEntry.save();

        const newUser = new User({
            phoneNumber,
            username,
            passcode: newPasscodeEntry._id,
        });

        await newUser.save();

        if (avatar) {
            // Pass the user ID after newUser is saved
            newUser.avatar = await saveMediaFile(avatar, newUser._id);
            await newUser.save();
        }

        socket.emit('registrationSuccess', 'Registration successful');
    } catch (error) {
        console.error('Error during user registration:', error.message);
        socket.emit('registrationError', `Registration failed: ${error.message}`);
    }
};



async function handleSignIn(io, socket, userData) {
    if (!socket || typeof socket.emit !== 'function') {
        console.error('Socket is not defined or does not have an emit method');
        return;
    }

    if (!userData || typeof userData !== 'object') {
        socket.emit('signInError', 'Invalid sign-in data');
        return;
    }

    const { phoneNumber, username, passcode } = userData;

    if (!phoneNumber || !username || !passcode) {
        socket.emit('signInError', 'Phone number, username, and passcode are required.');
        return;
    }

    try {
        // Check if the passcode is valid
        const passcodeEntry = await Passcode.findOne({ phoneNumber, passcode }).exec();

        if (!passcodeEntry) {
            socket.emit('signInError', 'Invalid passcode');
            return;
        }

        // Find the user by phone number and username
        const user = await User.findOne({ phoneNumber, username }).maxTimeMS(15000).exec();

        if (!user) {
            socket.emit('signInError', 'Invalid phone number or username');
            return;
        }

        // Fetch user avatar if available
        let avatarData = null;
        if (user.avatar) {
            const avatarMedia = await Media.findById(user.avatar);
            if (avatarMedia && avatarMedia.content) {
                // Read the binary content of the media file
                avatarData = avatarMedia.content.toString('base64');
            }
        }

        // You can include the avatar data in the response
        socket.emit('signInSuccess', {
            user: {
                _id: user._id,
                phoneNumber: user.phoneNumber,
                username: user.username,
                avatarData: avatarData,
            },
        });

        // Optionally, handle getting friends
        await handleGetFriends(io, socket, user);

        // Remove the used passcode
    } catch (error) {
        console.error('Error during sign-in:', error.message);
        socket.emit('signInError', 'Error during sign-in');
    }
}




const handleSearchExistingFriend = async(io, socket, data) => {
    console.log('Received search request for friend:', data);

    try {
        const friends = await User.find({ username: { $regex: new RegExp(data.searchTerm, 'i') } });

        console.log('Query result:', friends);

        if (friends.length > 0) {
            console.log('Friends found:', friends);
            const results = friends.map(friend => ({
                username: friend.username,
                phoneNumber: friend.phoneNumber,
            }));
            socket.emit('searchFriendResult', { exists: true, results });
        } else {
            console.log('Friends not found');
            socket.emit('searchFriendResult', { exists: false, results: [] });
        }
    } catch (error) {
        console.error('Error during search friend:', error.message);
        socket.emit('searchFriendResult', { exists: false, results: [], error: 'Error during search friend' });
    }
};




const handleSearchFriend = async(io, socket, user) => {
    console.log('Received search request for friend:', user);

    try {
        // Use user in your search logic
        const friend = await User.findOne({ $or: [{ phoneNumber: user.friendPhoneNumber }, { username: user.friendPhoneNumber }] });

        if (friend) {
            console.log('Friend found:', friend);
            socket.emit('searchFriendResult', {
                exists: true,
                results: [{
                    username: friend.username,
                    phoneNumber: friend.phoneNumber,
                    // Add other friend properties as needed
                }, ],
            });
        } else {
            console.log('Friend not found');
            socket.emit('searchFriendResult', { exists: false, results: [] });
        }
    } catch (error) {
        console.error('Error during search friend:', error.message);
        socket.emit('searchFriendResult', { exists: false, results: [], error: 'Error during search friend' });
    }
};



async function handleAddFriend(io, socket, { user, friendPhoneNumber }) {
    try {
        // Find the friend by phone number
        const friend = await User.findOne({ phoneNumber: friendPhoneNumber });

        if (friend) {
            // Add the friend to the user's friend list (customize this based on your user schema)
            await User.findOneAndUpdate({ phoneNumber: user.phoneNumber }, { $addToSet: { friends: friend._id } });

            socket.emit('addFriendSuccess', {
                message: 'Friend added successfully',
                friend: {
                    username: friend.username,
                    phoneNumber: friend.phoneNumber,
                    // Add other friend properties as needed
                },
            });
        } else {
            // Emit that the friend was not found
            socket.emit('addFriendError', 'Friend not found');
        }
    } catch (error) {
        console.error('Error during add friend:', error.message);
        // Emit that there was an error adding the friend
        socket.emit('addFriendError', 'Error adding friend');
    }
}

async function handleGetFriends(io, socket, user) {
    try {
        // Find the user by phoneNumber
        const currentUser = await User.findOne({ phoneNumber: user.phoneNumber }).populate('friends', 'username phoneNumber avatar');

        if (currentUser) {
            // Extract relevant friend information (customize this based on your user schema)
            const friends = currentUser.friends.map(async(friend) => {
                const friendData = {
                    username: friend.username,
                    phoneNumber: friend.phoneNumber,
                };

                if (friend.avatar) {
                    const avatarMedia = await Media.findById(friend.avatar);
                    if (avatarMedia && avatarMedia.content) {
                        friendData.avatarData = avatarMedia.content.toString('base64');
                    }
                }

                return friendData;
            });

            // Wait for all avatar fetch operations to complete
            const friendsWithAvatars = await Promise.all(friends);

            // Emit the friends list to the user
            socket.emit('getFriendsSuccess', { friends: friendsWithAvatars });
        } else {
            // Emit that the user was not found
            socket.emit('getFriendsError', 'User not found');
        }
    } catch (error) {
        console.error('Error during get friends:', error.message);
        socket.emit('getFriendsError', 'Error during get friends');
    }
}


const getUserProfile = async(io, socket, userId) => {
    try {
        const user = await User.findById(userId);
        if (user) {
            // Fetch user avatar if available
            let avatarData = null;
            if (user.avatar) {
                const avatarMedia = await Media.findById(user.avatar);
                if (avatarMedia && avatarMedia.content) {
                    // Read the binary content of the media file
                    avatarData = avatarMedia.content.toString('base64');
                }
            }

            const userProfile = {
                _id: user._id,
                phoneNumber: user.phoneNumber,
                username: user.username,
                avatarData: avatarData,
            };
            socket.emit('getUserProfileSuccess', { userProfile });
        } else {
            socket.emit('getUserProfileError', 'User not found');
        }
    } catch (error) {
        console.error('Error retrieving user profile:', error.message);
        socket.emit('getUserProfileError', 'Error retrieving user profile');
    }
};
const handleUserProfile = async(io, socket, userId) => {
    try {
        // Pass the request to the function responsible for retrieving user profiles
        await getUserProfile(io, socket, userId);
    } catch (error) {
        console.error('Error handling user profile request:', error.message);
        socket.emit('getUserProfileError', 'Error handling user profile request');
    }
};



module.exports = {
    handleRegister,
    handleSignIn,
    handleSearchFriend,
    handleAddFriend,
    handleGetFriends,
    handleSearchExistingFriend,
    getUserProfile,
    handleUserProfile

};