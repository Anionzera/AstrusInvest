import { jest, afterEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock para localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock do ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

// Configuração do timeout global
jest.setTimeout(10000);

// Limpa todos os mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
});

// Configuração das variáveis de ambiente para testes
process.env.REACT_APP_ALPHA_VANTAGE_API_KEY = 'test_api_key';
process.env.REACT_APP_MARKET_DATA_CACHE_DURATION = '24';
process.env.REACT_APP_MARKET_DATA_UPDATE_INTERVAL = '3600';
process.env.REACT_APP_USE_MOCK_DATA = 'true';
process.env.REACT_APP_MOCK_DATA_REFRESH_INTERVAL = '86400';
