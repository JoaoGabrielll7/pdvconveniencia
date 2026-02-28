// Handler para Vercel Serverless: encaminha todas as requisições ao app Express.
const { app } = require('../dist/app');
module.exports = app;
