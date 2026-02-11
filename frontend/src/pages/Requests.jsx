import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import requestService from '../services/request.service';
import RequestCard from '../components/RequestCard';

const Requests = () => {
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  // Fetch requests
  const { data, isLoading, error } = useQuery({
    queryKey: ['requests', filter],
    queryFn: () => {
      const params = filter !== 'all' ? { status: filter } : {};
      return requestService.getRequests(params);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => requestService.deleteRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['requests']);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => requestService.updateRequest(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['requests']);
    },
  });

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this request?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdateNotes = async (id, notes) => {
    updateMutation.mutate({ id, updates: { notes } });
  };

  const statusFilters = [
    { value: 'all', label: 'All Requests' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
  ];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">My Requests</h1>
        <p className="mt-2 text-gray-300">
          Track the status of your media requests
        </p>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2">
        {statusFilters.map((statusFilter) => (
          <button
            key={statusFilter.value}
            onClick={() => setFilter(statusFilter.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              filter === statusFilter.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600'
            }`}
          >
            {statusFilter.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-900 bg-opacity-50 border border-red-700 p-4">
          <p className="text-sm text-red-200">Failed to load requests. Please try again.</p>
        </div>
      )}

      {data && (
        <>
          {data.requests.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg shadow border border-gray-700">
              <p className="text-gray-300">
                {filter === 'all' 
                  ? "You haven't made any requests yet" 
                  : `No ${filter} requests`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {data.requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onDelete={() => handleDelete(request.id)}
                  onUpdateNotes={(notes) => handleUpdateNotes(request.id, notes)}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Requests;
