// src/Auth/RegistrationForm.js
import React, { useState, useEffect } from 'react';
import { socket } from '../Api/api';

function RegistrationForm({ onRegisterSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const handleRegistrationSuccess = (data) => {
      setIsLoading(false);
      setSuccess('Registration successful! Please sign in.');
      setError(null);
      setPhoneNumber('');
      setUsername('');
      setPasscode('');
      setAvatar(null);
      setAvatarPreview(null);
      
      if (onRegisterSuccess) {
        setTimeout(() => onRegisterSuccess(data), 1500);
      }
    };

    const handleRegistrationError = (errorMessage) => {
      setIsLoading(false);
      setError(errorMessage);
      setSuccess(null);
    };

    socket.on('registrationSuccess', handleRegistrationSuccess);
    socket.on('registrationError', handleRegistrationError);

    return () => {
      socket.off('registrationSuccess', handleRegistrationSuccess);
      socket.off('registrationError', handleRegistrationError);
    };
  }, [onRegisterSuccess]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
      
      const arrayBuffer = reader.result;
      setAvatar({
        buffer: Array.from(new Uint8Array(arrayBuffer)),
        mimetype: file.type,
        originalname: file.name,
      });
    };
    reader.readAsArrayBuffer(file);

    const previewReader = new FileReader();
    previewReader.onloadend = () => {
      setAvatarPreview(previewReader.result);
    };
    previewReader.readAsDataURL(file);
  };

  const validateForm = () => {
    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!passcode.trim()) {
      setError('Passcode is required');
      return false;
    }
    if (passcode.trim().length < 4) {
      setError('Passcode must be at least 4 characters');
      return false;
    }
    return true;
  };

  const registerUser = () => {
    setError(null);
    setSuccess(null);

    if (!validateForm()) return;

    if (!socket.connected) {
      setError('Not connected to server. Please refresh the page.');
      return;
    }

    setIsLoading(true);

    socket.emit('register', {
      phoneNumber: phoneNumber.trim(),
      username: username.trim(),
      passcode: passcode.trim(),
      avatar: avatar,
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      registerUser();
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50">
      <h2 className="text-xl font-semibold text-slate-800 mb-6">Create your account</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm">
          {success}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-600 mb-1.5">
            Phone Number
          </label>
          <input
            type="text"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="+1 (555) 000-0000"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-slate-600 mb-1.5">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Choose a username"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="passcode" className="block text-sm font-medium text-slate-600 mb-1.5">
            Passcode
          </label>
          <input
            type="password"
            id="passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter passcode"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            Profile Picture (Optional)
          </label>
          <label
            htmlFor="avatar"
            className="flex items-center justify-center gap-3 w-full px-4 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 hover:border-indigo-300 transition-all"
          >
            {avatarPreview ? (
              <div className="flex items-center gap-3">
                <img src={avatarPreview} alt="Preview" className="w-12 h-12 rounded-full object-cover" />
                <span className="text-sm text-slate-600">Change photo</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-sm text-slate-500">Choose a profile picture</span>
              </>
            )}
            <input
              type="file"
              id="avatar"
              onChange={handleAvatarChange}
              className="hidden"
              accept="image/*"
              disabled={isLoading}
            />
          </label>
        </div>

        <button
          onClick={registerUser}
          disabled={isLoading}
          className="w-full py-3 bg-indigo-500 text-white font-medium rounded-xl hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-lg shadow-indigo-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}

export default RegistrationForm;