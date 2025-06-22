// backend/src/services/whatsappGatewayService.js
const fetch = require('node-fetch');
// const credentialService = require('./credentialService'); // Futuramente para buscar credenciais de cada cliente

// URL da API do seu Venom-Bot (onde ele está escutando para enviar mensagens)
const VENOM_BOT_API_URL = process.env.VENOM_BOT_API_URL || 'http://localhost:3001';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/workflow/whatsapp-webhook'; // URL do webhook do n8n

// Função para encaminhar mensagem do Venom-Bot para o n8n
exports.forwardMessageToN8n = async (clientId, messageFromVenom) => {
    const n8nPayload = {
        clientId: clientId,
        message: messageFromVenom // Passa o objeto original da mensagem do Venom-Bot
    };

    console.log('WhatsApp Gateway: Encaminhando payload para n8n:', n8nPayload);
    const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
    });
    return response;
};

// Função para enviar mensagem WhatsApp via Venom-Bot API (chamado pelo n8n via backend)
exports.sendWhatsappMessage = async (clientId, to, message) => {
    // *** FUTURAMENTE: Aqui você buscaria as credenciais do Venom-Bot/Z-API para este clientId no seu BD ***
    // Ex: const clientWhatsappCredentials = await credentialService.getCredentials(clientId, 'VENOM_BOT_API');
    // const currentVenomBotApiUrl = clientWhatsappCredentials?.instance_url || VENOM_BOT_API_URL;

    console.log(`WhatsApp Gateway: Enviando mensagem para ${to} (Cliente: ${clientId}) via Venom-Bot API.`);
    const botResponse = await fetch(VENOM_BOT_API_URL, { // Chama o seu bot na porta 3001
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message }),
    });

    if (botResponse.ok) {
        return { status: 'success', message: 'Mensagem enviada via bot.' };
    } else {
        const errorText = await botResponse.text();
        console.error('WhatsApp Gateway: Erro ao enviar mensagem via Venom-Bot API:', botResponse.status, errorText);
        throw new Error(`Falha no envio via bot: ${errorText}`);
    }
};