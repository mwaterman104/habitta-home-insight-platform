import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./client/**/*.{ts,tsx}",
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
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        serif: ['IBM Plex Serif', 'serif'],
      },
      fontSize: {
        // Headers (Serif) - use with font-serif
        'h1': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '600' }],   // 28px/36px
        'h2': ['1.375rem', { lineHeight: '1.875rem', fontWeight: '500' }], // 22px/30px
        'h3': ['1.125rem', { lineHeight: '1.625rem', fontWeight: '500' }], // 18px/26px
        // Body (Sans)
        'body': ['0.9375rem', { lineHeight: '1.375rem' }],     // 15px/22px
        'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],    // 14px/20px
        'meta': ['0.75rem', { lineHeight: '1rem' }],           // 12px/16px
        // Labels & Controls
        'label': ['0.8125rem', { lineHeight: '1rem', letterSpacing: '0.2px' }], // 13px
        // KPI
        'kpi': ['1.25rem', { lineHeight: '1.5rem', fontWeight: '600' }],     // 20px
        'kpi-lg': ['1.5rem', { lineHeight: '1.75rem', fontWeight: '600' }],  // 24px
      },
      letterSpacing: {
        tightest: '-0.02em',
      },
      borderWidth: {
        '3': '3px',
      },
      colors: {
        habitta: {
          ivory: '#F9F7F2',
          charcoal: '#2D2D2D',
          stone: '#8C8A84',
          slate: '#5A7684',
          clay: '#A66D5B',
          olive: '#747D63',
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
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
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
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
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
