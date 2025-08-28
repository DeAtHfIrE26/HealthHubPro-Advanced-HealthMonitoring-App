import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      if (userData.token) {
        config.headers.Authorization = `Bearer ${userData.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear user data and redirect to login
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API functions
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: any) =>
    api.post('/auth/register', userData),
  getCsrfToken: () =>
    api.get('/auth/csrf-token'),
};

export const userAPI = {
  getUser: (id: number) =>
    api.get(`/users/${id}`),
  updateUser: (id: number, data: any) =>
    api.patch(`/users/${id}`, data),
};

export const activityAPI = {
  getStats: (userId: number, date?: string) =>
    api.get(`/activity-stats/${userId}${date ? `?date=${date}` : ''}`),
  createStats: (data: any) =>
    api.post('/activity-stats', data),
  getHistory: (userId: number, days: number = 7) =>
    api.get(`/activity-stats/${userId}/history?days=${days}`),
};

export const goalsAPI = {
  getGoals: (userId: number) =>
    api.get(`/goals/${userId}`),
  createGoal: (data: any) =>
    api.post('/goals', data),
  updateGoal: (id: number, data: any) =>
    api.patch(`/goals/${id}`, data),
};

export const workoutsAPI = {
  getWorkouts: (type?: string, level?: string) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (level) params.append('level', level);
    return api.get(`/workouts?${params.toString()}`);
  },
  getWorkout: (id: number) =>
    api.get(`/workouts/${id}`),
  createWorkoutSession: (data: any) =>
    api.post('/workout-sessions', data),
  getWorkoutSessions: (userId: number) =>
    api.get(`/workout-sessions/${userId}`),
  updateWorkoutSession: (id: number, data: any) =>
    api.patch(`/workout-sessions/${id}`, data),
};

export const challengesAPI = {
  getChallenges: () =>
    api.get('/challenges'),
  getChallenge: (id: number) =>
    api.get(`/challenges/${id}`),
  createChallenge: (data: any) =>
    api.post('/challenges', data),
  getParticipants: (challengeId: number) =>
    api.get(`/challenges/${challengeId}/participants`),
  joinChallenge: (challengeId: number, userId: number) =>
    api.post(`/challenges/${challengeId}/join`, { userId }),
  updateProgress: (challengeId: number, userId: number, progress: number) =>
    api.patch(`/challenges/${challengeId}/progress`, { userId, progress }),
  getUserChallenges: (userId: number) =>
    api.get(`/users/${userId}/challenges`),
};

export const recommendationsAPI = {
  getRecommendations: (userId: number, type?: string) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    return api.get(`/recommendations/${userId}?${params.toString()}`);
  },
  provideFeedback: (id: number, feedback: string) =>
    api.post(`/recommendations/${id}/feedback`, { feedback }),
  generateWorkoutPlan: (userId: number, preferences: any) =>
    api.post('/workout-plans', { userId, preferences }),
};