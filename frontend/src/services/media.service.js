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

  async getTrending(mediaType = 'all', timeWindow = 'week', page = 1) {
    const response = await api.get('/discover/trending', {
      params: { media_type: mediaType, time_window: timeWindow, page }
    });
    return response.data;
  }

  async getPopularMovies(page = 1) {
    const response = await api.get('/discover/popular/movies', {
      params: { page }
    });
    return response.data;
  }

  async getPopularTV(page = 1) {
    const response = await api.get('/discover/popular/tv', {
      params: { page }
    });
    return response.data;
  }

  async getTopRatedMovies(page = 1) {
    const response = await api.get('/discover/top-rated/movies', {
      params: { page }
    });
    return response.data;
  }

  async getTopRatedTV(page = 1) {
    const response = await api.get('/discover/top-rated/tv', {
      params: { page }
    });
    return response.data;
  }

  async getUpcomingMovies(page = 1) {
    const response = await api.get('/discover/upcoming/movies', {
      params: { page }
    });
    return response.data;
  }

  async getUpcomingTV(page = 1) {
    const response = await api.get('/discover/upcoming/tv', {
      params: { page }
    });
    return response.data;
  }
}

export default new MediaService();