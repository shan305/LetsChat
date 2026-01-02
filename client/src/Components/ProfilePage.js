// src/Components/ProfilePage.js
import React, { useEffect, useState } from 'react';
import { socket } from '../Api/api';

const ProfilePage = ({ user, onClose, onEdit }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const userId = user?._id || user?.id;

    if (!userId) {
      setError('Invalid user');
      setIsLoading(false);
      return;
    }

    const handleSuccess = ({ userProfile }) => {
      setUserProfile(userProfile);
      setIsLoading(false);
    };

    const handleError = (errorMessage) => {
      setError(errorMessage);
      setIsLoading(false);
    };

    socket.on('getUserProfileSuccess', handleSuccess);
    socket.on('getUserProfileError', handleError);

    socket.emit('getUserProfile', userId);

    return () => {
      socket.off('getUserProfileSuccess', handleSuccess);
      socket.off('getUserProfileError', handleError);
    };
  }, [user]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 px-6 pt-8 pb-16 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative -mt-12 flex justify-center">
          {isLoading ? (
            <div className="w-24 h-24 rounded-full bg-slate-200 ring-4 ring-white shadow-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : userProfile?.avatarData ? (
            <img
              src={`data:image/png;base64,${userProfile.avatarData}`}
              alt="User Avatar"
              className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-indigo-500 ring-4 ring-white shadow-lg flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {userProfile?.username?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>

        <div className="px-6 pt-4 pb-6">
          {error ? (
            <div className="text-center mb-6 p-3 bg-rose-50 text-rose-600 rounded-xl">
              {error}
            </div>
          ) : isLoading ? (
            <div className="text-center mb-6">
              <div className="h-6 w-32 bg-slate-200 rounded mx-auto mb-2 animate-pulse"></div>
              <div className="h-4 w-24 bg-slate-200 rounded mx-auto animate-pulse"></div>
            </div>
          ) : userProfile && (
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-1">
                {userProfile.username}
              </h3>
              <p className="text-slate-500 text-sm">
                {userProfile.phoneNumber}
              </p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="text-sm font-medium text-slate-700">{userProfile?.phoneNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Username</p>
                  <p className="text-sm font-medium text-slate-700">{userProfile?.username}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {onEdit && (
              <button
                onClick={onEdit}
                disabled={isLoading || error}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-50 text-amber-600 font-medium rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-indigo-500 text-white font-medium rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;