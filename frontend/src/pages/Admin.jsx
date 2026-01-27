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
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statusOptions = ['pending', 'approved', 'completed', 'rejected'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage all media requests
        </p>
      </div>

      {/* Statistics */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-600">Total Requests</p>
            <p className="text-3xl font-bold text-gray-900">{statsData.total_requests}</p>
          </div>
          {statsData.by_status?.map((stat) => (
            <div key={stat.status} className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm font-medium text-gray-600">
                {stat.status.charAt(0).toUpperCase() + stat.status.slice(1)}
              </p>
              <p className="text-3xl font-bold text-gray-900">{stat.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter buttons */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedStatus('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
            selectedStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All Requests
        </button>
        {statusOptions.map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              selectedStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests table */}
      {requestsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
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
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {request.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {request.year} • {request.media_type === 'movie' ? 'Movie' : 'TV Show'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
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
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {request.notes && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">User notes:</span> {request.notes}
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
              <p className="text-gray-500">No requests found</p>
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          rows="2"
          placeholder="Add admin notes..."
        />
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-2">
      <p className="text-sm text-gray-700 flex-1">
        <span className="font-medium">Admin notes:</span>{' '}
        {initialNotes || <span className="italic text-gray-500">No notes</span>}
      </p>
      <button
        onClick={() => setIsEditing(true)}
        className="text-xs text-blue-600 hover:text-blue-800"
      >
        Edit
      </button>
    </div>
  );
};

export default Admin;