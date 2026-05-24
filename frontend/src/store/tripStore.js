import { create } from "zustand";
import {
  calculateTrip,
  confirmTrip,
  editTripEvents,
  login as apiLogin,
  register as apiRegister,
} from "../api/tripApi";

export const useAuthStore = create((set) => ({
  token: localStorage.getItem("tl_token") || null,
  driver: JSON.parse(localStorage.getItem("tl_driver") || "null"),

  _persist(token, driver) {
    localStorage.setItem("tl_token", token);
    localStorage.setItem("tl_driver", JSON.stringify(driver));
    set({ token, driver });
  },

  register: async (payload) => {
    const data = await apiRegister(payload);
    useAuthStore.getState()._persist(data.token, data.driver);
    return data;
  },

  login: async (username, password) => {
    const data = await apiLogin(username, password);
    useAuthStore.getState()._persist(data.token, data.driver);
    return data;
  },

  logout: () => {
    localStorage.removeItem("tl_token");
    localStorage.removeItem("tl_driver");
    set({ token: null, driver: null });
  },
}));

const emptyInputs = {
  current: null,
  pickup: null,
  dropoff: null,
  cycleUsedHours: 0,
  // Log-sheet header fields (optional, surfaced on the printed log).
  coDriver: "",
  truckNumber: "",
  trailerNumber: "",
  licensePlate: "",
  bolNumber: "",
  shipper: "",
  commodity: "",
  mainOfficeAddress: "",
  homeTerminalAddress: "",
};

export const useTripStore = create((set, get) => ({
  inputs: { ...emptyInputs },
  currentStep: 1,
  tripData: null,
  loading: false,
  error: null,

  setLocation: (key, location) =>
    set((s) => ({ inputs: { ...s.inputs, [key]: location } })),

  setCycleHours: (hours) =>
    set((s) => ({ inputs: { ...s.inputs, cycleUsedHours: hours } })),

  setLogField: (field, value) =>
    set((s) => ({ inputs: { ...s.inputs, [field]: value } })),

  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(5, s.currentStep + 1) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(1, s.currentStep - 1) })),

  submitTrip: async () => {
    set({ loading: true, error: null });
    try {
      const data = await calculateTrip(get().inputs);
      set({ tripData: data, loading: false });
      return data;
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        "We couldn't calculate this trip. Please check your locations and try again.";
      set({ error: detail, loading: false });
      throw err;
    }
  },

  confirmCurrentTrip: async () => {
    const trip = get().tripData;
    if (!trip) return;
    const res = await confirmTrip(trip.trip_id);
    set({ tripData: { ...trip, status: res.status } });
  },

  saveEditedSheets: async (sheets) => {
    const trip = get().tripData;
    if (!trip) return;
    const updated = await editTripEvents(trip.trip_id, sheets);
    set({ tripData: updated });
    return updated;
  },

  clearTrip: () =>
    set({ inputs: { ...emptyInputs }, currentStep: 1, tripData: null, error: null }),
}));

// Theme store (light default, dark toggle).
export const useThemeStore = create((set) => ({
  dark: false,
  toggle: () =>
    set((s) => {
      const dark = !s.dark;
      document.documentElement.classList.toggle("dark", dark);
      return { dark };
    }),
}));
