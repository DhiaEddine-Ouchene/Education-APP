/**
 * API fetch client wrapper with token management.
 * Vite proxy forwards requests starting with /api to the backend server.
 */
export const api = {
  getToken: () => localStorage.getItem('edumatch_token'),
  setToken: (token) => {
    localStorage.setItem('edumatch_token', token);
  },
  clearToken: () => localStorage.removeItem('edumatch_token'),

  request: async (method, path, body = null) => {
    const token = api.getToken();
    const headers = {
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let options = { method, headers };

    if (body) {
      if (body instanceof FormData) {
        options.body = body;
      } else {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }
    }

    try {
      const response = await fetch(`/api${path}`, options);

      if (response.status === 401) {
        api.clearToken();
        // Fire a custom event so App.jsx can handle logout — 
        // DO NOT do window.location.href redirects (this is a SPA)
        window.dispatchEvent(new CustomEvent('edumatch:session-expired'));
        throw new Error('Session expired. Please log in again.');
      }

      const text = await response.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { text };
        }
      }

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      if (!error.message.includes('Session expired')) {
        console.error(`API Error on ${method} ${path}:`, error.message);
      }
      throw error;
    }
  },

  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
  put: (path, body) => api.request('PUT', path, body),
  delete: (path) => api.request('DELETE', path),
};

export default api;
