const dotenv = require('dotenv');

const stage = process.env.STAGE || 'local'; // fallback to local
const envPath = `.env.${stage}`;

dotenv.config({ path: envPath });

module.exports = process.env;
