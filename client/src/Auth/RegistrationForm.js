import React, { useState } from 'react';
import io from 'socket.io-client';
import { url } from '../Api/api';

const socket = io(url);

function RegistrationForm({ onRegister }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState(''); 
  const [avatar, setAvatar] = useState(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    console.log(file)
    setAvatar(file);
  };

  const registerUser = () => {
    console.log('Before socket.emit');

    if (phoneNumber.trim() !== '' && username.trim() !== '' && passcode.trim() !== '') {
      console.log(phoneNumber, username, passcode, avatar)
      socket.emit('register', { phoneNumber, username, passcode, avatar });
      onRegister();
    } else {
      console.log('Please fill in all fields');
    }
  };



  return (
    <div className="bg-white p-8 rounded-md shadow-md max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center">Just Register and have Fun</h2>
      <div className="mb-4">
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-600">
          Phone Number:
        </label>
        <input
          type="text"
          id="phoneNumber"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring focus:border-blue-300"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="username" className="block text-sm font-medium text-gray-600">
          Username:
        </label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring focus:border-blue-300"
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
<div className="mb-4">
  <label htmlFor="avatar" className="block text-sm font-medium text-gray-600">
    Select Your Avatar:
  </label>
  <div className="flex items-center mt-1">
    <label
      htmlFor="avatar"
      className="cursor-pointer flex items-center justify-center p-2 w-full border rounded-md bg-gray-500 text-white hover:bg-blue-600 transition-all duration-300 focus:outline-none focus:ring focus:border-blue-300"
    >
      <svg
        className="w-6 h-6 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        ></path>
      </svg>
      Choose
    </label>
    <input
      type="file"
      id="avatar"
      onChange={handleAvatarChange}
      className="hidden"
      accept="image/*"
    />
  </div>
  
</div>

      <div>
        <button
          onClick={registerUser}
          className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 focus:outline-none"
        >
          Register
        </button>
      </div>
    </div>
  );
}

export default RegistrationForm;

