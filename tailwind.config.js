/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        // Core Figma Colors
        "main": "var(--main-color)",
        "teal": "var(--main-color)",

        // Semantic Colors
        "success": {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },
        "info": {
          DEFAULT: "var(--info)",
          foreground: "var(--info-foreground)",
        },

        // Grey Scale
        grey: {
          200: "var(--grey-200)",
          800: "var(--grey-800)",
        },

        // Component Tokens
        border: "var(--border)",
        input: "var(--input-bg)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      fontFamily: {
        sans: ["'Urbanist'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      boxShadow: {
        "floating-sm": "0 6px 40px -12px rgba(16, 20, 26, 0.16)",
      },
    },
  },
  plugins: [],
};
