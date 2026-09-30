import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                border: "#e5e7eb", // example custom color, use as 'border-border'
            },
            fontFamily: {
                // Tailwind defaults: system stacks
                sans: ["ui-sans-serif", "system-ui", "sans-serif"],
                mono: ["ui-monospace", "SFMono-Regular", "monospace"],
            },
        },
    },
    plugins: [
        // add plugins here if needed, e.g. require("@tailwindcss/forms")
    ],
};

export default config;
