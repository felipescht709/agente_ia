const venom = require('venom-bot');
const express = require('express'); // Precisamos de um servidor HTTP para o bot receber mensagens do n8n
const bodyParser = require('body-parser'); // Para lidar com o corpo das requisições POST

// --- Configuração do Servidor HTTP para o Bot Receber Mensagens do n8n ---
const app = express();
const PORT_BOT_API = 3001; // Porta onde seu bot vai "escutar" requisições do n8n
app.use(bodyParser.json()); // Middleware para parsear JSON no corpo das requisições

let whatsappClient; // Variável para armazenar a instância do cliente Venom-Bot

// Endpoint para o n8n enviar mensagens para o WhatsApp através do bot
app.post('/send-whatsapp-message', async (req, res) => {
  const { to, message } = req.body; // Pega o número do destinatário e a mensagem do corpo da requisição do n8n

  if (!to || !message) {
    return res.status(400).json({ status: 'error', message: 'Destinatário e mensagem são obrigatórios.' });
  }

  if (!whatsappClient) {
    return res.status(500).json({ status: 'error', message: 'Cliente WhatsApp não está pronto.' });
  }

  try {
    console.log(`Recebido do n8n: Enviando mensagem para ${to} - "${message}"`);
    await whatsappClient.sendText(to, message); // Usa o cliente do Venom para enviar a mensagem
    console.log('Mensagem enviada via bot para WhatsApp com sucesso.');
    res.json({ status: 'success', message: 'Mensagem enviada.' });
  } catch (error) {
    console.error('Erro ao enviar mensagem via bot para WhatsApp:', error);
    res.status(500).json({ status: 'error', message: 'Falha ao enviar mensagem via bot.' });
  }
});

// Inicia o servidor HTTP
app.listen(PORT_BOT_API, () => {
  console.log(`Servidor API do Bot iniciado na porta ${PORT_BOT_API}`);
  console.log(`Webhook para envio de mensagens do n8n: http://localhost:5678/workflow/ScKGEvA2V72WHzGc`);
});

// --- Configuração do Venom-Bot ---
venom
  .create({
    session: 'agente-ia',
    headless: false, // Desliga o modo invisível
    devtools: true, // (opcional) Abre devtools automaticamente
    browserArgs: ['--start-maximized']
  })
  .then((client) => start(client))
  .catch((erro) => {
    console.log('Erro ao iniciar o Venom-Bot:', erro);
  });

function start(client) {
  whatsappClient = client; // Armazena a instância do cliente para uso no endpoint HTTP
  console.log('Venom-Bot iniciado e pronto para receber/enviar mensagens.');

  client.onMessage(async (message) => {
    console.log('Mensagem recebida pelo Venom-Bot:', message.body); // Para ver se o bot está recebendo a mensagem

    if (message.isGroupMsg) {
      console.log('Mensagem em grupo ignorada.');
      return; // Ignora mensagens de grupo
    }

    // --- ENVIAR MENSAGEM RECEBIDA PARA O N8N ---
    const N8N_WEBHOOK_URL = 'http://localhost:5678/workflow/ScKGEvA2V72WHzGc'; // URL do webhook do n8n

    try {
      console.log('Enviando mensagem para o n8n...');
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Formato que o n8n pode entender (adaptei para o seu Processar Mensagem node)
          data: {
            from: message.from,
            body: message.body,
            type: message.type,
            id: message.id,
            timestamp: message.t, // Timestamp
            pushname: message.sender.pushname || message.from // Nome do remetente
          }
        }),
      });

      if (response.ok) {
        console.log('Mensagem do WhatsApp encaminhada para o n8n com sucesso!');
        // Opcional: A resposta do n8n pode ser usada aqui, mas normalmente o n8n envia a resposta de volta ao WhatsApp
        // via uma nova requisição para o endpoint /send-whatsapp-message que acabamos de criar.
      } else {
        console.error('Erro ao encaminhar mensagem para o n8n:', response.status, response.statusText);
        // Em caso de erro no n8n, você pode querer ter uma resposta de fallback aqui
        await client.sendText(message.from, 'Desculpe, meu sistema está com problemas para processar sua solicitação no momento. Tente novamente mais tarde.');
      }
    } catch (error) {
      console.error('Erro de rede ao conectar com o n8n:', error);
      await client.sendText(message.from, 'Desculpe, não consegui me conectar ao meu cérebro de IA no momento. Por favor, tente novamente em alguns instantes.');
    }

   
  });
}