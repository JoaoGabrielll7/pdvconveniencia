// Handler único na raiz: encaminha para o app Express (backend compilado em pdv/backend/dist).
const { app } = require('../pdv/backend/dist/app');
module.exports = app;
