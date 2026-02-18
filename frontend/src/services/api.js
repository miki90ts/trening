import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// ======== AUTH TOKEN INTERCEPTOR ========
// Automatski dodaje Authorization header na svaki zahtev
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ======== RESPONSE INTERCEPTOR - Auto refresh token ========
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Ako je 401 i token je istekao, pokušaj refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Ne pokušavaj refresh za login/register/refresh rute
      if (
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/register") ||
        originalRequest.url?.includes("/auth/refresh")
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        isRefreshing = false;
        // Nema refresh tokena — forsiraj logout
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth:logout"));
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post("/api/auth/refresh", {
          refreshToken,
        });
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("user", JSON.stringify(data.user));

        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth:logout"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ======== AUTH ========
export const login = (data) =>
  api.post("/auth/login", data).then((r) => r.data);
export const register = (data) =>
  api.post("/auth/register", data).then((r) => r.data);
export const refreshToken = (token) =>
  api.post("/auth/refresh", { refreshToken: token }).then((r) => r.data);
export const getMe = () => api.get("/auth/me").then((r) => r.data);
export const logout = (token) =>
  api.post("/auth/logout", { refreshToken: token }).then((r) => r.data);
export const changePassword = (data) =>
  api.post("/auth/change-password", data).then((r) => r.data);
export const getPendingUsers = () =>
  api.get("/auth/pending").then((r) => r.data);
export const approveUser = (id) =>
  api.put(`/auth/approve/${id}`).then((r) => r.data);
export const rejectUser = (id) =>
  api.delete(`/auth/reject/${id}`).then((r) => r.data);
export const changeUserRole = (id, role) =>
  api.put(`/auth/role/${id}`, { role }).then((r) => r.data);

// ======== USERS ========
export const getUsers = () => api.get("/users").then((r) => r.data);
export const getUser = (id) => api.get(`/users/${id}`).then((r) => r.data);
export const createUser = (data) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v != null) fd.append(k, v);
  });
  return api
    .post("/users", fd, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data);
};
export const updateUser = (id, data) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v != null) fd.append(k, v);
  });
  return api
    .put(`/users/${id}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};
export const deleteUser = (id) =>
  api.delete(`/users/${id}`).then((r) => r.data);
export const getUserRecords = (id) =>
  api.get(`/users/${id}/records`).then((r) => r.data);

// ======== EXERCISES ========
export const getExercises = () => api.get("/exercises").then((r) => r.data);
export const getExercise = (id) =>
  api.get(`/exercises/${id}`).then((r) => r.data);
export const createExercise = (data) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v != null) fd.append(k, v);
  });
  return api
    .post("/exercises", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};
export const updateExercise = (id, data) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v != null) fd.append(k, v);
  });
  return api
    .put(`/exercises/${id}`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};
export const deleteExercise = (id) =>
  api.delete(`/exercises/${id}`).then((r) => r.data);

// ======== CATEGORIES ========
export const getCategories = (exerciseId) => {
  const params = exerciseId ? { exercise_id: exerciseId } : {};
  return api.get("/categories", { params }).then((r) => r.data);
};
export const createCategory = (data) =>
  api.post("/categories", data).then((r) => r.data);
export const updateCategory = (id, data) =>
  api.put(`/categories/${id}`, data).then((r) => r.data);
export const deleteCategory = (id) =>
  api.delete(`/categories/${id}`).then((r) => r.data);

// ======== RESULTS ========
export const getResults = (filters = {}) =>
  api.get("/results", { params: filters }).then((r) => r.data);
export const getResultsPaginated = (params) =>
  api.get("/results", { params }).then((r) => r.data);
export const getResultDetail = (id) =>
  api.get(`/results/${id}`).then((r) => r.data);
export const createResult = (data) =>
  api.post("/results", data).then((r) => r.data);
export const updateResult = (id, data) =>
  api.put(`/results/${id}`, data).then((r) => r.data);
export const deleteResult = (id) =>
  api.delete(`/results/${id}`).then((r) => r.data);

// ======== LEADERBOARD ========
export const getLeaderboard = (categoryId) => {
  const params = { category_id: categoryId };
  return api.get("/leaderboard", { params }).then((r) => r.data);
};
export const getExerciseLeaderboard = (exerciseId) =>
  api.get(`/leaderboard/exercise/${exerciseId}`).then((r) => r.data);
export const getUserLeaderboard = (userId) =>
  api.get(`/leaderboard/user/${userId}`).then((r) => r.data);
export const getSummary = () =>
  api.get("/leaderboard/summary").then((r) => r.data);

// ======== CALENDAR ========
export const getCalendarMonth = (month) =>
  api.get("/calendar/month", { params: { month } }).then((r) => r.data);

// ======== ANALYTICS ========
export const getAnalyticsProgress = (categoryId, params = {}) =>
  api
    .get("/analytics/progress", {
      params: { category_id: categoryId, ...params },
    })
    .then((r) => r.data);
export const getAnalyticsWeekly = (weeks) =>
  api.get("/analytics/weekly", { params: { weeks } }).then((r) => r.data);
export const getAnalyticsMonthly = (months) =>
  api.get("/analytics/monthly", { params: { months } }).then((r) => r.data);
export const getAnalyticsPeriodStats = (params) =>
  api.get("/analytics/period-stats", { params }).then((r) => r.data);
export const getAnalyticsStreak = () =>
  api.get("/analytics/streak").then((r) => r.data);
export const getPersonalRecords = () =>
  api.get("/analytics/personal-records").then((r) => r.data);
export const getAnalyticsSummary = () =>
  api.get("/analytics/summary").then((r) => r.data);

// ======== SCHEDULE ========
export const getScheduledWorkouts = (params = {}) =>
  api.get("/schedule", { params }).then((r) => r.data);
export const getTodaySchedule = () =>
  api.get("/schedule/today").then((r) => r.data);
export const getScheduledWorkout = (id) =>
  api.get(`/schedule/${id}`).then((r) => r.data);
export const createScheduledWorkout = (data) =>
  api.post("/schedule", data).then((r) => r.data);
export const updateScheduledWorkout = (id, data) =>
  api.put(`/schedule/${id}`, data).then((r) => r.data);
export const completeScheduledWorkout = (id) =>
  api.put(`/schedule/${id}/complete`).then((r) => r.data);
export const deleteScheduledWorkout = (id) =>
  api.delete(`/schedule/${id}`).then((r) => r.data);

export default api;
