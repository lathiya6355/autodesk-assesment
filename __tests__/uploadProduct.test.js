const fs = require('fs');
const path = require('path');

jest.mock('fs');
jest.mock('lambda-multipart-parser');
jest.mock('../services/csvProcessor');
jest.mock('../models/productModel');
jest.mock('../config/redisClient', () => ({
    set: jest.fn(),
}));

const multipart = require('lambda-multipart-parser');
const { parseCSV } = require('../services/csvProcessor');
const { upsertProduct, getAllProductsFromDB } = require('../models/productModel');
const redis = require('../config/redisClient');
const { uploadProduct } = require('../functions/uploadProduct');

describe('uploadProduct Lambda Function', () => {
    const mockCSVFile = {
        filename: 'test.csv',
        content: Buffer.from('name,image,price,qty,out_of_stock\nItem 1,img.png,10.5,5,false'),
    };

    const parsedProducts = [
        {
            name: 'Item 1',
            image: 'img.png',
            price: 10.5,
            qty: 5,
            out_of_stock: false,
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        fs.promises = {
            writeFile: jest.fn(),
        };
    });

    test('should return 400 if no file is provided', async () => {
        multipart.parse.mockResolvedValue({ files: [] });

        const response = await uploadProduct({});

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toMatchObject({
            error: 'CSV file is required.',
        });
    });

    test('should return 400 if file content is empty', async () => {
        multipart.parse.mockResolvedValue({
            files: [{ filename: 'empty.csv', content: Buffer.from('') }],
        });

        const response = await uploadProduct({});

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toMatchObject({
            error: 'CSV file is required.',
        });
    });


    test('should return 500 if parseCSV throws error', async () => {
        multipart.parse.mockResolvedValue({ files: [mockCSVFile] });
        parseCSV.mockRejectedValue(new Error('CSV parsing error'));

        const response = await uploadProduct({});

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body)).toMatchObject({
            error: 'Failed to process CSV',
            details: 'CSV parsing error',
        });
    });
});
