import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import AuthContainer from './Auth/AuthContainer';
import ChatInterface from './ChatInterface';
import ProfilePage from './Components/ProfilePage';
import 'tailwindcss/tailwind.css';
import { wsURL } from './Api/api';
import Footer from './Components/Footer';



function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  useEffect(() => {
  const socket = io(wsURL, {
    reconnection: true,
    reconnectionAttempts: 20,
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after attempt', attemptNumber);
  });

  socket.on('reconnect_failed', () => {
    console.error('Socket reconnection failed');
  });
socket.on('user authenticated', () => {
      setIsAuthenticated(true);
    });
  return () => {
    socket.disconnect();
  };
}, []);


 

  const handleAuthentication = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
     const socket = io(wsURL);
    socket.emit('logout');
    setIsAuthenticated(false);
    setUser(null);
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown((prev) => !prev);
  };

  
    const openProfileModal = () => {
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
  };
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {isAuthenticated && (
        <div className="flex justify-between items-center mb-4 p-4 bg-white shadow-md">
          <div className="flex items-center">
            {user && user.avatarData && (
              <img
                src={`data:image/png;base64,${user.avatarData}`}
                alt="User Avatar"
                className="w-10 h-10 rounded-full mr-2"
              />
            )}
            <div>
              <span className="text-lg font-bold">{user && user.username}</span>
              <span className="block text-sm text-gray-500">{/* Add any additional info here */}</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4">Lets Chat</h1>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 focus:outline-none"
            >
              Logout
            </button>
            <div className="relative">
              <button
                onClick={toggleProfileDropdown}
                className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 focus:outline-none"
              >
                Settings
              </button>

           {showProfileDropdown && (
                  <div className="absolute w-48 right-0 mt-2 bg-white border rounded-md shadow-md flex flex-col">
                    <a href="#/" className="block p-2 hover:bg-gray-200" onClick={openProfileModal}>
                      🌟 Profile Settings
                    </a>
                    {/* Explore more options below */}
                    <a href="#/" className="block p-2 hover:bg-gray-200" onClick={toggleProfileDropdown}>
                      🚀 Discover More
                    </a>
                    <a href="#/" className="block p-2 hover:bg-gray-200" onClick={toggleProfileDropdown}>
                      💡 Try Something New
                    </a>
                    {/* Display the ProfilePage component when Profile Settings is clicked */}
                    {showProfileModal && <ProfilePage user={user} onClose={closeProfileModal} />}
                  </div>
                )}

            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden  bg-gradient-to-r from-red-200 via-black-200 to-white-500 text-blue">
        {!isAuthenticated ? (
          <AuthContainer onAuthenticate={handleAuthentication} />
        ) : (
          <ChatInterface user={user} />
        )}
      </div>
      <Footer />
    </div>
  );
}

export default App;
