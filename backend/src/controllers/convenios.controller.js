const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ConveniosController = {
  async cadastrar(req, res) {
    const { nome } = req.body;
    const { id_clinica } = req.usuario; // id_clinica da clínica do usuário logado

    if (!nome) {
      return res.status(400).json({ error: 'Nome do convênio é obrigatório.' });
    }

    try {
      // Verifica se convênio já existe APENAS dentro da clínica
      const existente = await prisma.convenio.findFirst({
        where: { nome, id_clinica }
      });

      if (existente) {
        return res.status(400).json({ error: 'Convênio com este nome já cadastrado para esta clínica.' });
      }

      const convenio = await prisma.convenio.create({
        data: {
          nome,
          id_clinica // Garante que o convênio seja criado para a clínica do usuário logado
        }
      });

      res.status(201).json(convenio);
    } catch (err) {
      console.error('Erro ao cadastrar convênio:', err);
      res.status(500).json({ error: 'Erro ao cadastrar convênio.' });
    }
  },

  async listar(req, res) {
    const { id_clinica } = req.usuario;

    try {
      const convenios = await prisma.convenio.findMany({
        where: { id_clinica, ativo: true }, // Filtra por id_clinica
        orderBy: { nome: 'asc' }
      });

      res.json(convenios);
    } catch (err) {
      console.error('Erro ao listar convênios:', err);
      res.status(500).json({ error: 'Erro ao listar convênios.' });
    }
  },

  // Você pode adicionar métodos detalhar, atualizar e inativar/ativar aqui
  // Sempre incluindo id_clinica no where para garantir que a operação seja restrita à clínica do usuário.
};

module.exports = { ConveniosController };