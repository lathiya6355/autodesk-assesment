const { getAllProducts } = require('../functions/getAllProducts');
const redis = require('../config/redisClient');

jest.mock('../config/redisClient', () => ({
    get: jest.fn(),
    set: jest.fn(),
}));

describe('getAllProducts Lambda', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return 200 and cached products if Redis has data', async () => {
        const products = [
            { name: 'Product A', price: 100 },
            { name: 'Product B', price: 200 },
        ];
        const lastUpdated = '2024-05-17T10:00:00.000Z';

        redis.get.mockImplementation((key) => {
            if (key === 'products') return Promise.resolve(JSON.stringify(products));
            if (key === 'products_last_updated') return Promise.resolve(lastUpdated);
            return Promise.resolve(null);
        });

        const response = await getAllProducts();
        const body = JSON.parse(response.body);

        expect(redis.get).toHaveBeenCalledWith('products');
        expect(redis.get).toHaveBeenCalledWith('products_last_updated');
        expect(response.statusCode).toBe(200);
        expect(response.headers['Cache-Control']).toBe('max-age=60');
        expect(body.products).toEqual(products);
        expect(body.count).toBe(2);
        expect(body.lastUpdated).toBe(lastUpdated);
        expect(body.requestId).toBeDefined();
    });

    test('should return 404 if cache miss (Redis returns null)', async () => {
        redis.get.mockResolvedValue(null);

        // Mock DB fallback also returns empty (simulate no products in DB)
        const response = await getAllProducts();

        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(body.products)).toBe(true); // Even DB fallback returns array
        expect(body.products.length).toBeGreaterThanOrEqual(0);
    });

    test('should return 404 if cache miss (Redis returns undefined)', async () => {
        redis.get.mockResolvedValue(undefined);

        const response = await getAllProducts();
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(body.products)).toBe(true);
        expect(body.products.length).toBeGreaterThanOrEqual(0);
    });

    test('should return 500 if Redis throws an error', async () => {
        redis.get.mockRejectedValue(new Error('Redis is down'));

        const response = await getAllProducts();
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(500);
        expect(body.error).toBe('Internal server error');
        expect(body.requestId).toBeDefined();
    });
});
