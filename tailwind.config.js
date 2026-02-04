/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        doctor: {
          light: '#EFF6FF',
          DEFAULT: '#3B82F6',
          dark: '#1E40AF',
        },
        patient: {
          light: '#ECFDF5',
          DEFAULT: '#10B981',
          dark: '#047857',
        }
      }
    },
  },
  plugins: [],
}
