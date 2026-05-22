import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach the saved auth token to every request.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("tl_token");
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

export async function register(payload) {
  const { data } = await client.post("/auth/register/", payload);
  return data;
}

export async function login(username, password) {
  const { data } = await client.post("/auth/login/", { username, password });
  return data;
}

export async function fetchMe() {
  const { data } = await client.get("/auth/me/");
  return data.driver;
}

export async function getTripHistory(confirmedOnly = false) {
  const { data } = await client.get("/trips/", {
    params: confirmedOnly ? { status: "confirmed" } : {},
  });
  return data.trips;
}

export async function confirmTrip(id) {
  const { data } = await client.post(`/trip/${id}/confirm/`);
  return data;
}

export async function calculateTrip(inputs) {
  const { data } = await client.post("/trip/calculate/", {
    current_location: inputs.current,
    pickup_location: inputs.pickup,
    dropoff_location: inputs.dropoff,
    cycle_used_hours: inputs.cycleUsedHours,
  });
  return data;
}

export async function getTripById(id) {
  const { data } = await client.get(`/trip/${id}/`);
  return data;
}

const NOMINATIM = "https://nominatim.openstreetmap.org";

export async function searchAddress(query) {
  if (!query || query.trim().length < 3) return [];
  const { data } = await axios.get(`${NOMINATIM}/search`, {
    params: { q: query, format: "json", limit: 5, addressdetails: 1 },
  });
  return data.map((r) => ({
    address: r.display_name,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  }));
}

export async function reverseGeocode(lat, lon) {
  const { data } = await axios.get(`${NOMINATIM}/reverse`, {
    params: { lat, lon, format: "json" },
  });
  return {
    address: data.display_name,
    lat: parseFloat(data.lat),
    lon: parseFloat(data.lon),
  };
}
