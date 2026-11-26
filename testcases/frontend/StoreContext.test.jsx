import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useContext } from 'react';
import axios from 'axios';
import StoreContextProvider, { StoreContext } from '../../Frontend/src/components/context/StoreContext.jsx';

vi.mock('axios');

const MOCK_FOODS = [
  { _id: 'f1', name: 'Greek Salad', price: 12, description: 'Fresh', image: 'food_1.png', category: 'Salad' },
  { _id: 'f2', name: 'Veg Rolls', price: 15, description: 'Crispy', image: 'food_8.png', category: 'Rolls' },
];

function ContextProbe() {
  const { food_list, cartItems, token, addToCart, removeFromCart, getTotalCartAmount, setToken } =
    useContext(StoreContext);

  return (
    <div>
      <span data-testid="food-count">{food_list.length}</span>
      <span data-testid="token">{token}</span>
      <span data-testid="cart-f1">{cartItems.f1 || 0}</span>
      <span data-testid="cart-f2">{cartItems.f2 || 0}</span>
      <span data-testid="total">{getTotalCartAmount()}</span>
      <button onClick={() => addToCart('f1')}>add-f1</button>
      <button onClick={() => addToCart('f2')}>add-f2</button>
      <button onClick={() => removeFromCart('f1')}>remove-f1</button>
      <button onClick={() => setToken('jwt-token-1')}>set-token</button>
    </div>
  );
}

describe('StoreContextProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: { success: true, data: MOCK_FOODS } });
    axios.post.mockResolvedValue({ data: { success: true, cartData: {} } });
  });

  it('fetches food list on mount and calculates cart totals accurately without token', async () => {
    render(
      <StoreContextProvider>
        <ContextProbe />
      </StoreContextProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('food-count')).toHaveTextContent('2');
    });
    expect(axios.get).toHaveBeenCalledWith('https://food-delivery-app-1-faqc.onrender.com/api/food/list');
    expect(axios.post).not.toHaveBeenCalled();

    await act(async () => {
      screen.getByText('add-f1').click();
    });
    await act(async () => {
      screen.getByText('add-f1').click();
    });
    await act(async () => {
      screen.getByText('add-f2').click();
    });

    expect(screen.getByTestId('cart-f1')).toHaveTextContent('2');
    expect(screen.getByTestId('cart-f2')).toHaveTextContent('1');
    expect(screen.getByTestId('total')).toHaveTextContent('39');
    expect(axios.post).not.toHaveBeenCalled();

    await act(async () => {
      screen.getByText('remove-f1').click();
    });

    expect(screen.getByTestId('cart-f1')).toHaveTextContent('1');
    expect(screen.getByTestId('total')).toHaveTextContent('27');
  });

  it('restores token from localStorage, loads server cart, and syncs cart mutations when authenticated', async () => {
    localStorage.setItem('token', 'saved-jwt-token');
    axios.post.mockResolvedValueOnce({ data: { success: true, cartData: { f1: 2 } } });
    axios.post.mockResolvedValue({ data: { success: true } });

    render(
      <StoreContextProvider>
        <ContextProbe />
      </StoreContextProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('cart-f1')).toHaveTextContent('2');
    });

    expect(screen.getByTestId('token')).toHaveTextContent('saved-jwt-token');
    expect(screen.getByTestId('total')).toHaveTextContent('24');
    expect(axios.post).toHaveBeenCalledWith(
      'https://food-delivery-app-1-faqc.onrender.com/api/cart/get',
      {},
      { headers: { token: 'saved-jwt-token' } }
    );

    await act(async () => {
      screen.getByText('add-f2').click();
    });
    expect(axios.post).toHaveBeenCalledWith(
      'https://food-delivery-app-1-faqc.onrender.com/api/cart/add',
      { itemId: 'f2' },
      { headers: { token: 'saved-jwt-token' } }
    );

    await act(async () => {
      screen.getByText('remove-f1').click();
    });
    expect(axios.post).toHaveBeenCalledWith(
      'https://food-delivery-app-1-faqc.onrender.com/api/cart/remove',
      { itemId: 'f1' },
      { headers: { token: 'saved-jwt-token' } }
    );
  });
});
