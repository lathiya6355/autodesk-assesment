require('../config/config');
const redis = require('../config/redisClient');
const { v4: uuidv4 } = require('uuid');
const { getAllProductsFromDB } = require('../models/productModel'); // DB function to fetch all products

module.exports.getAllProducts = async () => {
  const requestId = uuidv4();
  console.log(`[${requestId}] Fetching products from Redis cache`);

  try {
    const cachedData = await redis.get('products');
    const lastUpdated = await redis.get('products_last_updated');

    if (!cachedData) {
      console.warn(`[${requestId}] Cache miss — fetching products from DB`);

      const productsFromDB = await getAllProductsFromDB();

      await redis.set('products', JSON.stringify(productsFromDB), 'EX', 300);
      const newTimestamp = new Date().toISOString();
      await redis.set('products_last_updated', newTimestamp);

      return {
        statusCode: 200,
        headers: { 'Cache-Control': 'max-age=60' },
        body: JSON.stringify({
          products: productsFromDB,
          count: productsFromDB.length,
          lastUpdated: newTimestamp,
          requestId,
        }),
      };
    }

    const products = JSON.parse(cachedData);

    return {
      statusCode: 200,
      headers: { 'Cache-Control': 'max-age=60' },
      body: JSON.stringify({
        products,
        count: products.length,
        lastUpdated,
        requestId,
      }),
    };
  } catch (error) {
    console.error(`[${requestId}] Redis or DB Error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', requestId }),
    };
  }
};
