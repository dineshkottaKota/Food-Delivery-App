import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { toast } from 'react-toastify';
import Orders from '../../Admin/src/pages/Orders/Orders.jsx';

vi.mock('axios');
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const MOCK_ORDERS = [
  {
    _id: 'ord_100',
    items: [
      { name: 'Greek Salad', quantity: 2 },
      { name: 'Veg Rolls', quantity: 1 },
    ],
    amount: 41,
    status: 'Food Processing',
    address: {
      firstName: 'Jane',
      lastName: 'Doe',
      street: '42 Elm St',
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      zipcode: '78701',
      phone: '555-0199',
    },
  },
];

describe('Admin Orders Page', () => {
  const testUrl = 'http://localhost:4000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and renders all customer orders and delivery details', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, data: MOCK_ORDERS } });

    render(<Orders url={testUrl} />);

    await waitFor(() => {
      expect(screen.getByText('Greek Salad x 2, Veg Rolls x 1')).toBeInTheDocument();
    });
    expect(axios.get).toHaveBeenCalledWith('http://localhost:4000/api/order/list');
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('42 Elm St,')).toBeInTheDocument();
    expect(screen.getByText('Austin, TX, USA, 78701')).toBeInTheDocument();
    expect(screen.getByText('555-0199')).toBeInTheDocument();
    expect(screen.getByText('Items : 2')).toBeInTheDocument();
    expect(screen.getByText('$41')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('Food Processing');
  });

  it('shows error toast when fetching orders fails', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: false } });

    render(<Orders url={testUrl} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error');
    });
  });

  it('updates order status and re-fetches orders when dropdown changes', async () => {
    const user = userEvent.setup();
    axios.get
      .mockResolvedValueOnce({ data: { success: true, data: MOCK_ORDERS } })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ ...MOCK_ORDERS[0], status: 'Out for delivery' }],
        },
      });
    axios.post.mockResolvedValueOnce({ data: { success: true, message: 'Status Updated' } });

    render(<Orders url={testUrl} />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue('Food Processing');
    });

    await user.selectOptions(screen.getByRole('combobox'), 'Out for delivery');

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue('Out for delivery');
    });
    expect(axios.post).toHaveBeenCalledWith('http://localhost:4000/api/order/status', {
      orderId: 'ord_100',
      status: 'Out for delivery',
    });
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  it('shows error toast when status update fails', async () => {
    const user = userEvent.setup();
    axios.get.mockResolvedValueOnce({ data: { success: true, data: MOCK_ORDERS } });
    axios.post.mockResolvedValueOnce({ data: { success: false } });

    render(<Orders url={testUrl} />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue('Food Processing');
    });

    await user.selectOptions(screen.getByRole('combobox'), 'Delivered');

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error');
    });
  });
});
