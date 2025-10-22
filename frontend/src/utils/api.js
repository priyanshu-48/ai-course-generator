import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/users/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/api/users/register/', data),
  login: (data) => api.post('/api/users/login/', data),
  logout: (refreshToken) => api.post('/api/users/logout/', { refresh_token: refreshToken }),
  getProfile: () => api.get('/api/users/profile/'),
  updateProfile: (data) => api.put('/api/users/profile/', data),
};

export const coursesAPI = {
  listCourses: () => api.get('/api/courses/'),
  getCourse: (id) => api.get(`/api/courses/${id}/`),
  createCourse: (data) => api.post('/api/courses/create/', data),
  deleteCourse: (id) => api.delete(`/api/courses/${id}/`),
  updateProgress: (id, data) => api.post(`/api/courses/${id}/progress/`, data),
  toggleSubtopic: (courseId, moduleIndex, subtopicIndex) => 
    api.post(`/api/courses/${courseId}/module/${moduleIndex}/subtopic/${subtopicIndex}/toggle/`),
};

export default api;

