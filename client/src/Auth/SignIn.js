import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import socketApi from '../Api/socketApi';

const socket = io('http://localhost:3001');

function SignInForm({ onSignIn }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState(''); 
    const [onlineUsers, setOnlineUsers] = useState([]); 

  useEffect(() => {
    const handleSignInSuccess = (data) => {
      console.log('Sign in successful:', data);
      onSignIn(data.user);
      setOnlineUsers(data.onlineUsers);
    };

    socket.on('signInSuccess', handleSignInSuccess);

    const handleSignInError = (errorMessage) => {
      console.error('Sign in failed:', errorMessage);
    };

    socketApi.on('signInError', handleSignInError);

    return () => {
      socket.off('signInSuccess', handleSignInSuccess);
      socket.off('signInError', handleSignInError);
    };
  }, [onSignIn]);



  const signInUser = () => {
    if (phoneNumber.trim() !== '' && username.trim() !== '' && passcode.trim() !== '') {
      console.log('Signing in user:', { phoneNumber, username, passcode });
      socket.emit('signIn', { phoneNumber, username, passcode });
    } else {
      console.log('Please fill in all fields');
    }
  };



  return (
    <div className="bg-white p-8 rounded-md shadow-md max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center">User Sign In</h2>
      <div className="mb-4">
        <label htmlFor="phoneNumberSignIn" className="block text-sm font-medium text-gray-600">
          Phone Number:
        </label>
        <input
          type="text"
          id="phoneNumberSignIn"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="mt-1 p-2 block w-full border rounded-md focus:outline-none focus:ring focus:border-blue-300"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="usernameSignIn" className="block text-sm font-medium text-gray-600">
          Username:
        </label>
        <input
          type="text"
          id="usernameSignIn"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 p-2 block w-full border rounded-md focus:outline-none focus:ring focus:border-blue-300"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="passcode" className="block text-sm font-medium text-gray-600">
          Passcode: 
        </label>
        <input
          type="text"
          id="passcode"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring focus:border-blue-300"
        />
      </div>
      <div>
        <button
          onClick={signInUser}
          className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 focus:outline-none"
        >
          Sign In
        </button>
      </div>
            <div className="mt-4 text-center">
        {onlineUsers.length > 0 && (
          <p>Online Users: {onlineUsers.map(user => user.phoneNumber).join(', ')}</p>
        )}
      </div>
    </div>
  );
}

export default SignInForm;
