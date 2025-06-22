// backend/src/controllers/aiGatewayController.js
const aiGatewayService = require('../services/aiGatewayService');

exports.analyzeMessage = async (req, res) => {
    const { clientId, messageText, systemPrompt } = req.body;

    if (!clientId || !messageText || !systemPrompt) {
        return res.status(400).json({ status: 'error', message: 'clientId, messageText e systemPrompt são obrigatórios.' });
    }

    try {
        const aiResponse = await aiGatewayService.getAiAnalysis(clientId, messageText, systemPrompt);
        res.status(200).json({ status: 'success', response: aiResponse });
    } catch (error) {
        console.error('AI Gateway Controller: Erro no analyzeMessage:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Erro interno ao chamar IA.' });
    }
};