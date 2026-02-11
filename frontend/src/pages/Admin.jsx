import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import requestService from '../services/request.service';

const Admin = () => {
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'compact'
  const queryClient = useQueryClient();

  // Fetch all requests
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['adminRequests'],
    queryFn: () => requestService.getRequests({}),
  });

  // Fetch statistics
  const { data: statsData } = useQuery({
    queryKey: ['requestStats'],
    queryFn: () => requestService.getRequestStats(),
  });

  // Update request mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => requestService.updateRequest(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRequests']);
      queryClient.invalidateQueries(['requestStats']);
    },
  });

  const handleQuickAction = (requestId, action, currentStatus) => {
    const actionMessages = {
      approve: 'Are you sure you want to approve this request?',
      reject: 'Are you sure you want to reject this request?',
      complete: 'Mark this request as completed?',
    };

    if (window.confirm(actionMessages[action])) {
      updateMutation.mutate({
        id: requestId,
        updates: { status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'completed' },
      });
    }
  };

  const handleAdminNotesUpdate = (requestId, adminNotes) => {
    updateMutation.mutate({
      id: requestId,
      updates: { admin_notes: adminNotes },
    });
  };

  // Filter and search requests
  const filteredRequests = useMemo(() => {
    if (!requestsData?.requests) return [];

    let filtered = requestsData.requests;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(req => req.status === selectedStatus);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req =>
        req.title.toLowerCase().includes(query) ||
        req.user?.username?.toLowerCase().includes(query) ||
        req.user?.email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [requestsData, selectedStatus, searchQuery]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900 bg-opacity-50 text-yellow-200 border border-yellow-700';
      case 'approved':
        return 'bg-blue-900 bg-opacity-50 text-blue-200 border border-blue-700';
      case 'completed':
        return 'bg-green-900 bg-opacity-50 text-green-200 border border-green-700';
      case 'rejected':
        return 'bg-red-900 bg-opacity-50 text-red-200 border border-red-700';
      default:
        return 'bg-gray-700 text-gray-200 border border-gray-600';
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const statusOptions = [
    { value: 'all', label: 'All', count: requestsData?.requests.length || 0 },
    { value: 'pending', label: 'Pending', count: statsData?.by_status?.find(s => s.status === 'pending')?.count || 0 },
    { value: 'approved', label: 'Approved', count: statsData?.by_status?.find(s => s.status === 'approved')?.count || 0 },
    { value: 'completed', label: 'Completed', count: statsData?.by_status?.find(s => s.status === 'completed')?.count || 0 },
    { value: 'rejected', label: 'Rejected', count: statsData?.by_status?.find(s => s.status === 'rejected')?.count || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-300">
            Review and manage all media requests
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 bg-gray-800 p-1 rounded-lg border border-gray-700">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'cards'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'compact'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Compact
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={`bg-gray-800 p-4 rounded-lg shadow border transition-all hover:scale-105 text-left ${
                selectedStatus === option.value
                  ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <p className="text-sm font-medium text-gray-400">{option.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{option.count}</p>
            </button>
          ))}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by title, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="text-sm text-gray-400 flex items-center px-3 bg-gray-800 rounded-lg border border-gray-700">
          Showing {filteredRequests.length} of {requestsData?.requests.length || 0} requests
        </div>
      </div>

      {/* Requests List */}
      {requestsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-400">
            {searchQuery ? 'No requests match your search' : 'No requests found'}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <AdminRequestCard
              key={request.id}
              request={request}
              onQuickAction={handleQuickAction}
              onAdminNotesUpdate={handleAdminNotesUpdate}
              getStatusColor={getStatusColor}
              getTimeAgo={getTimeAgo}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg shadow border border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Media</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Requested</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredRequests.map((request) => (
                <CompactRequestRow
                  key={request.id}
                  request={request}
                  onQuickAction={handleQuickAction}
                  getStatusColor={getStatusColor}
                  getTimeAgo={getTimeAgo}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Card view component
const AdminRequestCard = ({ request, onQuickAction, onAdminNotesUpdate, getStatusColor, getTimeAgo }) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [adminNotes, setAdminNotes] = useState(request.admin_notes || '');

  const handleSaveNotes = () => {
    onAdminNotesUpdate(request.id, adminNotes);
    setIsEditingNotes(false);
  };

  const posterUrl = request.poster_path && request.poster_path.trim() !== ''
    ? `https://image.tmdb.org/t/p/w185${request.poster_path}`
    : '/placeholder-poster.png';

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-gray-600 transition-all">
      <div className="flex gap-4">
        {/* Poster */}
        <div className="flex-shrink-0">
          <img
            src={posterUrl}
            alt={request.title}
            className="w-24 h-36 object-cover rounded-md shadow-md"
            onError={(e) => {
              e.target.src = '/placeholder-poster.png';
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">{request.title}</h3>
              <p className="text-sm text-gray-400">
                {request.year && request.year !== 0 ? `${request.year} • ` : ''}{request.media_type === 'movie' ? 'Movie' : 'TV Show'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                    {request.user?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span className="text-sm text-gray-300">{request.user?.username || 'Unknown'}</span>
                </div>
                <span className="text-gray-600">•</span>
                <span className="text-xs text-gray-500">{getTimeAgo(request.created_at)}</span>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusColor(request.status)}`}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
          </div>

          {/* Overview */}
          {request.overview && (
            <p className="text-sm text-gray-300 line-clamp-2 mb-3">
              {request.overview}
            </p>
          )}

          {/* User Notes */}
          {request.notes && (
            <div className="mb-3 p-2.5 bg-gray-900 bg-opacity-50 rounded-md border border-gray-700">
              <p className="text-xs font-medium text-gray-400 mb-1">User Notes:</p>
              <p className="text-sm text-gray-300">{request.notes}</p>
            </div>
          )}

          {/* Admin Notes */}
          <div className="mb-4">
            {isEditingNotes ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400">Admin Notes:</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400"
                  rows="2"
                  placeholder="Add internal notes about this request..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Save Notes
                  </button>
                  <button
                    onClick={() => {
                      setAdminNotes(request.admin_notes || '');
                      setIsEditingNotes(false);
                    }}
                    className="px-3 py-1.5 bg-gray-600 text-gray-200 text-xs font-medium rounded-md hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-blue-900 bg-opacity-20 rounded-md border border-blue-800 border-opacity-30">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-blue-300 mb-1">Admin Notes:</p>
                    <p className="text-sm text-gray-300">
                      {request.admin_notes || <span className="italic text-gray-500">No notes added</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {request.status === 'pending' && (
              <>
                <button
                  onClick={() => onQuickAction(request.id, 'approve', request.status)}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve
                </button>
                <button
                  onClick={() => onQuickAction(request.id, 'reject', request.status)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </button>
              </>
            )}
            {request.status === 'approved' && (
              <button
                onClick={() => onQuickAction(request.id, 'complete', request.status)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mark Complete
              </button>
            )}
            {(request.status === 'rejected' || request.status === 'completed') && (
              <button
                onClick={() => onQuickAction(request.id, 'approve', request.status)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                Reopen Request
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Compact table row component
const CompactRequestRow = ({ request, onQuickAction, getStatusColor, getTimeAgo }) => {
  return (
    <tr className="hover:bg-gray-750">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <img
            src={request.poster_path && request.poster_path.trim() !== ''
              ? `https://image.tmdb.org/t/p/w92${request.poster_path}`
              : '/placeholder-poster.png'}
            alt={request.title}
            className="w-10 h-14 object-cover rounded shadow-sm"
            onError={(e) => {
              e.target.src = '/placeholder-poster.png';
            }}
          />
          <div>
            <p className="text-sm font-medium text-white">{request.title}</p>
            <p className="text-xs text-gray-400">
              {request.year && request.year !== 0 ? `${request.year} • ` : ''}{request.media_type === 'movie' ? 'Movie' : 'TV'}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
            {request.user?.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <span className="text-sm text-gray-300">{request.user?.username || 'Unknown'}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-400">
        {getTimeAgo(request.created_at)}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex gap-1 justify-end">
          {request.status === 'pending' && (
            <>
              <button
                onClick={() => onQuickAction(request.id, 'approve', request.status)}
                className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                title="Approve"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => onQuickAction(request.id, 'reject', request.status)}
                className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                title="Reject"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

export default Admin;
