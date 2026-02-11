import React, { useState } from 'react';

const RequestCard = ({ request, onDelete, onUpdateNotes, getStatusColor }) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(request.notes || '');

  const handleSaveNotes = () => {
    onUpdateNotes(notes);
    setIsEditingNotes(false);
  };

  const handleCancelEdit = () => {
    setNotes(request.notes || '');
    setIsEditingNotes(false);
  };

  const posterUrl = request.poster_path && request.poster_path.trim() !== ''
    ? `https://image.tmdb.org/t/p/w185${request.poster_path}`
    : '/placeholder-poster.png';

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-700">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-shrink-0 mx-auto sm:mx-0">
          <img
            src={posterUrl}
            alt={request.title}
            className="w-32 h-48 sm:w-24 sm:h-36 object-cover rounded-md"
            onError={(e) => {
              e.target.src = '/placeholder-poster.png';
            }}
          />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">{request.title}</h3>
              <p className="text-sm text-gray-400">
                {request.year && request.year !== 0 ? `${request.year} • ` : ''}{request.media_type === 'movie' ? 'Movie' : 'TV Show'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(request.status)}`}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </span>
              <button
                onClick={onDelete}
                className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-900/20 rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Delete request"
                aria-label="Delete request"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          
          <p className="text-sm text-gray-300 line-clamp-2">
            {request.overview || 'No description available'}
          </p>
          
          <div className="text-xs text-gray-500">
            Requested on {new Date(request.created_at).toLocaleDateString()}
          </div>
          
          {/* User Notes */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-300">Your Notes</label>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="px-3 py-2 text-xs text-blue-400 hover:text-blue-300 transition-colors min-h-[44px] hover:bg-blue-900/20 rounded-md"
                  aria-label="Edit notes"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400 min-h-[80px]"
                  rows="3"
                  placeholder="Add any notes about this request..."
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleSaveNotes}
                    className="px-4 py-2.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors min-h-[44px]"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2.5 bg-gray-600 text-gray-200 text-sm rounded-md hover:bg-gray-500 transition-colors min-h-[44px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                {request.notes || 'No notes added'}
              </p>
            )}
          </div>
          
          {/* Admin Notes */}
          {request.admin_notes && (
            <div className="mt-3 p-3 bg-gray-700 rounded-md border border-gray-600">
              <p className="text-sm font-medium text-gray-200 mb-1">Admin Notes</p>
              <p className="text-sm text-gray-300">{request.admin_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestCard;
