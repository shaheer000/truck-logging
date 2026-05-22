/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Driven by CSS custom properties so dark mode swaps automatically.
        bg: "var(--bg)",
        "bg-subtle": "var(--bg-subtle)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        primary: {
          DEFAULT: "#2563EB",
          600: "#1D4ED8",
          700: "#1E40AF",
          100: "#DBEAFE",
          50: "#EFF6FF",
        },
        accent: {
          DEFAULT: "#F97316",
          600: "#EA580C",
          100: "#FFEDD5",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          faint: "var(--text-faint)",
          inverse: "#FFFFFF",
        },
        hos: {
          driving: "#22C55E",
          "on-duty": "#F59E0B",
          sleeper: "#818CF8",
          "off-duty": "#94A3B8",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
      },
      fontFamily: {
        display: ['"Fraunces"', "serif"],
        sans: ['"Geist"', "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "monospace"],
      },
      spacing: {
        1: "4px", 2: "8px", 3: "12px", 4: "16px", 5: "20px",
        6: "24px", 8: "32px", 10: "40px", 12: "48px", 16: "64px",
      },
      borderRadius: {
        sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)",
      },
      maxWidth: { content: "1120px" },
      transitionDuration: {
        micro: "100ms", short: "150ms", medium: "250ms", long: "400ms",
      },
    },
  },
  plugins: [],
};
