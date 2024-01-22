// AuthContainer.js
import React, { useEffect, useState } from 'react';
import RegistrationForm from './RegistrationForm';
import SignInForm from './SignIn';
import '../styles/ChatInterface.css'
function AuthContainer({ onAuthenticate }) {
  const [showRegistrationForm, setShowRegistrationForm] = useState(true);

    const [typedText, setTypedText] = useState('');

  const words = ["Let's", 'Chat'];
  const typingSpeed = 150; // Adjust the typing speed as needed

  const animateText = () => {
    let currentIndex = 0;
    let currentText = '';

    const interval = setInterval(() => {
      currentText += words[currentIndex] + ' ';

      setTypedText(currentText);

      currentIndex++;

      if (currentIndex === words.length) {
        clearInterval(interval);
      }
    }, typingSpeed);
  };

  useEffect(() => {
    animateText();
  }, []);

  const handleRegister = () => {

    console.log('Registration successful');
    onAuthenticate();
  };

const handleSignIn = (userData) => {
  console.log('Sign in successful:', userData);
  onAuthenticate(userData);
};

  return (
    <div className="mx-auto">
    
      <div className="text-center mt-4">
        <h1 className="text-4xl font-bold mb-4 text-center">{typedText}</h1>
        <h2 className="text-xl font-bold mb-4 text-center text-blue-500">
        Welcome to Let's Chat
      </h2>
        <button
          onClick={() => setShowRegistrationForm(!showRegistrationForm)}
          className="text-blue-500 hover:underline focus:outline-none"
        >
          {showRegistrationForm ? 'Already have an account? Sign In' : 'Don\'t have an account? Register'}
        </button>
      </div>
      {showRegistrationForm ? (
        <RegistrationForm onRegister={handleRegister} />
      ) : (
        <SignInForm onSignIn={handleSignIn} />
      )}
   
    </div>
  );
}

export default AuthContainer;
