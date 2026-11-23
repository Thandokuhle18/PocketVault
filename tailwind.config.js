/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vault: { DEFAULT: "#1F4D3A", dark: "#173B2C" },
        lime: "#D6E64B",
        gold: "#E6B73F",
        sage: "#9DB59A",
        mist: "#B9CCD6",
        cream: "#FAF6EA",
        ink: "#14281F",
        moss: "#4A5D52",
        danger: "#B3261E",
        success: "#1B7A43",
        warn: "#7A5200",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        big: ["32px", { lineHeight: "40px", fontWeight: "700" }],
        title: ["24px", { lineHeight: "32px", fontWeight: "700" }],
        heading: ["18px", { lineHeight: "26px", fontWeight: "600" }],
        body: ["16px", { lineHeight: "24px", fontWeight: "400" }],
        small: ["12px", { lineHeight: "16px", fontWeight: "400" }],
      },
      borderRadius: {
        card: "16px",
        control: "12px",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(20, 40, 31, 0.08)",
      },
    },
  },
  plugins: [],
};
