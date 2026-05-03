import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import './__mocks__/browserMocks';

// Mock for react-router
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: () => ({
      pathname: '/',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    }),
  };
});

// Mock for window.scrollTo
window.scrollTo = vi.fn();

// Mock for ResizeObserver (needed by Radix UI Slider)
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
