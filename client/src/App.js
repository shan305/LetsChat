// src/App.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from './Api/api';
import AuthContainer from './Auth/AuthContainer';
import ChatInterface from './Components/ChatInterface';
import ProfilePage from './Components/ProfilePage';
import Footer from './Components/Footer';
import 'tailwindcss/tailwind.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(socket.connected ? 'connected' : 'disconnected');
  
  const userRef = useRef(null);
  const isAuthenticatedRef = useRef(false);
  const authCredentialsRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
    isAuthenticatedRef.current = isAuthenticated;
  }, [user, isAuthenticated]);

  useEffect(() => {
    const handleConnect = () => {
      console.log('[App] Socket connected:', socket.id);
      setConnectionStatus('connected');
      
      if (isAuthenticatedRef.current && authCredentialsRef.current) {
        console.log('[App] Re-authenticating after reconnect...');
        socket.emit('signIn', authCredentialsRef.current);
      }
    };

    const handleDisconnect = (reason) => {
      console.log('[App] Socket disconnected:', reason);
      setConnectionStatus('disconnected');
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    };

    const handleReconnect = (attemptNumber) => {
      console.log('[App] Socket reconnected after', attemptNumber, 'attempts');
      setConnectionStatus('connected');
    };

    const handleReconnectAttempt = () => {
      setConnectionStatus('reconnecting');
    };

    const handleSignInSuccess = (data) => {
      console.log('[App] Re-auth successful:', data.user?.username);
      setUser(data.user);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('signInSuccess', handleSignInSuccess);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect', handleReconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('signInSuccess', handleSignInSuccess);
    };
  }, []);

  const handleAuthentication = useCallback((userData, credentials) => {
    console.log('[App] User authenticated:', userData?.username);
    setIsAuthenticated(true);
    setUser(userData);
    
    if (credentials) {
      authCredentialsRef.current = credentials;
    }
  }, []);

  const handleLogout = useCallback(() => {
      localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    setShowProfileDropdown(false);
    setShowProfileModal(false);
    authCredentialsRef.current = null;
  }, []);

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(prev => !prev);
  };

  const openProfileModal = () => {
    setShowProfileModal(true);
    setShowProfileDropdown(false);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showProfileDropdown && !e.target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfileDropdown]);

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {connectionStatus !== 'connected' && (
        <div className={`px-4 py-2 text-center text-sm ${
          connectionStatus === 'reconnecting' 
            ? 'bg-amber-500 text-white' 
            : 'bg-rose-500 text-white'
        }`}>
          {connectionStatus === 'reconnecting' 
            ? 'Reconnecting to server...' 
            : 'Disconnected from server. Attempting to reconnect...'}
        </div>
      )}

      {isAuthenticated && (
        <header className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            {user && user.avatarData ? (
              <img
                src={`data:image/png;base64,${user.avatarData}`}
                alt="User Avatar"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <div>
              <span className="text-sm font-semibold text-slate-800">{user?.username}</span>
              <span className="block text-xs text-emerald-500">Online</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800">Let's Chat</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
            >
              Logout
            </button>
            
            <div className="relative profile-dropdown-container">
              <button
                onClick={toggleProfileDropdown}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                  <button
                    onClick={openProfileModal}
                    className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium">Profile Settings</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {showProfileModal && (
        <ProfilePage user={user} onClose={closeProfileModal} />
      )}

      <div className="flex flex-1 overflow-hidden bg-slate-100">
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