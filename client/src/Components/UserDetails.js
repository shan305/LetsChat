import React, { useState } from 'react';

const UserDetails = ({ onClose ,chatUser,messages}) => {
  const [activeTab, setActiveTab] = useState('about');
 const [isMuted, setIsMuted] = useState(false);

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };


  return (
      <div className="user-details fixed right-0 top-0 h-full bg-white w-1/3 shadow-lg rounded-lg overflow-hidden">
         <div className="header p-4 bg-gray-800 text-white flex items-center justify-between">
        <span className="text-lg font-bold">Contact Info</span>
        <button className="ml-auto" onClick={onClose}>
          &times;
        </button>
      </div>
      <div className="contact-info p-4">
                    <div className="flex items-center mb-4">
                    <div className="w-20 h-20 bg-gray-300 rounded-full mr-4">
                        <img
                        className="object-cover w-20 h-20 rounded-full mr-2"
                        src={`data:image/png;base64,${chatUser?.avatarData}`}
                        alt="avatar"
                        />
                    </div>
                    <div>
                        <span className="text-lg font-bold text-black mb-1 block">{chatUser.username}</span>
                        <span className="text-gray-600 block">{chatUser.phoneNumber}</span>
                    </div>
                    </div>
      </div>

      <div className="about-section p-4 text-center bg-blue-500 text-white mb-4">
        <span className="text-lg font-bold">About</span>
        <p>Use Status</p>
      
      </div>

      <div className="tabs-area p-4 bg-gray-200 mb-4">
        <div className="tabs flex">
          <button
            className={`text-lg mr-4 focus:outline-none rounded-md px-4 py-2 ${
              activeTab === 'media' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'
            }`}
            onClick={() => handleTabChange('media')}
          >
            Media
          </button>
          <button
            className={`text-lg mr-4 focus:outline-none rounded-md px-4 py-2 ${
              activeTab === 'links' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'
            }`}
            onClick={() => handleTabChange('links')}
          >
            Links
          </button>
          <button
            className={`text-lg focus:outline-none rounded-md px-4 py-2 ${
              activeTab === 'docs' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'
            }`}
            onClick={() => handleTabChange('docs')}
          >
            Docs
          </button>
        </div>
        {/* Reserved area for tabs content */}
        <div className="tabs-content">
            {activeTab === 'media' && (
                    <div className="media-content p-4">
                    <h2 className="text-2xl font-bold mb-4">Media Content</h2>
                    <div className="flex flex-wrap -m-2">
                        {messages.map((msg, index) => (
                        msg.media ? (
                            <img
                            key={index}
                            src={`data:${msg.media?.contentType};base64,${msg.media?.content}`}
                            alt="Media Content"
                            className="w-1/2 md:w-1/3 lg:w-1/4 p-2"
                            />
                        ) : null
                        ))}
                    </div>
                    </div>
                )}
          {activeTab === 'links' && <div className="links-content p-4">Links Content</div>}
          {activeTab === 'docs' && <div className="docs-content p-4">Docs Content</div>}
        </div>
      </div>

      {/* Mute Notifications and Common Groups sections */}
        <div className="mute-notifications p-4 flex items-center justify-between bg-gray-200 mb-4">
        <span className="text-lg font-bold">Mute Notifications</span>
        {/* Sliding button for mute notifications */}
        <button
          onClick={handleMuteToggle}
          className={`relative rounded-full w-16 h-8 transition-transform duration-300 ${
            isMuted ? 'bg-green-500' : 'bg-gray-400'
          }`}
        >
          <div
            className={`absolute left-1 top-1 w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
              isMuted ? 'translate-x-full' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="common-groups p-4 bg-gray-200 mb-4 font-bold">Common Groups</div>

 
    </div>
  );
};

export default UserDetails;
