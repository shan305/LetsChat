// src/Components/LeftPanel.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AddFriend from './AddFriend';
import { socket } from '../Api/api';

function LeftPanel({ user, setChatUser }) {
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const fetchFriends = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    socket.emit('getFriends', user);
  }, [user]);

  useEffect(() => {
    fetchFriends();

    const handleFriends = (data) => {
      setIsLoading(false);
      if (data.friends) {
        setFriends(data.friends);
      }
    };

    const handleFriendsError = (error) => {
      setIsLoading(false);
      console.error('Failed to get friends:', error);
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users || []);
    };

    const handleUserOnline = ({ userId, phoneNumber }) => {
      if (phoneNumber) {
        setOnlineUsers(prev => {
          if (!prev.includes(phoneNumber)) {
            return [...prev, phoneNumber];
          }
          return prev;
        });
      }
    };

    const handleUserOffline = ({ userId, phoneNumber }) => {
      if (phoneNumber) {
        setOnlineUsers(prev => prev.filter(p => p !== phoneNumber));
      }
    };

    socket.on('getFriendsSuccess', handleFriends);
    socket.on('getFriendsError', handleFriendsError);
    socket.on('updateOnlineUsers', handleOnlineUsers);
    socket.on('userOnline', handleUserOnline);
    socket.on('userOffline', handleUserOffline);

    return () => {
      socket.off('getFriendsSuccess', handleFriends);
      socket.off('getFriendsError', handleFriendsError);
      socket.off('updateOnlineUsers', handleOnlineUsers);
      socket.off('userOnline', handleUserOnline);
      socket.off('userOffline', handleUserOffline);
    };
  }, [fetchFriends]);

  const filteredFriends = useMemo(() => {
    if (!searchTerm.trim()) {
      return friends;
    }

    const term = searchTerm.toLowerCase();
    return friends.filter(friend =>
      friend.username?.toLowerCase().includes(term) ||
      friend.phoneNumber?.includes(term)
    );
  }, [searchTerm, friends]);

  const handleFriendAdded = useCallback((newFriend) => {
    setFriends(prev => {
      const exists = prev.some(f => f.phoneNumber === newFriend.phoneNumber);
      if (exists) return prev;
      return [...prev, newFriend];
    });
    setShowAddFriend(false);
  }, []);

  const startChat = useCallback((friend) => {
    setChatUser(friend);
  }, [setChatUser]);

  const isOnline = useCallback((friend) => {
    return friend.isOnline || onlineUsers.includes(friend.phoneNumber);
  }, [onlineUsers]);

  return (
    <div className="flex flex-col w-80 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Friends ({friends.length})
          </h2>
          <button
            onClick={() => setShowAddFriend(prev => !prev)}
            className={`p-2 rounded-lg transition-colors ${
              showAddFriend 
                ? 'bg-indigo-500 text-white' 
                : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showAddFriend ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              )}
            </svg>
          </button>
        </div>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            placeholder="Search friends..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {showAddFriend && (
        <AddFriend onFriendAdded={handleFriendAdded} />
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : filteredFriends.length > 0 ? (
          filteredFriends.map((friend) => (
            <button
              key={friend._id || friend.id || friend.phoneNumber}
              onClick={() => startChat(friend)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="relative flex-shrink-0">
                {friend.avatarData ? (
                  <img
                    className="w-11 h-11 rounded-full object-cover"
                    src={`data:image/png;base64,${friend.avatarData}`}
                    alt="avatar"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                    {friend.username?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <span 
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                    isOnline(friend) ? 'bg-emerald-400' : 'bg-slate-300'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-slate-800 truncate">{friend.username}</p>
                <p className="text-sm text-slate-500 truncate">
                  {isOnline(friend) ? 'Online' : 'Offline'}
                </p>
              </div>
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm">
              {searchTerm.trim() ? 'No friends found' : 'No friends yet'}
            </p>
            {!searchTerm.trim() && !showAddFriend && (
              <button
                onClick={() => setShowAddFriend(true)}
                className="mt-2 text-indigo-500 text-sm hover:underline"
              >
                Add your first friend
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LeftPanel;