import React, { createContext, useContext, useReducer, useEffect } from "react";
import * as api from "../services/api";

const AppContext = createContext();

const initialState = {
  users: [],
  exercises: [],
  categories: [],
  results: [],
  summary: null,
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "SET_USERS":
      return { ...state, users: action.payload };
    case "ADD_USER":
      return { ...state, users: [...state.users, action.payload] };
    case "UPDATE_USER":
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.payload.id ? action.payload : u,
        ),
      };
    case "DELETE_USER":
      return {
        ...state,
        users: state.users.filter((u) => u.id !== action.payload),
      };
    case "SET_EXERCISES":
      return { ...state, exercises: action.payload };
    case "ADD_EXERCISE":
      return { ...state, exercises: [...state.exercises, action.payload] };
    case "UPDATE_EXERCISE":
      return {
        ...state,
        exercises: state.exercises.map((e) =>
          e.id === action.payload.id ? action.payload : e,
        ),
      };
    case "DELETE_EXERCISE":
      return {
        ...state,
        exercises: state.exercises.filter((e) => e.id !== action.payload),
      };
    case "SET_CATEGORIES":
      return { ...state, categories: action.payload };
    case "ADD_CATEGORY":
      return { ...state, categories: [...state.categories, action.payload] };
    case "UPDATE_CATEGORY":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.id ? action.payload : c,
        ),
      };
    case "SET_RESULTS":
      return { ...state, results: action.payload };
    case "ADD_RESULT":
      return { ...state, results: [action.payload, ...state.results] };
    case "SET_SUMMARY":
      return { ...state, summary: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadInitialData = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const [users, exercises, categories] = await Promise.all([
        api.getUsers(),
        api.getExercises(),
        api.getCategories(),
      ]);
      dispatch({ type: "SET_USERS", payload: users });
      dispatch({ type: "SET_EXERCISES", payload: exercises });
      dispatch({ type: "SET_CATEGORIES", payload: categories });
      dispatch({ type: "SET_LOADING", payload: false });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const value = {
    ...state,
    dispatch,
    loadInitialData,

    // User actions
    addUser: async (data) => {
      const user = await api.createUser(data);
      dispatch({ type: "ADD_USER", payload: user });
      return user;
    },
    editUser: async (id, data) => {
      const user = await api.updateUser(id, data);
      dispatch({ type: "UPDATE_USER", payload: user });
      return user;
    },
    removeUser: async (id) => {
      await api.deleteUser(id);
      dispatch({ type: "DELETE_USER", payload: id });
    },

    // Exercise actions
    addExercise: async (data) => {
      const ex = await api.createExercise(data);
      dispatch({ type: "ADD_EXERCISE", payload: ex });
      return ex;
    },
    editExercise: async (id, data) => {
      const ex = await api.updateExercise(id, data);
      dispatch({ type: "UPDATE_EXERCISE", payload: ex });
      return ex;
    },
    removeExercise: async (id) => {
      await api.deleteExercise(id);
      dispatch({ type: "DELETE_EXERCISE", payload: id });
    },

    // Category actions
    addCategory: async (data) => {
      const cat = await api.createCategory(data);
      dispatch({ type: "ADD_CATEGORY", payload: cat });
      await loadInitialData();
      return cat;
    },
    editCategory: async (id, data) => {
      const cat = await api.updateCategory(id, data);
      dispatch({ type: "UPDATE_CATEGORY", payload: cat });
      await loadInitialData();
      return cat;
    },

    // Result actions
    submitResult: async (data) => {
      const result = await api.createResult(data);
      dispatch({ type: "ADD_RESULT", payload: result });
      return result;
    },
    loadResults: async (filters) => {
      const results = await api.getResults(filters);
      dispatch({ type: "SET_RESULTS", payload: results });
      return results;
    },

    // Leaderboard
    loadSummary: async () => {
      const summary = await api.getSummary();
      dispatch({ type: "SET_SUMMARY", payload: summary });
      return summary;
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
