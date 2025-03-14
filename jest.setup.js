// Import Jest DOM extensions for React Testing Library
import '@testing-library/jest-dom';

// Mock global fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Suppress console errors during tests
console.error = jest.fn(); 