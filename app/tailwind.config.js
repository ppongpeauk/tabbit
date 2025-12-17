/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Tailwind CSS configuration for NativeWind v4
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};

