import api from './api';

class RequestService {
  async getRequests(params = {}) {
    const response = await api.get('/requests', { params });
    return response.data;
  }

  async createRequest(requestData) {
    const response = await api.post('/requests', requestData);
    return response.data;
  }

  async updateRequest(id, updates) {
    const response = await api.put(`/requests/${id}`, updates);
    return response.data;
  }

  async deleteRequest(id) {
    const response = await api.delete(`/requests/${id}`);
    return response.data;
  }

  async getRequestStats() {
    const response = await api.get('/requests/stats');
    return response.data;
  }
}

export default new RequestService();