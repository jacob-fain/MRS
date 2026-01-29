import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import requestService from '../services/request.service';

const Admin = () => {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const queryClient = useQueryClient();

  // Fetch all requests
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['adminRequests', selectedStatus],
    queryFn: () => {
      const params = selectedStatus !== 'all' ? { status: selectedStatus } : {};
      return requestService.getRequests(params);
    },
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

  const handleStatusChange = (requestId, newStatus) => {
    updateMutation.mutate({
      id: requestId,
      updates: { status: newStatus },
    });
  };

  const handleAdminNotesUpdate = (requestId, adminNotes) => {
    updateMutation.mutate({
      id: requestId,
      updates: { admin_notes: adminNotes },
    });
  };

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

  const statusOptions = ['pending', 'approved', 'completed', 'rejected'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="mt-2 text-gray-300">
          Manage all media requests
        </p>
      </div>

      {/* Statistics */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700">
            <p className="text-sm font-medium text-gray-400">Total Requests</p>
            <p className="text-3xl font-bold text-white">{statsData.total_requests}</p>
          </div>
          {statsData.by_status?.map((stat) => (
            <div key={stat.status} className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700">
              <p className="text-sm font-medium text-gray-400">
                {stat.status.charAt(0).toUpperCase() + stat.status.slice(1)}
              </p>
              <p className="text-3xl font-bold text-white">{stat.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter buttons */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedStatus('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
            selectedStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600'
          }`}
        >
          All Requests
        </button>
        {statusOptions.map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              selectedStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests table */}
      {requestsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-700">
          <ul className="divide-y divide-gray-700">
            {requestsData?.requests.map((request) => (
              <li key={request.id} className="px-6 py-4">
                <div className="flex items-start space-x-4">
                  <img
                    src={request.poster_path 
                      ? `https://image.tmdb.org/t/p/w92${request.poster_path}`
                      : '/placeholder-poster.png'}
                    alt={request.title}
                    className="w-16 h-24 object-cover rounded"
                    onError={(e) => {
                      e.target.src = '/placeholder-poster.png';
                    }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-white truncate">
                          {request.title}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {request.year} • {request.media_type === 'movie' ? 'Movie' : 'TV Show'}
                        </p>
                        <p className="text-sm text-gray-300 mt-1">
                          Requested by: {request.user?.username || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="ml-4">
                        <select
                          value={request.status}
                          onChange={(e) => handleStatusChange(request.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)} bg-transparent`}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status} className="bg-gray-800 text-white">
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {request.notes && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-300">
                          <span className="font-medium text-gray-200">User notes:</span> {request.notes}
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-2">
                      <AdminNotesInput
                        requestId={request.id}
                        initialNotes={request.admin_notes}
                        onSave={handleAdminNotesUpdate}
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          {requestsData?.requests.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No requests found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AdminNotesInput = ({ requestId, initialNotes, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes || '');

  const handleSave = () => {
    onSave(requestId, notes);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNotes(initialNotes || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white placeholder-gray-400"
          rows="2"
          placeholder="Add admin notes..."
        />
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1 bg-gray-600 text-gray-200 text-xs rounded-md hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-2">
      <p className="text-sm text-gray-300 flex-1">
        <span className="font-medium text-gray-200">Admin notes:</span>{' '}
        {initialNotes || <span className="italic text-gray-500">No notes</span>}
      </p>
      <button
        onClick={() => setIsEditing(true)}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        Edit
      </button>
    </div>
  );
};

export default Admin;
