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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Requests</h1>
        <p className="mt-2 text-gray-600">
          Track the status of your media requests
        </p>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2">
        {statusFilters.map((statusFilter) => (
          <button
            key={statusFilter.value}
            onClick={() => setFilter(statusFilter.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              filter === statusFilter.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {statusFilter.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">Failed to load requests. Please try again.</p>
        </div>
      )}

      {data && (
        <>
          {data.requests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">
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