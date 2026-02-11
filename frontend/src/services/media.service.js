import api from './api';

class MediaService {
  async searchMedia(query, page = 1, checkPlex = true) {
    const response = await api.get('/search', {
      params: { q: query, page, check_plex: checkPlex }
    });
    return response.data;
  }

  async getMediaDetails(type, id) {
    const response = await api.get(`/search/${type}/${id}`);
    return response.data;
  }

  async checkPlexAvailability(title, year, type) {
    const response = await api.get('/plex/check', {
      params: { title, year, type }
    });
    return response.data;
  }

  async getPlexLibraries() {
    const response = await api.get('/plex/libraries');
    return response.data;
  }

  async searchPerson(query, page = 1) {
    const response = await api.get('/person/search', {
      params: { q: query, page }
    });
    return response.data;
  }

  async getPersonDetails(personId) {
    const response = await api.get(`/person/${personId}`);
    return response.data;
  }

  async getPersonCredits(personId) {
    const response = await api.get(`/person/${personId}/credits`);
    return response.data;
  }
}

export default new MediaService();