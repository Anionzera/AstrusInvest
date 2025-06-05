import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { tempo } from "tempo-devtools/dist/vite";

const conditionalPlugins: [string, Record<string, any>][] = [];

// @ts-ignore
if (process.env.TEMPO === "true") {
  conditionalPlugins.push(["tempo-devtools/swc", {}]);
}

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === "development" ? "/" : process.env.VITE_BASE_PATH || "/",
  optimizeDeps: {
    entries: ["src/main.tsx", "src/tempobook/**/*"],
  },
  plugins: [
    react({
      plugins: conditionalPlugins,
    }),
    tempo(),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // @ts-ignore
    allowedHosts: true,
    proxy: {
      // Proxy para API Python que utiliza yfinance
      '/api/market-data': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      // Proxy para API Binance
      '/api/binance': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Erro de proxy para a API:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Enviando requisição para API:', req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Recebendo resposta da API:', proxyRes.statusCode, req.url);
          });
        }
      },
      // Proxy para API de otimização de portfólio
      '/api/portfolio': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Erro de proxy para a API de portfólio:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Enviando requisição para API de portfólio:', req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Recebendo resposta da API de portfólio:', proxyRes.statusCode, req.url);
          });
        }
      },
      // Proxy para API de análise de performance
      '/api/performance': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Erro de proxy para a API de performance:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Enviando requisição para API de performance:', req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Recebendo resposta da API de performance:', proxyRes.statusCode, req.url);
          });
        }
      },
      // Proxy geral para todas as outras rotas da API
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Erro de proxy para a API:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Enviando requisição para API:', req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Recebendo resposta da API:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
});
