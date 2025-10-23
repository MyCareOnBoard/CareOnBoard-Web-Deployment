import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { router } from './routes';
import { vi } from 'vitest';

// Mock the router
const mockNavigate = vi.fn();


const TestWrapper = () => {
  // Create a test router with the app's routes
  const testRouter = createMemoryRouter(router.routes, {
    initialEntries: ['/applicant/application'],
    initialIndex: 0,
  });

  return <RouterProvider router={testRouter} />;
};

// Custom render function that includes the router provider
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return rtlRender(ui, {
    wrapper: TestWrapper,
    ...options,
  });
};

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Override the render method with our custom one
export { customRender as render };

export { mockNavigate };
