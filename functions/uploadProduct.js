require('../config/config');

const multipart = require('lambda-multipart-parser');
const { parseCSV } = require('../services/csvProcessor');
const { upsertProduct, getAllProductsFromDB } = require('../models/productModel');
const redis = require('../config/redisClient');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');


const targetDir = 'E:/node/assesment/';

module.exports.uploadProduct = async (event) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] Starting product upload`);

  try {
    const result = await multipart.parse(event);
    const file = result.files[0];

    if (!file || !file.content || file.content.length === 0) {
      console.warn(`[${requestId}] No file found in request`);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'CSV file is required.', requestId }),
      };
    }

    const { valid: products, errors } = await parseCSV(file.content);
    console.log(`[${requestId}] Parsed ${products.length} valid products`);

    const filePath = path.join(targetDir, file.filename || 'uploaded.csv');
    try {
      await fs.promises.writeFile(filePath, file.content);
      console.log(`[${requestId}] CSV file saved at: ${filePath}`);
    } catch (err) {
      console.warn(`[${requestId}] Failed to save CSV file. Reason:`, err.message);
    }

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`[${requestId}] Upserting product ${i + 1}: ${product.name}`);
      product.out_of_stock = product.out_of_stock === true;
      await upsertProduct(product);
    }

    const updated = await getAllProductsFromDB();

    await redis.set('products', JSON.stringify(updated), 'EX', 300);
    await redis.set('products_last_updated', new Date().toISOString());

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Products uploaded successfully',
        totalUploaded: products.length,
        validationErrors: errors || [],
        requestId,
      }),
    };
  } catch (error) {
    console.error(`[${requestId}] Upload failed:`, error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process CSV',
        details: error.message,
        requestId,
      }),
    };
  }
};
