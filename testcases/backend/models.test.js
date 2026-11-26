import { describe, it, expect } from 'vitest';
import userModel from '../../Backend/models/userModel.js';
import foodModel from '../../Backend/models/foodModel.js';
import orderModel from '../../Backend/models/orderModel.js';

describe('Mongoose Models Validation & Defaults', () => {
  describe('userModel', () => {
    it('validates a complete user and sets cartData default to {}', () => {
      const user = new userModel({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'hashedpassword123',
      });

      const error = user.validateSync();
      expect(error).toBeUndefined();
      expect(user.cartData).toEqual({});
      expect(userModel.schema.options.minimize).toBe(false);
      expect(userModel.schema.path('email').options.unique).toBe(true);
    });

    it('fails validation when required fields are missing', () => {
      const user = new userModel({});
      const error = user.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });
  });

  describe('foodModel', () => {
    it('validates a complete food document', () => {
      const food = new foodModel({
        name: 'Greek Salad',
        description: 'Fresh cucumber and feta salad',
        price: 12,
        image: 'salad.png',
        category: 'Salad',
      });

      const error = food.validateSync();
      expect(error).toBeUndefined();
      expect(food.price).toBe(12);
    });

    it('fails validation when required fields are missing or price is invalid', () => {
      const food = new foodModel({ price: 'invalid-price' });
      const error = food.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.description).toBeDefined();
      expect(error.errors.price).toBeDefined();
      expect(error.errors.image).toBeDefined();
      expect(error.errors.category).toBeDefined();
    });
  });

  describe('orderModel', () => {
    it('validates a complete order and applies default status, payment, and date', () => {
      const order = new orderModel({
        userId: 'user_123',
        items: [{ name: 'Greek Salad', price: 12, quantity: 2 }],
        amount: 26,
        address: { firstName: 'Alice', street: '123 Main St' },
      });

      const error = order.validateSync();
      expect(error).toBeUndefined();
      expect(order.status).toBe('Food Processing');
      expect(order.payment).toBe(false);
      expect(order.date).toBeInstanceOf(Date);
    });

    it('fails validation when required order fields are missing or invalid', () => {
      const order = new orderModel({ items: null });
      const error = order.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.userId).toBeDefined();
      expect(error.errors.items).toBeDefined();
      expect(error.errors.amount).toBeDefined();
      expect(error.errors.address).toBeDefined();
    });
  });
});
