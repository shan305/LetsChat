import React, { useState, useEffect } from 'react';
import { socket } from '../Api/api';

function SignInForm({ onSignIn }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleSignInSuccess = (data) => {
      setIsLoading(false);
      setError(null);
      
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
    onSignIn(
      data.user,
      {
        phoneNumber,
        username,
        passcode,
      }
    );
    };

    const handleSignInError = (errorMessage) => {
      setIsLoading(false);
      setError(errorMessage);
    };

    socket.on('signInSuccess', handleSignInSuccess);
    socket.on('signInError', handleSignInError);

    return () => {
      socket.off('signInSuccess', handleSignInSuccess);
      socket.off('signInError', handleSignInError);
    };
  }, [onSignIn]);

  const validateForm = () => {
    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    if (!passcode.trim()) {
      setError('Passcode is required');
      return false;
    }
    return true;
  };

  const signInUser = () => {
    setError(null);

    if (!validateForm()) return;

    if (!socket.connected) {
      setError('Not connected to server. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    
    socket.emit('signIn', {
      phoneNumber: phoneNumber.trim(),
      username: username.trim(),
      passcode: passcode.trim(),
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      signInUser();
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50">
      <h2 className="text-xl font-semibold text-slate-800 mb-6">Welcome back</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label htmlFor="phoneNumberSignIn" className="block text-sm font-medium text-slate-600 mb-1.5">
            Phone Number
          </label>
          <input
            type="text"
            id="phoneNumberSignIn"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="+1 (555) 000-0000"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="usernameSignIn" className="block text-sm font-medium text-slate-600 mb-1.5">
            Username
          </label>
          <input
            type="text"
            id="usernameSignIn"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Your username"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="passcodeSignIn" className="block text-sm font-medium text-slate-600 mb-1.5">
            Passcode
          </label>
          <input
            type="password"
            id="passcodeSignIn"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter passcode"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
          />
        </div>

        <button
          onClick={signInUser}
          disabled={isLoading}
          className="w-full py-3 bg-indigo-500 text-white font-medium rounded-xl hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-lg shadow-indigo-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}

export default SignInForm;