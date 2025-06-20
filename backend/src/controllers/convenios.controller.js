const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ConveniosController = {
  async cadastrar(req, res) {
    const { nome } = req.body;
    const { id_clinica } = req.usuario;

    if (!nome) {
      return res.status(400).json({ error: 'Nome do convênio é obrigatório.' });
    }

    try {
      const existente = await prisma.convenio.findFirst({
        where: { nome, id_clinica }
      });

      if (existente) {
        return res.status(400).json({ error: 'Convênio já cadastrado.' });
      }

      const convenio = await prisma.convenio.create({
        data: {
          nome,
          id_clinica
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
        where: { id_clinica, ativo: true },
        orderBy: { nome: 'asc' }
      });

      res.json(convenios);
    } catch (err) {
      console.error('Erro ao listar convênios:', err);
      res.status(500).json({ error: 'Erro ao listar convênios.' });
    }
  }
};

module.exports = { ConveniosController };
