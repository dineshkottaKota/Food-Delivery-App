import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { toast } from 'react-toastify';
import List from '../../Admin/src/pages/List/List.jsx';

vi.mock('axios');
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Admin List Page', () => {
  const testUrl = 'http://localhost:4000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and displays all foods on mount', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          { _id: 'f1', name: 'Greek Salad', category: 'Salad', price: 12, image: 'food_1.png' },
          { _id: 'f2', name: 'Cake Slice', category: 'Cake', price: 15, image: 'food_20.png' },
        ],
      },
    });

    render(<List url={testUrl} />);

    await waitFor(() => {
      expect(screen.getByText('Greek Salad')).toBeInTheDocument();
      expect(screen.getByText('Cake Slice')).toBeInTheDocument();
    });
    expect(axios.get).toHaveBeenCalledWith('http://localhost:4000/api/food/list');
    expect(screen.getByText('$12')).toBeInTheDocument();
    expect(screen.getByText('$15')).toBeInTheDocument();
  });

  it('shows error toast when initial list fetch fails', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: false } });

    render(<List url={testUrl} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error');
    });
  });

  it('removes food item, refreshes list, and shows success toast', async () => {
    const user = userEvent.setup();
    axios.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ _id: 'f1', name: 'Greek Salad', category: 'Salad', price: 12, image: 'food_1.png' }],
        },
      })
      .mockResolvedValueOnce({ data: { success: true, data: [] } });
    axios.post.mockResolvedValueOnce({ data: { success: true, message: 'Food Removed' } });

    render(<List url={testUrl} />);

    await waitFor(() => {
      expect(screen.getByText('Greek Salad')).toBeInTheDocument();
    });

    await user.click(screen.getByText('x'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Food Removed');
    });
    expect(axios.post).toHaveBeenCalledWith('http://localhost:4000/api/food/remove', { id: 'f1' });
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Greek Salad')).not.toBeInTheDocument();
  });

  it('shows error toast when food removal fails', async () => {
    const user = userEvent.setup();
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: [{ _id: 'f1', name: 'Greek Salad', category: 'Salad', price: 12, image: 'food_1.png' }],
      },
    });
    axios.post.mockResolvedValueOnce({ data: { success: false } });

    render(<List url={testUrl} />);
    await waitFor(() => {
      expect(screen.getByText('Greek Salad')).toBeInTheDocument();
    });

    await user.click(screen.getByText('x'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error');
    });
  });
});
