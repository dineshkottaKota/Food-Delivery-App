import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

beforeEach(() => {
  localStorage.clear();
  window.alert = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
