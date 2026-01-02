// src/Components/AddFriend.js
import React, { useState, useEffect, useCallback } from 'react';
import { socket } from '../Api/api';

function AddFriend({ onFriendAdded }) {
  const [friendPhoneNumber, setFriendPhoneNumber] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleSearchResult = (result) => {
      setIsSearching(false);
      if (result.error) {
        setError(result.error);
        setSearchResult(null);
      } else {
        setSearchResult(result);
        setError(null);
      }
    };

    const handleAddFriendSuccess = (data) => {
      setIsAdding(false);
      setSearchResult(null);
      setFriendPhoneNumber('');
      setError(null);
      if (onFriendAdded) {
        onFriendAdded(data.friend);
      }
    };

    const handleAddFriendError = (errorMsg) => {
      setIsAdding(false);
      setError(errorMsg);
    };

    socket.on('searchFriendResult', handleSearchResult);
    socket.on('addFriendSuccess', handleAddFriendSuccess);
    socket.on('addFriendError', handleAddFriendError);

    return () => {
      socket.off('searchFriendResult', handleSearchResult);
      socket.off('addFriendSuccess', handleAddFriendSuccess);
      socket.off('addFriendError', handleAddFriendError);
    };
  }, [onFriendAdded]);

  const searchFriend = useCallback(() => {
    const trimmed = friendPhoneNumber.trim();
    
    if (!trimmed) {
      setError('Please enter a phone number');
      return;
    }

    if (!socket.connected) {
      setError('Not connected to server. Please refresh.');
      return;
    }

    setError(null);
    setIsSearching(true);
    setSearchResult(null);

    socket.emit('searchFriend', { friendPhoneNumber: trimmed });
  }, [friendPhoneNumber]);

  const addFriend = useCallback(() => {
    if (!searchResult || !searchResult.exists || searchResult.results.length === 0) {
      return;
    }

    if (!socket.connected) {
      setError('Not connected to server. Please refresh.');
      return;
    }

    setError(null);
    setIsAdding(true);

    socket.emit('addFriend', { friendPhoneNumber: friendPhoneNumber.trim() });
  }, [searchResult, friendPhoneNumber]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchFriend();
    }
  };

  const clearSearch = () => {
    setSearchResult(null);
    setFriendPhoneNumber('');
    setError(null);
  };

  return (
    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        Add New Friend
      </h3>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={friendPhoneNumber}
          onChange={(e) => setFriendPhoneNumber(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter phone number"
          disabled={isSearching || isAdding}
          className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all disabled:opacity-50"
        />
        <button
          type="button"
          onClick={searchFriend}
          disabled={isSearching || !friendPhoneNumber.trim() || isAdding}
          className="px-4 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-rose-500 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {searchResult && (
        <div className="mt-3">
          {searchResult.exists && searchResult.results.length > 0 ? (
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                {searchResult.results[0].avatarData ? (
                  <img 
                    src={`data:image/png;base64,${searchResult.results[0].avatarData}`}
                    alt="avatar"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                    {searchResult.results[0].username?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-slate-800 text-sm">{searchResult.results[0].username}</p>
                  <p className="text-xs text-slate-500">{searchResult.results[0].phoneNumber}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearSearch}
                  className="px-3 py-2 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addFriend}
                  disabled={isAdding}
                  className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {isAdding ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 text-sm p-3 bg-slate-100 rounded-xl">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              User not found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AddFriend;