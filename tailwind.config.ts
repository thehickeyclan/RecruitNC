import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        /**
         * RecruitNC palette — the dark navy actually shipped on the public pages.
         *
         * Use these instead of hardcoding hexes. Prior to this the home page inlined
         * #0A1628/#13294B/#D3B574/#BC0B03 while the nc-* tokens below declared a different,
         * lighter brand, so three near-miss navies and two golds coexisted on one screen.
         * The nc-* tokens are kept for the pages still on them.
         */
        rnc: {
          // Surfaces, darkest → lightest
          ink: "#0A1628", // page background
          surface: "#0f1c2e", // stats bar, inset panels
          raised: "#13294B", // cards, buttons
          line: "#1a3a5f", // borders, hairlines
          gold: {
            DEFAULT: "#D3B574",
            hover: "#c4a665",
          },
          red: {
            DEFAULT: "#BC0B03",
            hover: "#a00a03",
          },
        },
        // Fox News–style / NC United branding (primary blue = Fox blue)
        "nc-blue": "#003366", // Fox blue (footer, nav, primary surfaces)
        "nc-navy": {
          DEFAULT: "#002147",
          600: "#001a3a",
          700: "#00132d",
          800: "#000d1f",
          900: "#000813",
          950: "#003366",
        },
        "fox-blue": "#003366",
        "nc-red": {
          DEFAULT: "#B31B1B",
          50: "#fdf5f5",
          100: "#fce8e8",
          200: "#f5cfcf",
          600: "#8c1414",
          700: "#751010",
          800: "#5e0c0c",
        },
        "nc-gold": {
          DEFAULT: "#CBAF5D",
          800: "#CBAF5D", // Gold
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
}

export default config
