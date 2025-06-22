// backend/src/routes/aiGatewayRoutes.js
const express = require('express');
const router = express.Router();
const aiGatewayController = require('../controllers/aiGatewayController');

// Rota para o n8n solicitar análise de IA via backend
router.post('/ai/analyzeMessage', aiGatewayController.analyzeMessage);

module.exports = router;