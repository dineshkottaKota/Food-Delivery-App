import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const { findOneMock, saveMock, constructedUsers } = vi.hoisted(() => ({
  findOneMock: vi.fn(),
  saveMock: vi.fn(),
  constructedUsers: [],
}));

vi.mock('../../Backend/models/userModel.js', () => {
  class MockUserModel {
    constructor(data) {
      Object.assign(this, data);
      constructedUsers.push(this);
    }

    save() {
      return saveMock(this);
    }
  }
  MockUserModel.findOne = findOneMock;
  return { default: MockUserModel };
});

import userRouter from '../../Backend/routes/userRoute.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/user', userRouter);
  return app;
}

describe('User API Routes (/api/user)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    constructedUsers.length = 0;
  });

  describe('POST /api/user/register', () => {
    it('registers a valid user, hashes password with bcrypt, and returns a signed JWT', async () => {
      findOneMock.mockResolvedValueOnce(null);
      saveMock.mockImplementationOnce(async (doc) => ({ ...doc, _id: 'new_user_123' }));

      const res = await request(createApp())
        .post('/api/user/register')
        .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.token).toBe('string');

      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.id).toBe('new_user_123');

      expect(constructedUsers).toHaveLength(1);
      expect(constructedUsers[0].password).not.toBe('password123');
      const passwordMatches = await bcrypt.compare('password123', constructedUsers[0].password);
      expect(passwordMatches).toBe(true);
    });

    it('rejects registration when user already exists', async () => {
      findOneMock.mockResolvedValueOnce({ _id: 'existing_1', email: 'alice@example.com' });

      const res = await request(createApp())
        .post('/api/user/register')
        .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'User already exists' });
      expect(saveMock).not.toHaveBeenCalled();
    });

    it('rejects registration with an invalid email format', async () => {
      findOneMock.mockResolvedValueOnce(null);

      const res = await request(createApp())
        .post('/api/user/register')
        .send({ name: 'Alice', email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Please enter a valid email' });
      expect(saveMock).not.toHaveBeenCalled();
    });

    it('rejects registration with a weak password (< 8 characters)', async () => {
      findOneMock.mockResolvedValueOnce(null);

      const res = await request(createApp())
        .post('/api/user/register')
        .send({ name: 'Alice', email: 'alice@example.com', password: 'short' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Please enter strong password' });
      expect(saveMock).not.toHaveBeenCalled();
    });

    it('returns generic error when database fails during registration', async () => {
      findOneMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(createApp())
        .post('/api/user/register')
        .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Error' });
    });
  });

  describe('POST /api/user/login', () => {
    it('logs in user with valid credentials and returns a JWT', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      findOneMock.mockResolvedValueOnce({
        _id: 'user_789',
        email: 'alice@example.com',
        password: hashedPassword,
      });

      const res = await request(createApp())
        .post('/api/user/login')
        .send({ email: 'alice@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.id).toBe('user_789');
    });

    it("rejects login when user doesn't exist", async () => {
      findOneMock.mockResolvedValueOnce(null);

      const res = await request(createApp())
        .post('/api/user/login')
        .send({ email: 'missing@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: "User Doesn't exist" });
    });

    it('rejects login when password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correctpass123', 10);
      findOneMock.mockResolvedValueOnce({
        _id: 'user_789',
        email: 'alice@example.com',
        password: hashedPassword,
      });

      const res = await request(createApp())
        .post('/api/user/login')
        .send({ email: 'alice@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Invalid Credentials' });
    });

    it('returns generic error when database fails during login', async () => {
      findOneMock.mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(createApp())
        .post('/api/user/login')
        .send({ email: 'alice@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Error' });
    });
  });
});
