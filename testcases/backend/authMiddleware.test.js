import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import authMiddleware from '../../Backend/middleware/auth.js';

function createMockRes() {
  return {
    json: vi.fn(),
  };
}

describe('authMiddleware', () => {
  it('returns unauthorized response when token header is missing', async () => {
    const req = { headers: {}, body: {} };
    const res = createMockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Not Authorized Login Again',
    });
  });

  it('decodes valid JWT, attaches userId to req.body, and calls next()', async () => {
    const token = jwt.sign({ id: 'user_42' }, process.env.JWT_SECRET);
    const req = { headers: { token }, body: {} };
    const res = createMockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(req.body.userId).toBe('user_42');
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns error response for tampered JWT token', async () => {
    const req = { headers: { token: 'invalid.jwt.token' }, body: {} };
    const res = createMockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: expect.any(String),
    });
  });

  it('returns error response for expired JWT token', async () => {
    const expiredToken = jwt.sign({ id: 'user_42' }, process.env.JWT_SECRET, { expiresIn: -10 });
    const req = { headers: { token: expiredToken }, body: {} };
    const res = createMockRes();
    const next = vi.fn();

    await authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'jwt expired',
    });
  });
});
