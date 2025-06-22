// backend/src/services/aiGatewayService.js
const fetch = require('node-fetch');
const credentialService = require('./credentialService'); // Para buscar credenciais

exports.getAiAnalysis = async (clientId, messageText, systemPrompt) => {
    // Para o MVP, vamos usar variáveis de ambiente ou Ollama fixa,
    // mas em produção, buscaríamos as credenciais do cliente aqui.

    // Exemplo de como buscaria em produção:
    // const clientAiCredentials = await credentialService.getCredentials(clientId, 'OLLAMA_API'); // Ou 'OPENAI_API'
    // if (!clientAiCredentials) {
    //     throw new Error('Credenciais de IA não configuradas para este cliente.');
    // }

    const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3'; // Modelo padrão para Ollama

    // Lógica de escolha entre Ollama e OpenAI baseada em configuração ou credenciais
    // Para o MVP, assumimos Ollama, ou você pode usar a chave OpenAI se definir OPENAI_API_KEY
    const USE_OLLAMA = true; // Altere para 'false' se quiser forçar OpenAI e tiver a chave configurada.

    try {
        if (USE_OLLAMA) {
            // Chamada para Ollama
            console.log(`AI Gateway: Chamando Ollama (${OLLAMA_MODEL}) para Cliente ${clientId}`);
            const ollamaResponse = await fetch(OLLAMA_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    prompt: messageText,
                    system: systemPrompt,
                    stream: false // Para receber a resposta completa de uma vez
                }),
            });
            const ollamaData = await ollamaResponse.json();
            if (ollamaResponse.ok) {
                return ollamaData.response;
            } else {
                throw new Error(`Ollama API error: ${ollamaData.error || 'Unknown error'}`);
            }
        } else {
            // Chamada para OpenAI
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY não configurada no backend para uso com OpenAI.');
            }
            console.log(`AI Gateway: Chamando OpenAI para Cliente ${clientId}`);
            const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo', // Modelo padrão para OpenAI
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: messageText }
                    ],
                    temperature: 0.7,
                    max_tokens: 150
                }),
            });
            const openaiData = await openaiResponse.json();
            if (openaiResponse.ok) {
                return openaiData.choices[0].message.content;
            } else {
                throw new Error(`OpenAI API error: ${openaiData.error?.message || 'Unknown error'}`);
            }
        }
    } catch (error) {
        console.error('AI Gateway: Erro na função getAiAnalysis:', error);
        throw error;
    }
};