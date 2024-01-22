// settingsPage.js (React example)
import React, { useEffect, useState } from 'react';
import { socket } from '../Api/api';



const ProfilePage = ({ user, onClose, onEdit }) => {
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const userId = user?._id;

    if (!userId) {
      console.error('Invalid user prop');
      return;
    }

    const getUserProfile = () => {
      socket.emit('getUserProfile', userId);
    };

    const handleSuccess = ({ userProfile }) => {
      setUserProfile(userProfile);
    };

    const handleError = (errorMessage) => {
      console.error('Error retrieving user profile:', errorMessage);
    };

    socket.on('getUserProfileSuccess', handleSuccess);
    socket.on('getUserProfileError', handleError);

    getUserProfile();

    return () => {
      socket.off('getUserProfileSuccess', handleSuccess);
      socket.off('getUserProfileError', handleError);
    };
  }, [user]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
      <div className="bg-white p-8 rounded-md shadow-lg">
              {/*<h2 className="text-3xl font-bold mb-6 text-gray-800">Profile Settings</h2>*/}
        {userProfile && (
         <div>
             <img
              src={`data:image/png;base64,${userProfile?.avatarData}`}
              alt="User Avatar"
              className="w-32 h-32 rounded-full mb-6 justify-center items-center"
            />              
            <div className="mb-4">
              <p className="text-gray-600">Phone Number: {userProfile.phoneNumber}</p>
              <p className="text-gray-600">Username: {userProfile.username}</p>
            </div>
 
          </div>
        )}
        <div className="flex justify-end mt-6">
          <button
            onClick={onEdit}
            className="bg-yellow-500 text-white p-3 rounded-md hover:bg-yellow-600 mr-2"
          >
            Edit
          </button>
          <button
            onClick={onClose}
            className="bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
