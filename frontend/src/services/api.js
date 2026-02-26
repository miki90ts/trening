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
export const getUsersPaginated = (params = {}) =>
  api.get("/users", { params }).then((r) => r.data);
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

// ======== FOODS ========
export const getFoods = (params = {}) =>
  api.get("/foods", { params }).then((r) => r.data);
export const getFoodsPaginated = (params = {}) =>
  api.get("/foods", { params }).then((r) => r.data);
export const getFood = (id) => api.get(`/foods/${id}`).then((r) => r.data);
export const createFood = (data) =>
  api.post("/foods", data).then((r) => r.data);
export const updateFood = (id, data) =>
  api.put(`/foods/${id}`, data).then((r) => r.data);
export const deleteFood = (id) =>
  api.delete(`/foods/${id}`).then((r) => r.data);

// ======== NUTRITION ========
export const getNutritionDay = (date) =>
  api.get("/nutrition/day", { params: { date } }).then((r) => r.data);
export const saveNutritionEntry = (data) =>
  api.post("/nutrition/entries", data).then((r) => r.data);
export const deleteNutritionEntry = (entryId) =>
  api.delete(`/nutrition/entries/${entryId}`).then((r) => r.data);
export const getNutritionHistory = (params = {}) =>
  api.get("/nutrition/history", { params }).then((r) => r.data);

// ======== NUTRITION ANALYTICS ========
export const getNutritionPeriodStats = (params = {}) =>
  api.get("/nutrition-analytics/period-stats", { params }).then((r) => r.data);
export const getNutritionSummary = () =>
  api.get("/nutrition-analytics/summary").then((r) => r.data);
export const getNutritionTopFoods = (params = {}) =>
  api.get("/nutrition-analytics/top-foods", { params }).then((r) => r.data);

// ======== METRICS (WEIGHT) ========
export const getWeightEntries = (params = {}) =>
  api.get("/metrics/entries", { params }).then((r) => r.data);
export const createWeightEntry = (data) =>
  api.post("/metrics/entries", data).then((r) => r.data);
export const updateWeightEntry = (id, data) =>
  api.put(`/metrics/entries/${id}`, data).then((r) => r.data);
export const deleteWeightEntry = (id) =>
  api.delete(`/metrics/entries/${id}`).then((r) => r.data);
export const getWeightPeriodStats = (params = {}) =>
  api.get("/metrics/period-stats", { params }).then((r) => r.data);
export const getWeightSummary = (params = {}) =>
  api.get("/metrics/summary", { params }).then((r) => r.data);

// ======== STEPS ========
export const getStepEntries = (params = {}) =>
  api.get("/steps/entries", { params }).then((r) => r.data);
export const createStepEntry = (data) =>
  api.post("/steps/entries", data).then((r) => r.data);
export const updateStepEntry = (id, data) =>
  api.put(`/steps/entries/${id}`, data).then((r) => r.data);
export const deleteStepEntry = (id) =>
  api.delete(`/steps/entries/${id}`).then((r) => r.data);
export const getStepPeriodStats = (params = {}) =>
  api.get("/steps/period-stats", { params }).then((r) => r.data);
export const getStepSummary = (params = {}) =>
  api.get("/steps/summary", { params }).then((r) => r.data);
export const getStepRecords = () =>
  api.get("/steps/records").then((r) => r.data);
export const getStepGoal = () => api.get("/steps/goal").then((r) => r.data);

// ======== HYDRATION ========
export const getHydrationEntries = (params = {}) =>
  api.get("/hydration/entries", { params }).then((r) => r.data);
export const createHydrationEntry = (data) =>
  api.post("/hydration/entries", data).then((r) => r.data);
export const updateHydrationEntry = (id, data) =>
  api.put(`/hydration/entries/${id}`, data).then((r) => r.data);
export const deleteHydrationEntry = (id) =>
  api.delete(`/hydration/entries/${id}`).then((r) => r.data);
export const getHydrationPeriodStats = (params = {}) =>
  api.get("/hydration/period-stats", { params }).then((r) => r.data);
export const getHydrationSummary = (params = {}) =>
  api.get("/hydration/summary", { params }).then((r) => r.data);
export const getHydrationRecords = () =>
  api.get("/hydration/records").then((r) => r.data);
export const getHydrationStreak = () =>
  api.get("/hydration/streak").then((r) => r.data);
export const getHydrationGoal = () =>
  api.get("/hydration/goal").then((r) => r.data);

// ======== SLEEP ========
export const getSleepEntries = (params = {}) =>
  api.get("/sleep/entries", { params }).then((r) => r.data);
export const createSleepEntry = (data) =>
  api.post("/sleep/entries", data).then((r) => r.data);
export const updateSleepEntry = (id, data) =>
  api.put(`/sleep/entries/${id}`, data).then((r) => r.data);
export const deleteSleepEntry = (id) =>
  api.delete(`/sleep/entries/${id}`).then((r) => r.data);
export const getSleepPeriodStats = (params = {}) =>
  api.get("/sleep/period-stats", { params }).then((r) => r.data);
export const getSleepSummary = (params = {}) =>
  api.get("/sleep/summary", { params }).then((r) => r.data);
export const getSleepRecords = () =>
  api.get("/sleep/records").then((r) => r.data);
export const getSleepStreak = () =>
  api.get("/sleep/streak").then((r) => r.data);
export const getSleepGoal = () =>
  api.get("/sleep/goal").then((r) => r.data);

// ======== ACTIVITY TYPES ========
export const getActivityTypes = (params = {}) =>
  api.get("/activity-types", { params }).then((r) => r.data);
export const createActivityType = (data) =>
  api.post("/activity-types", data).then((r) => r.data);
export const updateActivityType = (id, data) =>
  api.put(`/activity-types/${id}`, data).then((r) => r.data);
export const deleteActivityType = (id) =>
  api.delete(`/activity-types/${id}`).then((r) => r.data);

// ======== ACTIVITIES ========
export const getActivities = (params = {}) =>
  api.get("/activities", { params }).then((r) => r.data);
export const getActivityDetail = (id) =>
  api.get(`/activities/${id}`).then((r) => r.data);
export const getActivityExportData = (id) =>
  api.get(`/activities/${id}/export-data`).then((r) => r.data);
export const createActivity = (data) =>
  api.post("/activities", data).then((r) => r.data);
export const updateActivity = (id, data) =>
  api.put(`/activities/${id}`, data).then((r) => r.data);
export const deleteActivity = (id) =>
  api.delete(`/activities/${id}`).then((r) => r.data);

// ======== ACTIVITY ANALYTICS ========
export const getActivityPeriodStats = (params = {}) =>
  api.get("/activity-analytics/period-stats", { params }).then((r) => r.data);
export const getActivityPeriodExportData = (params = {}) =>
  api.get("/activity-analytics/period-export", { params }).then((r) => r.data);
export const getActivitySummary = () =>
  api.get("/activity-analytics/summary").then((r) => r.data);

// ======== CONTACT / SUPPORT ========
export const sendContactMessage = (data) =>
  api.post("/contact", data).then((r) => r.data);

// ======== WORKOUT PLANS ========
export const getPlans = () => api.get("/plans").then((r) => r.data);
export const getPlan = (id) => api.get(`/plans/${id}`).then((r) => r.data);
export const createPlan = (data) =>
  api.post("/plans", data).then((r) => r.data);
export const updatePlan = (id, data) =>
  api.put(`/plans/${id}`, data).then((r) => r.data);
export const deletePlan = (id) =>
  api.delete(`/plans/${id}`).then((r) => r.data);

// ======== PLAN SESSIONS ========
export const schedulePlan = (planId, data) =>
  api.post(`/plans/${planId}/schedule`, data).then((r) => r.data);
export const getSessions = (params = {}) =>
  api.get("/plans/sessions/list", { params }).then((r) => r.data);
export const getSession = (sessionId) =>
  api.get(`/plans/sessions/${sessionId}`).then((r) => r.data);
export const startSession = (sessionId) =>
  api.put(`/plans/sessions/${sessionId}/start`).then((r) => r.data);
export const updateSession = (sessionId, data) =>
  api.put(`/plans/sessions/${sessionId}`, data).then((r) => r.data);
export const completeSession = (sessionId) =>
  api.post(`/plans/sessions/${sessionId}/complete`).then((r) => r.data);
export const deleteSession = (sessionId) =>
  api.delete(`/plans/sessions/${sessionId}`).then((r) => r.data);

export default api;
