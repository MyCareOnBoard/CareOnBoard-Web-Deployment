import { render, screen } from './test-utils';
import { describe, it, beforeAll, expect } from 'vitest';
import App from './App';

// Mock the document object
beforeAll(() => {
  // @ts-ignore
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

describe('App', () => {
  it('renders the splash screen by default', async () => {
    render(<App />);

    // Check if the splash screen is rendered
    const splashHeading = await screen.findByRole('heading', { name: /splash screen/i });
    expect(splashHeading).to.exist;
    expect(splashHeading.textContent).to.include('Splash Screen');
  });

  it('renders the main content area', async () => {
    render(<App />);

    // Check if the splash screen content is visible
    const splashContent = await screen.findByText(/splash screen/i);
    expect(splashContent).to.exist;
  });
});
