import React, { useState, useEffect, useRef, useCallback } from 'react'; 
import LeftPanel from './LeftPanel';
import { socket, url } from '../Api/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserDetails from './UserDetails';

function ChatInterface({ user }) {
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isTypingRef = useRef(false);
  const chatUserRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatUserRef.current = chatUser;
  }, [chatUser]);

  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isMyMessage = useCallback((msg) => {
    if (!user) return false;
    
    const myPhone = user.phoneNumber;
    const myId = (user._id || user.id || '').toString();
    
    if (msg.senderPhone) {
      return msg.senderPhone === myPhone;
    }
    
    if (msg.sender) {
      if (typeof msg.sender === 'string') {
        if (msg.sender.startsWith('+') || /^\d{10,}$/.test(msg.sender)) {
          return msg.sender === myPhone;
        }
        return msg.sender === myId;
      }
      if (typeof msg.sender === 'object') {
        const senderId = msg.sender._id?.toString() || msg.sender.toString();
        return senderId === myId;
      }
    }
    
    if (msg.senderId) {
      let senderId;
      if (typeof msg.senderId === 'object') {
        senderId = msg.senderId._id?.toString() || msg.senderId.toString();
      } else {
        senderId = String(msg.senderId);
      }
      return senderId === myId;
    }
    
    return false;
  }, [user]);

  const isMessageForCurrentChat = useCallback((message) => {
    const currentChatUser = chatUserRef.current;
    if (!currentChatUser) return false;
    
    const friendPhone = currentChatUser.phoneNumber;
    const myPhone = user?.phoneNumber;
    
    const senderPhone = message.senderPhone || message.sender;
    const receiverPhone = message.receiverPhone || message.receiver;
    
    const fromFriendToMe = senderPhone === friendPhone && receiverPhone === myPhone;
    const fromMeToFriend = senderPhone === myPhone && receiverPhone === friendPhone;
    
    return fromFriendToMe || fromMeToFriend;
  }, [user]);

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      e.target.value = '';
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error('Only images are supported');
      e.target.value = '';
      return;
    }
    
    setMediaFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
      setMediaFile(null);
    };
    reader.readAsDataURL(file);
  };

  const handleStopTyping = useCallback(() => {
    if (chatUserRef.current && isTypingRef.current) {
      setIsTyping(false);
      socket.emit('stopTyping', {
        sender: user?.phoneNumber,
        receiver: chatUserRef.current.phoneNumber,
      });
    }
  }, [user?.phoneNumber]);

  const handleTyping = useCallback(() => {
    if (!chatUserRef.current || !user?.phoneNumber) return;
    
    if (!isTypingRef.current) {
      setIsTyping(true);
      socket.emit('typing', {
        sender: user.phoneNumber,
        receiver: chatUserRef.current.phoneNumber,
      });
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  }, [user?.phoneNumber, handleStopTyping]);

  const generateMessageId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const uploadMediaHTTP = useCallback(async (file, receiverPhone, clientMessageId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiverPhone', receiverPhone);
    formData.append('clientMessageId', clientMessageId);
    formData.append('message', '');

    const token = localStorage.getItem('token');
    
    const response = await fetch(`${url}/api/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    return response.json();
  }, []);

  const sendMessage = useCallback(async () => {
    if (!user?.phoneNumber || !chatUser?.phoneNumber) return;
    if (!messageInput.trim() && !mediaFile) return;
    if (isSending) return;

    const clientMessageId = generateMessageId();
    setIsSending(true);
    setUploadProgress(0);

    try {
      if (mediaFile) {
        const result = await uploadMediaHTTP(mediaFile, chatUser.phoneNumber, clientMessageId);
        
        if (result.success && result.message) {
          setMessages(prev => {
            const exists = prev.some(m => 
              (m._id && m._id === result.message._id) || 
              (m.clientMessageId && m.clientMessageId === result.message.clientMessageId)
            );
            if (exists) return prev;
            return [...prev, result.message];
          });
        }
        
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else if (messageInput.trim()) {
        socket.emit('chatMessage', {
          sender: user.phoneNumber,
          receiver: chatUser.phoneNumber,
          message: messageInput.trim(),
          messageType: 'text',
          clientMessageId,
        });
        
        setMessageInput('');
      }
    } catch (error) {
      toast.error('Failed to send: ' + error.message);
    } finally {
      setIsSending(false);
      setUploadProgress(0);
      handleStopTyping();
    }
  }, [user, chatUser, messageInput, mediaFile, generateMessageId, handleStopTyping, isSending, uploadMediaHTTP]);

  useEffect(() => {
    const handleNewMessage = (message) => {
      if (!isMessageForCurrentChat(message)) {
        const senderPhone = message.senderPhone || message.sender;
        if (senderPhone && senderPhone !== user?.phoneNumber) {
          toast.info(`New message from ${senderPhone}`, { autoClose: 3000 });
        }
        return;
      }
      
      setMessages(prev => {
        const exists = prev.some(m => 
          (m._id && m._id === message._id) || 
          (m.clientMessageId && m.clientMessageId === message.clientMessageId)
        );
        if (exists) {
          return prev;
        }
        return [...prev, message];
      });
    };

    const handleMessageSuccess = (message) => {
      setIsSending(false);
      
      setMessages(prev => {
        const exists = prev.some(m => 
          (m._id && m._id === message._id) || 
          (m.clientMessageId && m.clientMessageId === message.clientMessageId)
        );
        if (exists) {
          return prev;
        }
        return [...prev, message];
      });
    };

    const handleMessageError = (error) => {
      setIsSending(false);
      toast.error('Failed to send message: ' + error);
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('chatMessageSuccess', handleMessageSuccess);
    socket.on('chatMessageError', handleMessageError);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('chatMessageSuccess', handleMessageSuccess);
      socket.off('chatMessageError', handleMessageError);
    };
  }, [isMessageForCurrentChat, user]);

  useEffect(() => {
    if (!chatUser || !user) return;
    
    setMessages([]);
    setIsLoading(true);
    setFriendIsTyping(false);
    
    socket.emit('getChatMessages', {
      userPhoneNumber: user.phoneNumber,
      friendPhoneNumber: chatUser.phoneNumber,
    });

    const handleChatMessages = (chatMessages) => {
      let sortedMessages = chatMessages || [];
      sortedMessages = sortedMessages.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      });
      setMessages(sortedMessages);
      setIsLoading(false);
    };

    const handleChatMessagesError = (error) => {
      toast.error('Failed to load messages');
      setIsLoading(false);
    };

    socket.on('getChatMessagesSuccess', handleChatMessages);
    socket.on('getChatMessagesError', handleChatMessagesError);

    return () => {
      socket.off('getChatMessagesSuccess', handleChatMessages);
      socket.off('getChatMessagesError', handleChatMessagesError);
      handleStopTyping();
    };
  }, [chatUser, user, handleStopTyping]);

  useEffect(() => {
    if (!chatUser) return;

    const handleFriendTyping = (data) => {
      if (data.sender === chatUser.phoneNumber) {
        setFriendIsTyping(true);
      }
    };

    const handleFriendStopTyping = (data) => {
      if (data.sender === chatUser.phoneNumber) {
        setFriendIsTyping(false);
      }
    };

    socket.on('typing', handleFriendTyping);
    socket.on('stopTyping', handleFriendStopTyping);

    return () => {
      socket.off('typing', handleFriendTyping);
      socket.off('stopTyping', handleFriendStopTyping);
      setFriendIsTyping(false);
    };
  }, [chatUser]);

  useEffect(() => {
    const handleOnlineUsers = (users) => {
      setOnlineUsers(users || []);
    };

    const handleUserOnline = ({ phoneNumber }) => {
      if (phoneNumber) {
        setOnlineUsers(prev => {
          if (!prev.includes(phoneNumber)) {
            return [...prev, phoneNumber];
          }
          return prev;
        });
      }
    };

    const handleUserOffline = ({ phoneNumber }) => {
      if (phoneNumber) {
        setOnlineUsers(prev => prev.filter(p => p !== phoneNumber));
      }
    };

    socket.on('updateOnlineUsers', handleOnlineUsers);
    socket.on('userOnline', handleUserOnline);
    socket.on('userOffline', handleUserOffline);

    return () => {
      socket.off('updateOnlineUsers', handleOnlineUsers);
      socket.off('userOnline', handleUserOnline);
      socket.off('userOffline', handleUserOffline);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleMessageEdited = (editedMessage) => {
      setMessages(prev => 
        prev.map(msg => 
          msg._id === editedMessage._id ? { ...msg, ...editedMessage } : msg
        )
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    };

    socket.on('messageEdited', handleMessageEdited);
    socket.on('messageDeleted', handleMessageDeleted);

    return () => {
      socket.off('messageEdited', handleMessageEdited);
      socket.off('messageDeleted', handleMessageDeleted);
    };
  }, []);

  const initiateCall = () => {
    if (!chatUser) return;
    socket.emit('call', {
      caller: user.phoneNumber,
      receiver: chatUser.phoneNumber,
    });
    setIsCalling(true);
  };

  const hangUpCall = () => {
    if (!chatUser) return;
    socket.emit('hangUp', {
      caller: chatUser.phoneNumber,
      receiver: user.phoneNumber,
    });
    setIsCalling(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isOnline = chatUser && onlineUsers.includes(chatUser.phoneNumber);

  return (
    <div className="flex-1 flex p-4 gap-4">
      <LeftPanel user={user} setChatUser={setChatUser} />

      {chatUser ? (
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
            <div
              onClick={() => setShowUserDetails(prev => !prev)}
              className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded-xl transition-colors"
            >
              <div className="relative">
                {chatUser.avatarData ? (
                  <img className="w-11 h-11 rounded-full object-cover" src={`data:image/png;base64,${chatUser.avatarData}`} alt="avatar" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                    {chatUser.username?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-400' : 'bg-slate-300'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{chatUser.username}</h3>
                <p className={`text-sm ${friendIsTyping ? 'text-indigo-500' : isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {friendIsTyping ? 'Typing...' : isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>

            {isCalling ? (
              <button onClick={hangUpCall} className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">
                Hang Up
              </button>
            ) : (
              <button onClick={initiateCall} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                Call
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMine = isMyMessage(msg);

                return (
                  <div key={msg._id || msg.clientMessageId || index} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-end gap-2 max-w-md ${isMine ? 'flex-row-reverse' : ''}`}>
                      {isMine ? (
                        user?.avatarData ? (
                          <img className="w-8 h-8 rounded-full object-cover" src={`data:image/png;base64,${user.avatarData}`} alt="avatar" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                            {user?.username?.charAt(0)?.toUpperCase()}
                          </div>
                        )
                      ) : (
                        chatUser?.avatarData ? (
                          <img className="w-8 h-8 rounded-full object-cover" src={`data:image/png;base64,${chatUser.avatarData}`} alt="avatar" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-medium">
                            {chatUser?.username?.charAt(0)?.toUpperCase()}
                          </div>
                        )
                      )}

                      <div className="flex flex-col">
                        {msg.media ? (
                          <img
                            src={`data:${msg.media.contentType};base64,${msg.media.content}`}
                            alt="Media"
                            className="max-w-xs rounded-2xl shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(`data:${msg.media.contentType};base64,${msg.media.content}`, '_blank')}
                          />
                        ) : (
                          <div className={`px-4 py-3 rounded-2xl ${isMine ? 'bg-indigo-500 text-white rounded-br-md' : 'bg-white text-slate-800 rounded-bl-md shadow-sm'}`}>
                            <p className="whitespace-pre-wrap break-words">{msg.message || msg.text}</p>
                          </div>
                        )}
                        
                        {msg.createdAt && (
                          <span className={`text-xs text-slate-400 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {friendIsTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2">
                  {chatUser?.avatarData ? (
                    <img className="w-8 h-8 rounded-full object-cover" src={`data:image/png;base64,${chatUser.avatarData}`} alt="avatar" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs">
                      {chatUser?.username?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="px-4 py-3 bg-white rounded-2xl rounded-bl-md shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="px-6 py-4 bg-white border-t border-slate-100">
            {mediaPreview && (
              <div className="mb-3 relative inline-block">
                <img src={mediaPreview} alt="Preview" className="w-20 h-20 rounded-xl object-cover" />
                <button 
                  onClick={clearMedia} 
                  className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-rose-600 transition-colors"
                >
                  X
                </button>
              </div>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mb-3">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Uploading... {uploadProgress}%</p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  onChange={handleMediaChange} 
                  className="hidden" 
                />
              </label>

              <input
                type="text"
                value={messageInput}
                onChange={(e) => { setMessageInput(e.target.value); handleTyping(); }}
                onKeyPress={handleKeyPress}
                onBlur={handleStopTyping}
                placeholder="Type a message..."
                disabled={isSending}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all disabled:opacity-50"
              />

              <button
                onClick={sendMessage}
                disabled={(!messageInput.trim() && !mediaFile) || isSending}
                className="p-3 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isSending ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-slate-500 text-lg">Select a friend to start chatting</p>
        </div>
      )}

      {showUserDetails && (
        <UserDetails chatUser={chatUser} messages={messages} onClose={() => setShowUserDetails(false)} />
      )}
    </div>
  );
}

export default ChatInterface;