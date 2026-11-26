import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

const { findMock, findByIdMock, findByIdAndDeleteMock, saveMock, constructedFoods } = vi.hoisted(() => ({
  findMock: vi.fn(),
  findByIdMock: vi.fn(),
  findByIdAndDeleteMock: vi.fn(),
  saveMock: vi.fn(),
  constructedFoods: [],
}));

vi.mock('../../Backend/models/foodModel.js', () => {
  class MockFoodModel {
    constructor(data) {
      Object.assign(this, data);
      constructedFoods.push(this);
    }

    save() {
      return saveMock(this);
    }
  }
  MockFoodModel.find = findMock;
  MockFoodModel.findById = findByIdMock;
  MockFoodModel.findByIdAndDelete = findByIdAndDeleteMock;
  return { default: MockFoodModel };
});

import foodRouter from '../../Backend/routes/foodRoute.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/food', foodRouter);
  return app;
}

describe('Food API Routes (/api/food)', () => {
  const uploadedFilesToCleanup = [];

  beforeEach(() => {
    vi.clearAllMocks();
    constructedFoods.length = 0;
  });

  afterEach(() => {
    while (uploadedFilesToCleanup.length > 0) {
      const filePath = uploadedFilesToCleanup.pop();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  describe('GET /api/food/list', () => {
    it('returns all food items from database', async () => {
      const mockFoods = [
        { _id: '1', name: 'Greek Salad', price: 12, category: 'Salad', image: 'food_1.png' },
        { _id: '2', name: 'Veg Rolls', price: 15, category: 'Rolls', image: 'food_8.png' },
      ];
      findMock.mockResolvedValueOnce(mockFoods);

      const res = await request(createApp()).get('/api/food/list');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: mockFoods });
      expect(findMock).toHaveBeenCalledWith({});
    });

    it('returns error response when food query fails', async () => {
      findMock.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(createApp()).get('/api/food/list');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Error' });
    });
  });

  describe('POST /api/food/add', () => {
    it('uploads image via multer and saves food item', async () => {
      saveMock.mockResolvedValueOnce({});

      const res = await request(createApp())
        .post('/api/food/add')
        .field('name', 'Test Pasta')
        .field('description', 'Creamy alfredo pasta')
        .field('price', '18')
        .field('category', 'Pasta')
        .attach('image', Buffer.from('fake-image-bytes'), 'test_pasta.png');

      expect(constructedFoods).toHaveLength(1);
      const uploadedName = constructedFoods[0].image;
      uploadedFilesToCleanup.push(path.join(process.cwd(), 'uploads', uploadedName));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Food Added' });
      expect(uploadedName).toMatch(/test_pasta\.png$/);
      expect(constructedFoods[0]).toMatchObject({
        name: 'Test Pasta',
        description: 'Creamy alfredo pasta',
        price: '18',
        category: 'Pasta',
      });
    });

    it('returns error response if saving food fails', async () => {
      saveMock.mockRejectedValueOnce(new Error('Validation error'));

      const res = await request(createApp())
        .post('/api/food/add')
        .field('name', 'Broken Food')
        .field('description', 'Desc')
        .field('price', '10')
        .field('category', 'Salad')
        .attach('image', Buffer.from('fake-image-bytes'), 'test_broken.png');

      if (constructedFoods[0]?.image) {
        uploadedFilesToCleanup.push(path.join(process.cwd(), 'uploads', constructedFoods[0].image));
      }

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Error' });
    });
  });

  describe('POST /api/food/remove', () => {
    it('unlinks image file and deletes food document', async () => {
      const unlinkSpy = vi.spyOn(fs, 'unlink').mockImplementation((_p, cb) => cb && cb(null));
      findByIdMock.mockResolvedValueOnce({ _id: 'food_1', image: '1719862314422food_1.png' });
      findByIdAndDeleteMock.mockResolvedValueOnce({ _id: 'food_1' });

      const res = await request(createApp())
        .post('/api/food/remove')
        .send({ id: 'food_1' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Food Removed' });
      expect(findByIdMock).toHaveBeenCalledWith('food_1');
      expect(unlinkSpy).toHaveBeenCalledWith(
        'uploads/1719862314422food_1.png',
        expect.any(Function)
      );
      expect(findByIdAndDeleteMock).toHaveBeenCalledWith('food_1');
    });

    it('returns error response when food is not found', async () => {
      findByIdMock.mockResolvedValueOnce(null);

      const res = await request(createApp())
        .post('/api/food/remove')
        .send({ id: 'nonexistent_id' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, message: 'Error' });
      expect(findByIdAndDeleteMock).not.toHaveBeenCalled();
    });
  });
});
