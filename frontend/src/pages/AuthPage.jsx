import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/tripStore";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuthStore();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    license_number: "",
    carrier: "",
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isRegister) {
        await register(form);
      } else {
        await login(form.username, form.password);
      }
      navigate("/plan");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : detail
          ? Object.values(detail).flat().join(" ")
          : "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-bg px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <span className="grid place-items-center w-8 h-8 rounded-md bg-primary text-base">🚛</span>
          <span className="font-display text-lg font-semibold">
            Truck<span className="text-primary">Log</span> Pro
          </span>
        </Link>

        <div className="card rounded-xl">
          <h1 className="font-display text-2xl font-semibold mb-1">
            {isRegister ? "Register as a driver" : "Welcome back"}
          </h1>
          <p className="text-sm text-text-muted mb-6">
            {isRegister
              ? "Create an account to save and confirm your trip history."
              : "Sign in to access your trips and log history."}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-2">
                  Full name
                </label>
                <input
                  className="input"
                  value={form.full_name}
                  onChange={set("full_name")}
                  required
                  placeholder="e.g. Jordan Doe"
                />
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-2">
                Username
              </label>
              <input
                className="input"
                value={form.username}
                onChange={set("username")}
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-2">
                Password
              </label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={set("password")}
                required
                minLength={6}
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>

            {isRegister && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-2">
                    License # <span className="text-text-faint">(optional)</span>
                  </label>
                  <input className="input" value={form.license_number} onChange={set("license_number")} />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-2">
                    Carrier <span className="text-text-faint">(optional)</span>
                  </label>
                  <input className="input" value={form.carrier} onChange={set("carrier")} />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-error/10 border border-error text-error px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-text-muted text-center mt-5">
            {isRegister ? "Already have an account?" : "New driver?"}{" "}
            <button
              onClick={() => {
                setMode(isRegister ? "login" : "register");
                setError(null);
              }}
              className="text-primary font-medium hover:underline"
            >
              {isRegister ? "Sign in" : "Register"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
