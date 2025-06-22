// backend/src/services/credentialService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Busca as credenciais de um tipo de serviço para uma clínica específica.
 * @param {number} idClinica - ID da clínica.
 * @param {string} tipoServico - Tipo de serviço (e.g., 'OLLAMA_API', 'WHATSAPP_BUSINESS_API').
 * @returns {Promise<object|null>} As credenciais encontradas ou null.
 */
exports.getCredentials = async (idClinica, tipoServico) => {
    try {
        const credentials = await prisma.credenciaisCliente.findUnique({
            where: {
                id_clinica_tipo_servico: { // Chave composta definida no schema
                    id_clinica: idClinica,
                    tipo_servico: tipoServico,
                },
                ativo: true,
            },
        });
        if (!credentials) {
            console.warn(`Credenciais não encontradas para clínica ${idClinica}, serviço ${tipoServico}`);
        }
        return credentials;
    } catch (error) {
        console.error(`Erro ao buscar credenciais para clínica ${idClinica}, serviço ${tipoServico}:`, error);
        throw new Error(`Falha ao buscar credenciais: ${error.message}`);
    }
};