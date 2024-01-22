import React, { useState, useEffect } from 'react';
import LeftPanel from './Components/LeftPanel';
import {  socket } from './Api/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserDetails from './Components/UserDetails';

function ChatInterface({ user }) {
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [chatUser, setChatUser] = useState(null);
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
    const [showUserDetails, setShowUserDetails] = useState(false);
  const [isCalling, setIsCalling] = useState(false);

 const handleUserDetailsToggle = () => {
    setShowUserDetails(!showUserDetails);
  };
    const handleMediaChange = (e) => {
        const file = e.target.files[0];
        setMediaFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setMediaPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };
    let typingTimeout = null;
    const handleTyping = () => {
        if (chatUser) {
            if (!isTyping) {
                setIsTyping(true);
                socket.emit('typing', {
                    sender: user.phoneNumber,
                    receiver: chatUser.phoneNumber,
                });
            }

            // Set a timeout to stop typing after a delay (e.g., 2 seconds)
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                handleStopTyping();
            }, 2000);
        }
    };



    const handleStopTyping = () => {
        if (chatUser) {
            socket.emit('stopTyping', {
                sender: user.phoneNumber,
                receiver: chatUser.phoneNumber,
            });
        }
    };
useEffect(() => {
    if (chatUser && user) {
        socket.emit('getChatMessages', {
            userPhoneNumber: user.phoneNumber,
            friendPhoneNumber: chatUser.phoneNumber,
        });

        const handleChatMessages = (chatMessages) => {
            setMessages(chatMessages);
        };

        const handleNewNotification = (notification) => {
            // Handle different notification types
            switch (notification.type) {
                case 'message':
                toast.success(`New message from ${chatUser.username}`, { autoClose: 2000 });
                    break;
                // Add more cases for other notification types if needed

                default:
                    break;
            }
        };

        socket.on('newNotification', handleNewNotification);
        socket.on('getChatMessagesSuccess', handleChatMessages);

        socket.on('newMessage', (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);

            // Check if the message is from the current user
            if (message.sender !== user.phoneNumber && message.receiver === user.phoneNumber) {
                toast.success(`New message from ${chatUser.username}`, { autoClose: 2000 });
            }
        });

        return () => {
            socket.off('getChatMessagesSuccess', handleChatMessages);
            handleStopTyping();
            socket.off('newMessage');
            socket.off('newNotification', handleNewNotification);
        };
    }
}, [chatUser, user, handleStopTyping]);



    useEffect(() => {
        if (chatUser) {
            socket.on('typing', () => {
                setIsTyping(true);
            });

            socket.on('stopTyping', () => {
                setIsTyping(false);
            });

            return () => {
                socket.off('typing');
                socket.off('stopTyping');
            };
        }
    }, [chatUser]);

    const sendMessage = () => {
        if (user && user.phoneNumber && chatUser && chatUser.phoneNumber) {
            if (mediaFile) {
                const mediaData = {
                    buffer: mediaFile,
                    mimetype: mediaFile.type,
                };

                socket.emit('chatMessage', {
                    sender: user.phoneNumber,
                    receiver: chatUser.phoneNumber,
                    message: '',
                    messageType: 'image',
                    mediaFile: mediaData,
                });
                     socket.on('newMessage', (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);

            // Check if the message is from the current user
            if (message.sender !== user.phoneNumber && message.receiver === user.phoneNumber) {
              toast.success(`New message from ${chatUser.username}`, { autoClose: 2000 });

            }
        });
             

            } else if (messageInput.trim() !== '') {
                socket.emit('chatMessage', {
                    sender: user.phoneNumber,
                    receiver: chatUser.phoneNumber,
                    message: messageInput,
                    messageType: 'text',
                });
                toast.success('Message sent', { autoClose: 2000 });

            }

            setMessageInput('');
            setMediaFile(null);
            setMediaPreview(null);
        }
    };

    useEffect(() => {
        socket.on('updateOnlineUsers', (users) => {
            setOnlineUsers(users);
        });

        return () => {
            socket.off('typing');
            socket.off('stopTyping');
            clearTimeout(typingTimeout);
        };
    }, [typingTimeout]);
  
  const initiateCall = () => {
    // Emit a 'call' event to the server
    socket.emit('call', {
      caller: user.phoneNumber,
      receiver: chatUser.phoneNumber,
    });

    // Set the calling state to true
    setIsCalling(true);
  };

  // Function to handle call rejection
  const rejectCall = () => {
    // Emit a 'reject' event to the server
    socket.emit('reject', {
      caller: chatUser.phoneNumber,
      receiver: user.phoneNumber,
    });

    // Set the calling state to false
    setIsCalling(false);
  };

  // Function to handle call hang-up
  const hangUpCall = () => {
    // Emit a 'hangUp' event to the server
    socket.emit('hangUp', {
      caller: chatUser.phoneNumber,
      receiver: user.phoneNumber,
    });

    // Set the calling state to false
    setIsCalling(false);
  };

// Inside handleCall function in ChatInterface.js
const [rtcConnection, setRtcConnection] = useState(null);

const handleCall = async (receiverPhoneNumber) => {
  try {
    const rtcConnection = new RTCPeerConnection();

    // Set up event listeners for the WebRTC connection

    // Add the rtcConnection to state
    setRtcConnection(rtcConnection);

    // Create an offer
    const offer = await rtcConnection.createOffer();
    await rtcConnection.setLocalDescription(offer);

    // Send the offer to the receiver
    socket.emit('offer', {
      caller: user.phoneNumber,
      receiver: receiverPhoneNumber,
      offer: rtcConnection.localDescription,
    });
  } catch (error) {
    console.error('Error during WebRTC setup:', error);
  }
};


  
  return (
    <div className="flex-1 flex flex-col mx_auto p-4 rounded-lg">

      <div className="flex-1 flex">
        <LeftPanel user={user} setChatUser={setChatUser} />
        {chatUser ? (
          <div className="flex-1 flex flex-col bg-white overflow-hidden rounded-lg p-4 mx-4 my-2 mb-2">
            <div className="flex-1 overflow-y-auto border-b p-4" style={{ maxHeight: '520px' }}>
              <div className="relative flex items-center p-3 border-b header p-4 bg-gray-200 border-gray-300" style={{ overflow: "hidden" }}>
                {chatUser && (
                  <div onClick={handleUserDetailsToggle} className="chat-user-icon">

                  <img
                    className="object-cover w-10 h-10 rounded-full mr-2" style={{cursor:"pointer"}}
                    src={`data:image/png;base64,${chatUser?.avatarData}`}
                    alt="avatar"
                  /></div>
                )}       

                <span className="block ml-2 font-bold text-gray-600">
                  {chatUser ? chatUser.username : 'Friend'}
                </span>
                <span className="absolute w-3 h-3 bg-green-600 rounded-full left-10 top-3"></span>
                <div>
                {chatUser && (
                  <span>
                   <span> .. </span>is {onlineUsers.includes(chatUser.phoneNumber) ? 'online' : 'offline'}
                  </span>
                  )}
                       {isCalling ? (
              <button
                onClick={hangUpCall}
                className="bg-red-500 text-white p-2 rounded-r-lg hover:bg-red-600 focus:outline-none"
              >
                Hang Up
              </button>
            ) : (
              <button
                onClick={initiateCall}
                className="bg-green-500 text-white p-2 rounded-r-lg hover:bg-green-600 focus:outline-none"
              >
                Call
              </button>
            )}
              </div>
              </div>
              <ul className="list-none p-0">
          {messages.map((msg, index) => {
            const isCurrentUserMessage =
              msg.sender && msg.sender.toString() === user?._id?.toString();

            return (
              <li key={index} className={`mb-2 ${isCurrentUserMessage ? 'flex justify-end' : 'flex justify-start'}`}>
                <div className={`flex items-center`}>
                  {isCurrentUserMessage ? (
                    <>
                      <div className={`w-8 h-8 bg-gray-300 rounded-full mr-2`}>
                        <img
                          className="object-cover w-10 h-10 rounded-full mr-2"
                          src={`data:image/png;base64,${user?.avatarData}`}
                          alt="avatar"
                        />
                      </div>
                      {msg.media  ? (
                            <img
                            src={`data:${msg.media?.contentType};base64,${msg.media?.content}`}
                            alt="Media Content"
                            className="max-w-full h-auto rounded-md shadow"
                          />
                      ) : (
                        <div className="mt-2">
                    
                        <span className={`p-2 bg-blue-500 text-white rounded-lg inline-block max-w-xs mt-6`}>
                          {msg.message}
                        </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className={`w-8 h-8 bg-gray-300 rounded-full ml-2`}>
                        <img
                          className="object-cover w-10 h-10 rounded-full mr-2"
                          src={`data:image/png;base64,${chatUser?.avatarData}`}
                          alt="avatar"
                        />
                      </div>
                        {msg.media ? (
                                <div className="mt-2">
                          <img
                            src={`data:${msg.media?.contentType};base64,${msg.media?.content}`}
                            alt="Media Content"
                            className="max-w-full h-auto rounded-md shadow"
                          />
                        </div>
                   
                      ) : (
                       <span className={`p-2 bg-gray-200 text-black rounded-lg inline-block max-w-xs mt-6`}>
                          {msg.message}
                        </span>
                      )}
                    </>
                  )}


                </div>

              </li>
              
            );
          })}
                {isTyping && (
                  <li className="flex justify-start">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-300 rounded-full ml-2">
                        <img
                          className="object-cover w-10 h-10 rounded-full mr-2"
                          src={`data:image/png;base64,${user?.avatarData}`}
                          alt="avatar"
                        />
                      </div>
                      <div>{user.username} is typing...</div>
                    </div>
                  </li>
                )}

              </ul>
            </div>
            <div className="mt-4 p-4 flex items-center bg-gray-200 block w-full py-2 pl-4 mx-3 bg-gray-100 rounded-full outline-none focus:text-gray-700">
             <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping(); // Call the function to indicate typing
                  }}
                  placeholder="Type your message..."
                  className="p-2 border rounded-l-lg focus:outline-none flex-1"
                />
              <label htmlFor="mediaInput" className="cursor-pointer">
                <svg
                  className="w-5 h-5 text-gray-500 mx-2"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4zM3 15a2 2 0 112 2 2 2 0 01-2-2zm14 0a2 2 0 112 2 2 2 0 01-2-2z" />
                </svg>
              </label>
              <input
                id="mediaInput"
                type="file"
                accept="image/*"
                onChange={(e) => handleMediaChange(e)}
                className="hidden"
              />
              {mediaPreview && (
                <div className="mt-2">
                  <img
                    src={mediaPreview}
                    alt="Media Preview"
                    className="w-20 20 rounded-full shadow"
                  />
                </div>
              )}
              <button
                onClick={sendMessage}
                className="bg-blue-500 text-white p-2 rounded-r-lg hover:bg-blue-600 focus:outline-none"
              >
                <svg
                  className="w-5 h-5 text-gray-500 origin-center transform rotate-90"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <p className="text-center mt-8 text-gray-500">Select a friend to start a chat</p>
          </div>
        )}
         {showUserDetails && <UserDetails chatUser={chatUser} messages={messages} onClose={handleUserDetailsToggle} />}
      </div>
    </div>
  );
}

export default ChatInterface;
