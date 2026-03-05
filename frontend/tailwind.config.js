/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Nunito', 'sans-serif'],
            },
            colors: {
                brand: {
                    50: '#fef3f2',
                    100: '#fde8e7',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                },
            },
        },
    },
    plugins: [],
};
