import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import StoreContextProvider from '../../Frontend/src/components/context/StoreContext.jsx';
import Home from '../../Frontend/src/pages/Home/Home.jsx';

vi.mock('axios');

const MOCK_FOODS = [
  { _id: '1', name: 'Greek Salad', price: 12, description: 'Fresh greens', image: 'food_1.png', category: 'Salad' },
  { _id: '2', name: 'Lasagna Rolls', price: 14, description: 'Cheesy rolls', image: 'food_5.png', category: 'Rolls' },
  { _id: '3', name: 'Cheese Pasta', price: 16, description: 'Rich pasta', image: 'food_25.png', category: 'Pasta' },
];

describe('Home, ExploreMenu, FoodDisplay, and FoodItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: { success: true, data: MOCK_FOODS } });
  });

  function renderHome() {
    return render(
      <MemoryRouter>
        <StoreContextProvider>
          <Home />
        </StoreContextProvider>
      </MemoryRouter>
    );
  }

  it('renders header, all menu categories, app download section, and all food items initially', async () => {
    renderHome();

    expect(screen.getByText('Order your favourite food here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Menu' })).toBeInTheDocument();
    expect(screen.getByText('Explore our menu')).toBeInTheDocument();
    expect(screen.getByText('Top dishes near you')).toBeInTheDocument();
    expect(screen.getByText(/For Better Experience Download/i)).toBeInTheDocument();

    for (const cat of ['Rolls', 'Deserts', 'Cake', 'Pure Veg', 'Pasta', 'Noodles', 'Salad', 'Sandwich']) {
      expect(screen.getByText(cat)).toBeInTheDocument();
    }

    await waitFor(() => {
      expect(screen.getByText('Greek Salad')).toBeInTheDocument();
      expect(screen.getByText('Lasagna Rolls')).toBeInTheDocument();
      expect(screen.getByText('Cheese Pasta')).toBeInTheDocument();
    });
  });

  it('filters food items when selecting a category and resets to all when clicked again', async () => {
    const user = userEvent.setup();
    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Greek Salad')).toBeInTheDocument();
    });

    const saladLabel = screen.getByText('Salad');
    await user.click(saladLabel);

    expect(saladLabel.previousSibling).toHaveClass('active');
    expect(screen.getByText('Greek Salad')).toBeInTheDocument();
    expect(screen.queryByText('Lasagna Rolls')).not.toBeInTheDocument();
    expect(screen.queryByText('Cheese Pasta')).not.toBeInTheDocument();

    await user.click(saladLabel);

    expect(saladLabel.previousSibling).not.toHaveClass('active');
    expect(screen.getByText('Lasagna Rolls')).toBeInTheDocument();
    expect(screen.getByText('Cheese Pasta')).toBeInTheDocument();
  });

  it('adds, increments, and removes items via FoodItem counter controls', async () => {
    const user = userEvent.setup();
    const { container } = renderHome();

    await waitFor(() => {
      expect(screen.getByText('Greek Salad')).toBeInTheDocument();
    });

    const firstFoodCard = screen.getByText('Greek Salad').closest('.food-item');
    const addButton = firstFoodCard.querySelector('.add');
    expect(addButton).toBeInTheDocument();

    await user.click(addButton);

    const counter = firstFoodCard.querySelector('.food-item-counter');
    expect(counter).toBeInTheDocument();
    expect(counter).toHaveTextContent('1');

    const [removeBtn, incrementBtn] = counter.querySelectorAll('img');
    await user.click(incrementBtn);
    expect(counter).toHaveTextContent('2');

    await user.click(removeBtn);
    expect(counter).toHaveTextContent('1');

    await user.click(removeBtn);
    expect(firstFoodCard.querySelector('.food-item-counter')).toBeNull();
    expect(firstFoodCard.querySelector('.add')).toBeInTheDocument();
    expect(container.querySelectorAll('.food-item')).toHaveLength(3);
  });
});
