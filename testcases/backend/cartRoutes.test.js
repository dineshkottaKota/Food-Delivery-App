import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const { findByIdMock, findByIdAndUpdateMock } = vi.hoisted(() => ({
  findByIdMock: vi.fn(),
  findByIdAndUpdateMock: vi.fn(),
}));

vi.mock('../../Backend/models/userModel.js', () => ({
  default: {
    findById: findByIdMock,
    findByIdAndUpdate: findByIdAndUpdateMock,
  },
}));

import cartRouter from '../../Backend/routes/cartRoute.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/cart', cartRouter);
  return app;
}

describe('Cart API Routes (/api/cart)', () => {
  const authToken = jwt.sign({ id: 'user_101' }, process.env.JWT_SECRET);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests across all cart endpoints', async () => {
    const app = createApp();
    const endpoints = ['/api/cart/add', '/api/cart/remove', '/api/cart/get'];

    for (const endpoint of endpoints) {
      const res = await request(app).post(endpoint).send({ itemId: 'item_1' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Not Authorized Login Again' });
    }
  });

  describe('POST /api/cart/add', () => {
    it('initializes item quantity to 1 when item is not yet in cart', async () => {
      findByIdMock.mockResolvedValueOnce({ _id: 'user_101', cartData: {} });
      findByIdAndUpdateMock.mockResolvedValueOnce({});

      const res = await request(createApp())
        .post('/api/cart/add')
        .set('token', authToken)
        .send({ itemId: 'food_5' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Added To Cart' });
      expect(findByIdMock).toHaveBeenCalledWith('user_101');
      expect(findByIdAndUpdateMock).toHaveBeenCalledWith('user_101', {
        cartData: { food_5: 1 },
      });
    });

    it('increments item quantity when item already exists in cart', async () => {
      findByIdMock.mockResolvedValueOnce({ _id: 'user_101', cartData: { food_5: 2 } });
      findByIdAndUpdateMock.mockResolvedValueOnce({});

      const res = await request(createApp())
        .post('/api/cart/add')
        .set('token', authToken)
        .send({ itemId: 'food_5' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Added To Cart' });
      expect(findByIdAndUpdateMock).toHaveBeenCalledWith('user_101', {
        cartData: { food_5: 3 },
      });
    });
  });

  describe('POST /api/cart/remove', () => {
    it('decrements item quantity when greater than 0', async () => {
      findByIdMock.mockResolvedValueOnce({ _id: 'user_101', cartData: { food_5: 2 } });
      findByIdAndUpdateMock.mockResolvedValueOnce({});

      const res = await request(createApp())
        .post('/api/cart/remove')
        .set('token', authToken)
        .send({ itemId: 'food_5' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Removed From Cart' });
      expect(findByIdAndUpdateMock).toHaveBeenCalledWith('user_101', {
        cartData: { food_5: 1 },
      });
    });

    it('does not decrement below 0 when item count is 0', async () => {
      findByIdMock.mockResolvedValueOnce({ _id: 'user_101', cartData: { food_5: 0 } });
      findByIdAndUpdateMock.mockResolvedValueOnce({});

      const res = await request(createApp())
        .post('/api/cart/remove')
        .set('token', authToken)
        .send({ itemId: 'food_5' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Removed From Cart' });
      expect(findByIdAndUpdateMock).toHaveBeenCalledWith('user_101', {
        cartData: { food_5: 0 },
      });
    });
  });

  describe('POST /api/cart/get', () => {
    it('returns the authenticated user cartData', async () => {
      findByIdMock.mockResolvedValueOnce({
        _id: 'user_101',
        cartData: { food_1: 2, food_3: 1 },
      });

      const res = await request(createApp())
        .post('/api/cart/get')
        .set('token', authToken)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        cartData: { food_1: 2, food_3: 1 },
      });
    });

    it('returns error response when user lookup fails', async () => {
      findByIdMock.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(createApp())
        .post('/api/cart/get')
        .set('token', authToken)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Error' });
    });
  });
});
