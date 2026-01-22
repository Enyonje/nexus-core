export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: "class", // enables dark mode toggle
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2563eb",
          purple: "#7c3aed",
        },
        status: {
          success: "#22c55e",
          warning: "#facc15",
          error: "#ef4444",
        },
      },
    },
  },
  plugins: [],
}