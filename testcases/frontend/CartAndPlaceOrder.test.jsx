import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import StoreContextProvider from '../../Frontend/src/components/context/StoreContext.jsx';
import Cart from '../../Frontend/src/pages/Cart/Cart.jsx';
import PlaceOrder from '../../Frontend/src/pages/PlaceOrder/PlaceOrder.jsx';

vi.mock('axios');

const MOCK_FOODS = [
  { _id: 'f1', name: 'Greek Salad', price: 12, description: 'Fresh', image: 'food_1.png', category: 'Salad' },
  { _id: 'f2', name: 'Veg Rolls', price: 15, description: 'Crispy', image: 'food_8.png', category: 'Rolls' },
];

describe('Cart and PlaceOrder Pages', () => {
  const originalLocation = window.location;
  let replaceSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    replaceSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, replace: replaceSpy },
    });
    axios.get.mockResolvedValue({ data: { success: true, data: MOCK_FOODS } });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  function renderCartFlow(initialRoute = '/cart') {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <StoreContextProvider>
          <Routes>
            <Route path="/cart" element={<Cart />} />
            <Route path="/order" element={<PlaceOrder />} />
          </Routes>
        </StoreContextProvider>
      </MemoryRouter>
    );
  }

  it('displays $0 totals when cart is empty', async () => {
    renderCartFlow('/cart');

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    expect(screen.getByText('Cart Totals')).toBeInTheDocument();
    expect(screen.getAllByText('$0')).toHaveLength(3);
  });

  it('renders cart line items, removes an item, and navigates to checkout', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'user-token');
    axios.post.mockImplementation(async (endpoint) => {
      if (endpoint.endsWith('/api/cart/get')) {
        return { data: { success: true, cartData: { f1: 2, f2: 1 } } };
      }
      return { data: { success: true } };
    });

    renderCartFlow('/cart');

    await waitFor(() => {
      expect(screen.getByText('Greek Salad')).toBeInTheDocument();
      expect(screen.getByText('Veg Rolls')).toBeInTheDocument();
    });

    expect(screen.getByText('$39')).toBeInTheDocument();
    expect(screen.getByText('$2')).toBeInTheDocument();
    expect(screen.getByText('$41')).toBeInTheDocument();

    const removeButtons = screen.getAllByText('X');
    await user.click(removeButtons[0]);

    expect(screen.getByText('$27')).toBeInTheDocument();
    expect(screen.getByText('$29')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'PROCEED TO CHECKOUT' }));
    expect(screen.getByText('Delivery Information')).toBeInTheDocument();
  });

  it('redirects PlaceOrder back to /cart when unauthenticated', async () => {
    renderCartFlow('/order');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'PROCEED TO CHECKOUT' })).toBeInTheDocument();
    });
  });

  it('submits PlaceOrder form and redirects to Stripe session_url on success', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'user-token');
    axios.post.mockImplementation(async (endpoint) => {
      if (endpoint.endsWith('/api/cart/get')) {
        return { data: { success: true, cartData: { f1: 2 } } };
      }
      if (endpoint.endsWith('/api/order/place')) {
        return { data: { success: true, session_url: 'https://checkout.stripe.com/pay/test_session' } };
      }
      return { data: { success: true } };
    });

    renderCartFlow('/cart');

    await waitFor(() => {
      expect(screen.getByText('Greek Salad')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'PROCEED TO CHECKOUT' }));

    await user.type(screen.getByPlaceholderText('First name'), 'John');
    await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
    await user.type(screen.getByPlaceholderText('Email Address'), 'john@example.com');
    await user.type(screen.getByPlaceholderText('Street'), '100 Main St');
    await user.type(screen.getByPlaceholderText('City'), 'Austin');
    await user.type(screen.getByPlaceholderText('State'), 'TX');
    await user.type(screen.getByPlaceholderText('Zip code'), '78701');
    await user.type(screen.getByPlaceholderText('Country'), 'USA');
    await user.type(screen.getByPlaceholderText('phone'), '5551234567');

    await user.click(screen.getByRole('button', { name: 'PROCEED TO PAYMENT' }));

    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalledWith('https://checkout.stripe.com/pay/test_session');
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://food-delivery-app-1-faqc.onrender.com/api/order/place',
      {
        address: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          street: '100 Main St',
          city: 'Austin',
          state: 'TX',
          zipcode: '78701',
          country: 'USA',
          phone: '5551234567',
        },
        items: [{ ...MOCK_FOODS[0], quantity: 2 }],
        amount: 26,
      },
      { headers: { token: 'user-token' } }
    );
  });

  it('alerts Error when PlaceOrder API responds with success: false', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'user-token');
    axios.post.mockImplementation(async (endpoint) => {
      if (endpoint.endsWith('/api/cart/get')) {
        return { data: { success: true, cartData: { f1: 1 } } };
      }
      if (endpoint.endsWith('/api/order/place')) {
        return { data: { success: false, message: 'Error' } };
      }
      return { data: { success: true } };
    });

    renderCartFlow('/cart');
    await waitFor(() => {
      expect(screen.getByText('Greek Salad')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'PROCEED TO CHECKOUT' }));
    await user.type(screen.getByPlaceholderText('First name'), 'John');
    await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
    await user.type(screen.getByPlaceholderText('Email Address'), 'john@example.com');
    await user.type(screen.getByPlaceholderText('Street'), '100 Main St');
    await user.type(screen.getByPlaceholderText('City'), 'Austin');
    await user.type(screen.getByPlaceholderText('State'), 'TX');
    await user.type(screen.getByPlaceholderText('Zip code'), '78701');
    await user.type(screen.getByPlaceholderText('Country'), 'USA');
    await user.type(screen.getByPlaceholderText('phone'), '5551234567');

    await user.click(screen.getByRole('button', { name: 'PROCEED TO PAYMENT' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error');
    });
    expect(replaceSpy).not.toHaveBeenCalled();
  });
});
