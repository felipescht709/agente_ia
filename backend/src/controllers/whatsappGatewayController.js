// backend/src/controllers/whatsappGatewayController.js
const whatsappGatewayService = require('../services/whatsappGatewayService');

// Suponha um ID de cliente fixo para o MVP. Em um SaaS real, você o obteria do req.headers ou req.body, validado por um token.
const CLIENT_ID_MVP = 'minha_clinica_teste_id'; // Este ID deve corresponder a um id_clinica existente no seu DB.

exports.receiveMessageFromVenom = async (req, res) => {
    try {
        const messageFromVenom = req.body.data; // Formato que o Venom-Bot enviará (ver script Venom-Bot)

        if (!messageFromVenom) {
            console.warn('WhatsApp Gateway Controller: Nenhum dado de mensagem recebido do Venom-Bot.');
            return res.status(400).json({ status: 'error', message: 'Dados de mensagem ausentes.' });
        }

        // Encaminha a mensagem, adicionando o CLIENT_ID_MVP
        const n8nResponse = await whatsappGatewayService.forwardMessageToN8n(CLIENT_ID_MVP, messageFromVenom);

        if (n8nResponse.ok) {
            console.log('WhatsApp Gateway Controller: Mensagem encaminhada para n8n com sucesso.');
            res.status(200).send('Mensagem recebida e encaminhada para n8n.');
        } else {
            const errorText = await n8nResponse.text();
            console.error('WhatsApp Gateway Controller: Erro ao encaminhar mensagem para n8n:', n8nResponse.status, errorText);
            res.status(n8nResponse.status).json({ status: 'error', message: 'Falha ao processar mensagem no n8n.', details: errorText });
        }
    } catch (error) {
        console.error('WhatsApp Gateway Controller: Erro no webhook do WhatsApp:', error);
        res.status(500).json({ status: 'error', message: 'Erro interno do servidor.' });
    }
};

exports.sendMessageToWhatsapp = async (req, res) => {
    const { clientId, to, message } = req.body;

    if (!clientId || !to || !message) {
        return res.status(400).json({ status: 'error', message: 'clientId, destinatário e mensagem são obrigatórios.' });
    }

    try {
        const result = await whatsappGatewayService.sendWhatsappMessage(clientId, to, message);
        res.status(200).json(result);
    } catch (error) {
        console.error('WhatsApp Gateway Controller: Erro no sendMessageToWhatsapp:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Erro interno ao enviar mensagem.' });
    }
};