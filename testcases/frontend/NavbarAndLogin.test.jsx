import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import App from '../../Frontend/src/App.jsx';
import StoreContextProvider from '../../Frontend/src/components/context/StoreContext.jsx';

vi.mock('axios');

const MOCK_FOODS = [
  { _id: '1', name: 'Greek Salad', price: 12, description: 'Fresh', image: 'food_1.png', category: 'Salad' },
];

describe('Navbar and LoginPopup Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: { success: true, data: MOCK_FOODS } });
  });

  function renderApp(initialEntries = ['/']) {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <StoreContextProvider>
          <App />
        </StoreContextProvider>
      </MemoryRouter>
    );
  }

  it('opens LoginPopup on Sign in click, toggles between Sign Up and Login, and closes on icon click', async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    await waitFor(() => {
      expect(screen.getByText('Greek Salad')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();

    await user.click(screen.getByText('Login here'));
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Your name')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();

    await user.click(screen.getByText('Click here'));
    expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument();

    const closeIcon = container.querySelector('.login-popup-title img');
    await user.click(closeIcon);
    expect(screen.queryByRole('heading', { name: 'Sign Up' })).not.toBeInTheDocument();
  });

  it('registers a user successfully, persists token in localStorage, and updates navbar to profile menu', async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValueOnce({ data: { success: true, token: 'reg-jwt-token' } });

    const { container } = renderApp();
    await waitFor(() => {
      expect(screen.getByText('Greek Salad')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await user.type(screen.getByPlaceholderText('Your name'), 'Alice');
    await user.type(screen.getByPlaceholderText('Your email'), 'alice@example.com');
    await user.type(screen.getByPlaceholderText('password'), 'password123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('reg-jwt-token');
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://food-delivery-app-1-faqc.onrender.com/api/user/register',
      { name: 'Alice', email: 'alice@example.com', password: 'password123' }
    );
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(container.querySelector('.navbar-profile')).toBeInTheDocument();
  });

  it('alerts error message when login fails', async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValueOnce({ data: { success: false, message: 'Invalid Credentials' } });

    renderApp();
    await waitFor(() => {
      expect(screen.getByText('Greek Salad')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await user.click(screen.getByText('Login here'));
    await user.type(screen.getByPlaceholderText('Your email'), 'alice@example.com');
    await user.type(screen.getByPlaceholderText('password'), 'wrongpass');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Invalid Credentials');
    });
    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });

  it('shows cart dot when item is added and supports Orders navigation and Logout', async () => {
    const user = userEvent.setup();
    localStorage.setItem('token', 'logged-in-token');
    axios.post.mockImplementation(async (endpoint) => {
      if (endpoint.endsWith('/api/cart/get')) {
        return { data: { success: true, cartData: { '1': 1 } } };
      }
      if (endpoint.endsWith('/api/order/userorders')) {
        return { data: { success: true, data: [] } };
      }
      return { data: { success: true } };
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <StoreContextProvider>
          <Routes>
            <Route path="*" element={<App />} />
          </Routes>
        </StoreContextProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(container.querySelector('.navbar-search-icon .dot')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Orders'));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'My Orders' })).toBeInTheDocument();
    });

    await user.click(screen.getByText('Logout'));
    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('Order your favourite food here')).toBeInTheDocument();
  });
});
