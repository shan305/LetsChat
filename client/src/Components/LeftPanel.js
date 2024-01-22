import React, { useState, useEffect } from 'react';
import '../styles/ChatInterface.css';
import AddFriend from './AddFriend';
import { socket } from '../Api/api';


function LeftPanel({ user, setChatUser }) {
  const [friends, setFriends] = useState([]);
  const [searchExistingFriendsTerm, setSearchExistingFriendsTerm] = useState('');
  const [searchExistingFriendsResults, setSearchExistingFriendsResults] = useState([]);

  useEffect(() => {
    socket.emit('getFriends', user);

    const handleFriends = (data) => {
      setFriends(data.friends);
    };

    socket.on('getFriendsSuccess', handleFriends);

    return () => {
      socket.off('getFriendsSuccess', handleFriends);
    };
  }, [user,setChatUser]);

  useEffect(() => {
    if (searchExistingFriendsTerm.trim() === '') {
      setSearchExistingFriendsResults([]);
      return;
    }

    // Emit the updated event for searching friends by username
    socket.emit('searchExistingFriends', { searchTerm: searchExistingFriendsTerm });

    const handleSearchExistingFriendsResults = (data) => {
      setSearchExistingFriendsResults(data.exists ? data.results : []);
    };

    socket.on('searchFriendResult', handleSearchExistingFriendsResults);

    return () => {
      socket.off('searchFriendResult', handleSearchExistingFriendsResults);
    };
  }, [searchExistingFriendsTerm, user,setChatUser]);

  const startChat = (friend) => {
    setChatUser(friend);
  };

  const getLastMessage = (friend) => {
    if (friend && friend.chatMessages && friend.chatMessages.length > 0) {
      const lastMessage = friend.chatMessages[friend.chatMessages.length - 1];
      return lastMessage ? lastMessage.message || 'No messages' : 'No messages';
    }

    return 'No messages';
  };
    const [showAddFriend, setShowAddFriend] = useState(false);

 const handleUserDetailsToggle = () => {
    setShowAddFriend(!showAddFriend);
 };

  return (
    <div className="flex flex-col w-1/4  bg-gray-800 p-4  my-2 mb-2 ml-2 text-lg text-gray-300 rounded-lg shadow-lg">
           <div className="flex items-center">
        <button onClick={handleUserDetailsToggle} className="chat-user-iconbg-gray-800 ">
          Add new
          </button>
          <div className="ml-auto">Friends</div>
        </div>
      {showAddFriend && <AddFriend user={user} />}
      <div className="mx-3 my-3">
        <div className="relative text-gray-600">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2">
            <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              viewBox="0 0 24 24" className="w-6 h-6 text-gray-300">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </span>
          <input
            type="search"
            className="block w-full py-2 pl-10 bg-gray-100 rounded outline-none"
            name="searchExistingFriends"
            placeholder="Search Existing Friends"
            value={searchExistingFriendsTerm}
            onChange={(e) => setSearchExistingFriendsTerm(e.target.value)}
            required
          />
        </div>
      </div>

      <ul className="list-none p-0 block w-full py-2 px-4 rounded-md space-y-2">
        {searchExistingFriendsResults.map((result) => (
          <li key={result.id} className="mb-2">
            <button onClick={() => startChat(result)}
              className="flex items-center px-3 py-2 text-sm transition duration-150 ease-in-out border-b border-gray-300 cursor-pointer hover:bg-gray-100 focus:outline-none">
              {/* Render result avatar or other details if needed */}
              <div className="w-full pb-2">
                <div className="flex justify-between">
                  <span className="block ml-2 font-semibold text-gray-600">{result.username}</span>
                </div>
              </div>
            </button>
          </li>
        ))}

        {friends.map((friend) => (
          <li key={friend._id} className="mb-2">
            <button onClick={() => startChat(friend)}
              className="flex items-center px-3 py-2 text-sm transition duration-150 ease-in-out border-b border-gray-300 cursor-pointer hover:bg-gray-100 focus:outline-none">
              {friend.avatarData && (
                <img className="object-cover w-10 h-10 rounded-full mr-2" src={`data:image/png;base64,${friend.avatarData}`} alt="avatar" />
              )}
              <div className="w-full pb-2">
                <div className="flex justify-between">
                  <span className="block ml-2 font-semibold text-gray-600">{friend.username}</span>
                  <span className="block ml-2 text-sm text-gray-600">
                    {getLastMessage(friend) || 'No messages'}
                  </span>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LeftPanel;
