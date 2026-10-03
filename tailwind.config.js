/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta da logo oficial do OrçaVidro Pro
        navy: {
          DEFAULT: '#0B2A6E', // azul marinho do fundo da logo
          dark: '#071D4D',
          light: '#16388F',
        },
        brand: {
          light: '#E2F3FE', // fundo suave
          tint: '#C4E4FB', // borda suave
          DEFAULT: '#0FA0F2', // azul brilhante dos destaques da logo
          dark: '#0B7CC4', // para textos/destaques sobre fundo claro
        },
      },
    },
  },
  plugins: [],
};
