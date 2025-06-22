// backend/src/routes/whatsappGatewayRoutes.js
const express = require('express');
const router = express.Router();
const whatsappGatewayController = require('../controllers/whatsappGatewayController');

// Rota para o Venom-Bot enviar mensagens recebidas para o backend
router.post('/webhook/whatsapp', whatsappGatewayController.receiveMessageFromVenom);

// Rota para o n8n solicitar o envio de mensagens WhatsApp via backend
router.post('/api/whatsapp/sendMessage', whatsappGatewayController.sendMessageToWhatsapp);

module.exports = router;