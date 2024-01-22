import React, { useState, useEffect } from 'react';
import '../styles/ChatInterface.css';
import { socket } from '../Api/api';



function AddFriend({ user }) {
  const [friendPhoneNumber, setFriendPhoneNumber] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  useEffect(() => {
    const handleSearchResult = (result) => {
      console.log('Search result received:', result);
      setSearchResult(result);
    };
    socket.on('searchFriendResult', handleSearchResult);

    return () => {
      socket.off('searchFriendResult', handleSearchResult);
    };
  }, []);

 const searchFriend = () => {
  console.log('Searching for friend:', friendPhoneNumber);
  socket.emit('searchFriend', { friendPhoneNumber });
};

  const addFriend = () => {
    if (searchResult && searchResult.exists) {
      socket.emit('addFriend', { user, friendPhoneNumber });
      setSearchResult(null);
      console.log(searchResult)

    }
  };

  return (
    <div className=" my-2 mb-2 ml-2 p-4 border rounded-lg bg-white shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-center">Add Friend</h2>
      <div className="flex">
        <input
          type="text"
          value={friendPhoneNumber}
          onChange={(e) => setFriendPhoneNumber(e.target.value)}
          placeholder="Enter friend's phone number"
          className="p-3 border rounded-l-lg focus:outline-none w-full"
        />
        <button
          onClick={searchFriend}
          className="bg-blue-500 text-white p-3 rounded-r-lg hover:bg-blue-600 focus:outline-none"
        >
          Search
        </button>
      </div>
      {searchResult && (
        <div className="mt-4">
          {searchResult.exists ? (
            <div className="flex items-center justify-between">
              <span className="text-gray-700">
            {searchResult.results[0].username} ({searchResult.results[0].phoneNumber})
              </span>
              <button
                onClick={addFriend}
                className="bg-green-500 text-white p-3 rounded-md hover:bg-green-600 focus:outline-none"
              >
                Add Friend
              </button>
            </div>
          ) : (
            <span className="text-red-500">User not found</span>
          )}
        </div>
      )}
    </div>
  );
}

export default AddFriend;
