import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import StoreContextProvider from '../../Frontend/src/components/context/StoreContext.jsx';
import Verify from '../../Frontend/src/pages/Verify/Verify.jsx';
import MyOrders from '../../Frontend/src/pages/MyOrders/MyOrders.jsx';

vi.mock('axios');

describe('Verify and MyOrders Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });
  });

  function renderRoutes(initialUrl) {
    return render(
      <MemoryRouter initialEntries={[initialUrl]}>
        <StoreContextProvider>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/myorders" element={<MyOrders />} />
          </Routes>
        </StoreContextProvider>
      </MemoryRouter>
    );
  }

  it('verifies successful payment and redirects to /myorders', async () => {
    axios.post.mockImplementation(async (endpoint) => {
      if (endpoint.endsWith('/api/order/verify')) {
        return { data: { success: true, message: 'Paid' } };
      }
      return { data: { success: true, data: [] } };
    });

    renderRoutes('/verify?success=true&orderId=ord_99');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'My Orders' })).toBeInTheDocument();
    });
    expect(axios.post).toHaveBeenCalledWith(
      'https://food-delivery-app-1-faqc.onrender.com/api/order/verify',
      { success: 'true', orderId: 'ord_99' }
    );
  });

  it('redirects to / when payment verification returns success: false', async () => {
    axios.post.mockImplementation(async (endpoint) => {
      if (endpoint.endsWith('/api/order/verify')) {
        return { data: { success: false, message: 'Not Paid' } };
      }
      return { data: { success: true, data: [] } };
    });

    renderRoutes('/verify?success=false&orderId=ord_99');

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
  });

  it('fetches and renders user orders on MyOrders and refreshes on Track Order click', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'user-jwt');

    let ordersCallCount = 0;
    axios.post.mockImplementation(async (endpoint) => {
      if (endpoint.endsWith('/api/cart/get')) {
        return { data: { success: true, cartData: {} } };
      }
      if (endpoint.endsWith('/api/order/userorders')) {
        ordersCallCount += 1;
        return {
          data: {
            success: true,
            data: [
              {
                _id: 'ord_1',
                items: [
                  { name: 'Greek Salad', quantity: 2 },
                  { name: 'Veg Rolls', quantity: 1 },
                ],
                amount: 41,
                status: ordersCallCount === 1 ? 'Food Processing' : 'Out for delivery',
              },
            ],
          },
        };
      }
      return { data: { success: true } };
    });

    renderRoutes('/myorders');

    await waitFor(() => {
      expect(screen.getByText('Greek Salad x 2, Veg Rolls x 1')).toBeInTheDocument();
    });
    expect(screen.getByText('$41.00')).toBeInTheDocument();
    expect(screen.getByText('Items: 2')).toBeInTheDocument();
    expect(screen.getByText('Food Processing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Track Order' }));

    await waitFor(() => {
      expect(screen.getByText('Out for delivery')).toBeInTheDocument();
    });
    expect(ordersCallCount).toBe(2);
  });
});
