import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { toast } from 'react-toastify';
import Add from '../../Admin/src/pages/Add/Add.jsx';

vi.mock('axios');
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Admin Add Page', () => {
  const testUrl = 'http://localhost:4000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows toast error and aborts submission when no image is selected', async () => {
    const { container } = render(<Add url={testUrl} />);
    const form = container.querySelector('form');

    fireEvent.submit(form);

    expect(toast.error).toHaveBeenCalledWith('Image not selected');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('submits FormData with image and product details and resets form on success', async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValueOnce({ data: { success: true, message: 'Food Added' } });

    const { container } = render(<Add url={testUrl} />);

    const file = new File(['png-bytes'], 'pasta.png', { type: 'image/png' });
    const fileInput = container.querySelector('#image');
    await user.upload(fileInput, file);

    const nameInput = screen.getByPlaceholderText('Type here');
    const descInput = screen.getByPlaceholderText('Write content here');
    const categorySelect = container.querySelector('select[name="category"]');
    const priceInput = screen.getByPlaceholderText('25');

    await user.type(nameInput, 'Creamy Pasta');
    await user.type(descInput, 'Delicious white sauce pasta');
    await user.selectOptions(categorySelect, 'Pasta');
    await user.type(priceInput, '22');

    expect(fileInput.files).toHaveLength(1);
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    const [postUrl, submittedFormData] = axios.post.mock.calls[0];
    expect(postUrl).toBe('http://localhost:4000/api/food/add');
    expect(submittedFormData).toBeInstanceOf(FormData);
    expect(submittedFormData.get('name')).toBe('Creamy Pasta');
    expect(submittedFormData.get('description')).toBe('Delicious white sauce pasta');
    expect(submittedFormData.get('price')).toBe('22');
    expect(submittedFormData.get('category')).toBe('Pasta');
    expect(submittedFormData.get('image')).toBe(file);

    expect(toast.success).toHaveBeenCalledWith('Food Added');
    expect(nameInput).toHaveValue('');
    expect(descInput).toHaveValue('');
    expect(priceInput).toHaveValue(null);
    expect(categorySelect).toHaveValue('Pasta');
  });

  it('shows toast error when API fails to add food', async () => {
    const user = userEvent.setup();
    axios.post.mockResolvedValueOnce({ data: { success: false, message: 'Error' } });

    const { container } = render(<Add url={testUrl} />);
    const file = new File(['png-bytes'], 'salad.png', { type: 'image/png' });
    await user.upload(container.querySelector('#image'), file);

    await user.type(screen.getByPlaceholderText('Type here'), 'Greek Salad');
    await user.type(screen.getByPlaceholderText('Write content here'), 'Fresh salad');
    await user.type(screen.getByPlaceholderText('25'), '15');

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error');
    });
    expect(screen.getByPlaceholderText('Type here')).toHaveValue('Greek Salad');
  });
});
