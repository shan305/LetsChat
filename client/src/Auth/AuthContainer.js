// src/Auth/AuthContainer.js
import React, { useEffect, useState, useCallback } from 'react';
import RegistrationForm from './RegistrationForm';
import SignInForm from './SignIn';

function AuthContainer({ onAuthenticate }) {
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [typedText, setTypedText] = useState('');

  const words = ["Let's", 'Chat'];
  const typingSpeed = 150;

  useEffect(() => {
    let currentIndex = 0;
    let currentText = '';

    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        currentText += words[currentIndex] + ' ';
        setTypedText(currentText);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, []);

  const handleRegistrationSuccess = useCallback(() => {
    setShowRegistrationForm(false);
  }, []);

const handleSignIn = useCallback((userData, credentials) => {
  onAuthenticate(userData, credentials);
}, [onAuthenticate]);

  const toggleForm = () => {
    setShowRegistrationForm(prev => !prev);
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-200 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {typedText}<span className="animate-pulse">|</span>
          </h1>
          <p className="text-slate-500">Connect with friends instantly</p>
        </div>

        <div className="text-center mb-6">
          <button
            onClick={toggleForm}
            className="text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
          >
            {showRegistrationForm 
              ? "Already have an account? Sign In" 
              : "Don't have an account? Register"}
          </button>
        </div>

        {showRegistrationForm ? (
          <RegistrationForm onRegisterSuccess={handleRegistrationSuccess} />
        ) : (
          <SignInForm onSignIn={handleSignIn} />
        )}
      </div>
    </div>
  );
}

export default AuthContainer;