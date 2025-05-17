const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const basePath = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(basePath, '.env') }); // Load base first

const env = process.env.NODE_ENV || 'local';
const envFile = path.join(basePath, `.env.${env}`);

if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    console.log(`Loaded .env.${env}`);
} else {
    console.warn(`No env file found for NODE_ENV=${env}`);
}
