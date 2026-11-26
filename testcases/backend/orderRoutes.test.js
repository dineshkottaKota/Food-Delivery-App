import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const {
  orderSaveMock,
  orderFindMock,
  orderFindByIdAndUpdateMock,
  orderFindByIdAndDeleteMock,
  userFindByIdAndUpdateMock,
  stripeSessionCreateMock,
  constructedOrders,
} = vi.hoisted(() => ({
  orderSaveMock: vi.fn(),
  orderFindMock: vi.fn(),
  orderFindByIdAndUpdateMock: vi.fn(),
  orderFindByIdAndDeleteMock: vi.fn(),
  userFindByIdAndUpdateMock: vi.fn(),
  stripeSessionCreateMock: vi.fn(),
  constructedOrders: [],
}));

vi.mock('../../Backend/models/orderModel.js', () => {
  class MockOrderModel {
    constructor(data) {
      this._id = 'order_abc_123';
      Object.assign(this, data);
      constructedOrders.push(this);
    }

    save() {
      return orderSaveMock(this);
    }
  }
  MockOrderModel.find = orderFindMock;
  MockOrderModel.findByIdAndUpdate = orderFindByIdAndUpdateMock;
  MockOrderModel.findByIdAndDelete = orderFindByIdAndDeleteMock;
  return { default: MockOrderModel };
});

vi.mock('../../Backend/models/userModel.js', () => ({
  default: {
    findByIdAndUpdate: userFindByIdAndUpdateMock,
  },
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: stripeSessionCreateMock,
      },
    },
  })),
}));

import orderRouter from '../../Backend/routes/orderRoute.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/order', orderRouter);
  return app;
}

describe('Order API Routes (/api/order)', () => {
  const authToken = jwt.sign({ id: 'user_555' }, process.env.JWT_SECRET);

  beforeEach(() => {
    vi.clearAllMocks();
    constructedOrders.length = 0;
  });

  describe('POST /api/order/place', () => {
    it('requires authentication token', async () => {
      const res = await request(createApp()).post('/api/order/place').send({});
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Not Authorized Login Again' });
    });

    it('creates order, clears cart, creates Stripe checkout session with delivery charge, and returns session_url', async () => {
      orderSaveMock.mockResolvedValueOnce({});
      userFindByIdAndUpdateMock.mockResolvedValueOnce({});
      stripeSessionCreateMock.mockResolvedValueOnce({
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      const payload = {
        items: [
          { name: 'Greek Salad', price: 12, quantity: 2 },
          { name: 'Veg Rolls', price: 15, quantity: 1 },
        ],
        amount: 41,
        address: { firstName: 'Jane', lastName: 'Doe', street: '42 Elm St' },
      };

      const res = await request(createApp())
        .post('/api/order/place')
        .set('token', authToken)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        session_url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      expect(constructedOrders[0]).toMatchObject({
        userId: 'user_555',
        items: payload.items,
        amount: 41,
        address: payload.address,
      });
      expect(userFindByIdAndUpdateMock).toHaveBeenCalledWith('user_555', { cartData: {} });
      expect(stripeSessionCreateMock).toHaveBeenCalledWith({
        success_url: 'http://localhost:5174/verify?success=true&orderId=order_abc_123',
        cancel_url: 'http://localhost:5174/verify?success=false&orderId=order_abc_123',
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: { name: 'Greek Salad' },
              unit_amount: 1200,
            },
            quantity: 2,
          },
          {
            price_data: {
              currency: 'inr',
              product_data: { name: 'Veg Rolls' },
              unit_amount: 1500,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: 'inr',
              product_data: { name: 'Delivery Charge' },
              unit_amount: 5000,
            },
            quantity: 1,
          },
        ],
      });
    });

    it('returns error response when Stripe session creation fails', async () => {
      orderSaveMock.mockResolvedValueOnce({});
      userFindByIdAndUpdateMock.mockResolvedValueOnce({});
      stripeSessionCreateMock.mockRejectedValueOnce(new Error('Stripe API error'));

      const res = await request(createApp())
        .post('/api/order/place')
        .set('token', authToken)
        .send({ items: [], amount: 50, address: {} });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Error' });
    });
  });

  describe('POST /api/order/verify', () => {
    it('marks order paid when success is "true"', async () => {
      orderFindByIdAndUpdateMock.mockResolvedValueOnce({});

      const res = await request(createApp())
        .post('/api/order/verify')
        .send({ orderId: 'order_abc_123', success: 'true' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Paid' });
      expect(orderFindByIdAndUpdateMock).toHaveBeenCalledWith('order_abc_123', { payment: true });
    });

    it('deletes order when success is "false"', async () => {
      orderFindByIdAndDeleteMock.mockResolvedValueOnce({});

      const res = await request(createApp())
        .post('/api/order/verify')
        .send({ orderId: 'order_abc_123', success: 'false' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Not Paid' });
      expect(orderFindByIdAndDeleteMock).toHaveBeenCalledWith('order_abc_123');
    });

    it('returns the controller catch payload when verification update fails', async () => {
      orderFindByIdAndUpdateMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(createApp())
        .post('/api/order/verify')
        .send({ orderId: 'order_abc_123', success: 'true' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Error' });
    });
  });

  describe('POST /api/order/userorders', () => {
    it('returns orders belonging to the authenticated user', async () => {
      const mockOrders = [{ _id: 'ord_1', userId: 'user_555', amount: 30, status: 'Food Processing' }];
      orderFindMock.mockResolvedValueOnce(mockOrders);

      const res = await request(createApp())
        .post('/api/order/userorders')
        .set('token', authToken)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: mockOrders });
      expect(orderFindMock).toHaveBeenCalledWith({ userId: 'user_555' });
    });
  });

  describe('GET /api/order/list', () => {
    it('lists all orders for admin panel', async () => {
      const allOrders = [{ _id: 'ord_1' }, { _id: 'ord_2' }];
      orderFindMock.mockResolvedValueOnce(allOrders);

      const res = await request(createApp()).get('/api/order/list');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: allOrders });
      expect(orderFindMock).toHaveBeenCalledWith({});
    });
  });

  describe('POST /api/order/status', () => {
    it('updates order status', async () => {
      orderFindByIdAndUpdateMock.mockResolvedValueOnce({});

      const res = await request(createApp())
        .post('/api/order/status')
        .send({ orderId: 'ord_1', status: 'Out for delivery' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Status Updated' });
      expect(orderFindByIdAndUpdateMock).toHaveBeenCalledWith('ord_1', {
        status: 'Out for delivery',
      });
    });

    it('returns error response when status update fails', async () => {
      orderFindByIdAndUpdateMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(createApp())
        .post('/api/order/status')
        .send({ orderId: 'ord_1', status: 'Delivered' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Error' });
    });
  });
});
