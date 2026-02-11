import api from './api';

class UserService {
  async getUsers() {
    const response = await api.get('/users');
    return response.data;
  }

  async getUser(id) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  }

  async updateUser(id, updates) {
    const response = await api.put(`/users/${id}`, updates);
    return response.data;
  }

  async deleteUser(id) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
}

export default new UserService();
