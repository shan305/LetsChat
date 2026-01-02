// src/Components/UserDetails.js
import React, { useState, useMemo } from 'react';

const UserDetails = ({ onClose, chatUser, messages }) => {
  const [activeTab, setActiveTab] = useState('media');
  const [isMuted, setIsMuted] = useState(false);

  const mediaMessages = useMemo(() => {
    return messages.filter(msg => msg.media);
  }, [messages]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!chatUser) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/30 z-50"
      onClick={handleBackdropClick}
    >
      <div className="absolute right-0 top-0 h-full bg-white w-96 shadow-2xl flex flex-col">
        <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
          <span className="text-lg font-semibold">Contact Info</span>
          <button 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            onClick={onClose}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-200">
              {chatUser.avatarData ? (
                <img
                  className="w-full h-full object-cover"
                  src={`data:image/png;base64,${chatUser.avatarData}`}
                  alt="avatar"
                />
              ) : (
                <div className="w-full h-full bg-indigo-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {chatUser.username?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{chatUser.username}</h3>
              <p className="text-slate-500">{chatUser.phoneNumber}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-indigo-500 text-white">
          <span className="text-sm font-medium">About</span>
          <p className="text-indigo-100 text-sm mt-1">Available</p>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'media' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setActiveTab('media')}
            >
              Media
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'links' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setActiveTab('links')}
            >
              Links
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'docs' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setActiveTab('docs')}
            >
              Docs
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'media' && (
            <div>
              {mediaMessages.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {mediaMessages.map((msg, index) => (
                    <img
                      key={msg._id || index}
                      src={`data:${msg.media.contentType};base64,${msg.media.content}`}
                      alt="Media"
                      className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(`data:${msg.media.contentType};base64,${msg.media.content}`, '_blank')}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">No media shared</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'links' && (
            <div className="text-center py-8 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="text-sm">No links shared</p>
            </div>
          )}
          
          {activeTab === 'docs' && (
            <div className="text-center py-8 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No documents shared</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200">
          <div className="p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Mute Notifications</span>
            <button
              onClick={() => setIsMuted(prev => !prev)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isMuted ? 'bg-indigo-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  isMuted ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;