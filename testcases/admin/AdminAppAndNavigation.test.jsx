import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import App from '../../Admin/src/App.jsx';

vi.mock('axios');

describe('Admin App Navigation and Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });
  });

  it('renders sidebar links and navigates between /add, /list, and /orders', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/add']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('Add Items')).toBeInTheDocument();
    expect(screen.getByText('List Items')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ADD' })).toBeInTheDocument();

    await user.click(screen.getByText('List Items'));
    await waitFor(() => {
      expect(screen.getByText('All Foods List')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Orders'));
    await waitFor(() => {
      expect(screen.getByText('Order Page')).toBeInTheDocument();
    });
  });
});
