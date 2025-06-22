const { PrismaClient, TipoProcedimentoInterno } = require('@prisma/client'); // Importar TipoProcedimentoInterno
const prisma = new PrismaClient();

const ProcedimentosController = {
  async criar(req, res) {
    const { id_clinica } = req.usuario; // id_clinica da clínica do usuário logado
    const {
      nome_procedimento,
      tipo, // Agora é String no schema
      valor,
      duracao_minutos,
      telemedicina = false,
      descricao
    } = req.body;

    try {
      // O nome do procedimento deve ser único APENAS dentro da clínica
      const existente = await prisma.procedimento.findFirst({
        where: {
          nome_procedimento,
          id_clinica
        }
      });

      if (existente) {
        return res.status(400).json({ error: 'Procedimento com este nome já cadastrado para esta clínica.' });
      }

      // Opcional: Validar se o 'tipo' recebido é um dos valores do seu Enum interno
      // if (!Object.values(TipoProcedimentoInterno).includes(tipo)) {
      //   return res.status(400).json({ error: `Tipo de procedimento inválido. Valores permitidos: ${Object.values(TipoProcedimentoInterno).join(', ')}` });
      // }

      const novo = await prisma.procedimento.create({
        data: {
          nome_procedimento,
          tipo, // 'tipo' é string, e será mapeado externamente se integrar com sistemas de gestão
          valor,
          duracao_minutos,
          telemedicina: Boolean(telemedicina),
          descricao,
          id_clinica,
          ativo: true
        }
      });

      return res.status(201).json(novo);
    } catch (err) {
      console.error('Erro ao criar procedimento:', err);
      return res.status(500).json({ error: 'Erro ao criar procedimento.' });
    }
  },

  async listar(req, res) {
    const { id_clinica } = req.usuario;

    try {
      const procedimentos = await prisma.procedimento.findMany({
        where: {
          id_clinica, // Filtra por id_clinica
          ativo: true
        },
        orderBy: { nome_procedimento: 'asc' }
      });

      return res.json(procedimentos);
    } catch (err) {
      console.error('Erro ao listar procedimentos:', err);
      return res.status(500).json({ error: 'Erro ao listar procedimentos.' });
    }
  },

  async detalhar(req, res) {
    const { id_clinica } = req.usuario;
    const { id } = req.params;

    try {
      const procedimento = await prisma.procedimento.findFirst({
        where: {
          id_procedimento: Number(id),
          id_clinica, // Filtra por id_clinica
          ativo: true
        }
      });

      if (!procedimento) {
        return res.status(404).json({ error: 'Procedimento não encontrado.' });
      }

      return res.json(procedimento);
    } catch (err) {
      console.error('Erro ao detalhar procedimento:', err);
      return res.status(500).json({ error: 'Erro ao detalhar procedimento.' });
    }
  },

  async atualizar(req, res) {
    const { id_clinica } = req.usuario;
    const { id } = req.params;
    const {
      nome_procedimento,
      tipo, // Agora é String
      valor,
      duracao_minutos,
      telemedicina,
      descricao
    } = req.body;

    try {
      // Primeiro, verifica se o procedimento existe E pertence à clínica do usuário logado
      const procedimentoExistente = await prisma.procedimento.findFirst({
        where: {
          id_procedimento: Number(id),
          id_clinica, // Filtra por id_clinica
          ativo: true
        }
      });

      if (!procedimentoExistente) {
        return res.status(404).json({ error: 'Procedimento não encontrado ou não pertence a esta clínica.' });
      }

      // Opcional: Validar se o 'tipo' recebido é um dos valores do seu Enum interno
      // if (tipo && !Object.values(TipoProcedimentoInterno).includes(tipo)) {
      //   return res.status(400).json({ error: `Tipo de procedimento inválido. Valores permitidos: ${Object.values(TipoProcedimentoInterno).join(', ')}` });
      // }

      // Se o nome_procedimento for alterado, verificar unicidade dentro da clínica
      if (nome_procedimento && nome_procedimento !== procedimentoExistente.nome_procedimento) {
        const nomeDuplicado = await prisma.procedimento.findFirst({
          where: {
            nome_procedimento,
            id_clinica,
            NOT: { id_procedimento: Number(id) } // Exclui o próprio procedimento da verificação
          }
        });
        if (nomeDuplicado) {
          return res.status(400).json({ error: 'Novo nome de procedimento já cadastrado para esta clínica.' });
        }
      }

      const atualizado = await prisma.procedimento.update({
        where: { id_procedimento: Number(id) },
        data: {
          nome_procedimento,
          tipo, // Tipo agora é string
          valor,
          duracao_minutos,
          telemedicina: Boolean(telemedicina),
          descricao
        }
      });

      return res.json(atualizado);
    } catch (err) {
      console.error('Erro ao atualizar procedimento:', err);
      return res.status(500).json({ error: 'Erro ao atualizar procedimento.' });
    }
  },

  async inativar(req, res) {
    const { id_clinica } = req.usuario;
    const { id } = req.params;

    try {
      // Primeiro, verifica se o procedimento existe E pertence à clínica do usuário logado
      const procedimento = await prisma.procedimento.findFirst({
        where: {
          id_procedimento: Number(id),
          id_clinica, // Filtra por id_clinica
          ativo: true
        }
      });

      if (!procedimento) {
        return res.status(404).json({ error: 'Procedimento não encontrado ou já inativo.' });
      }

      // Opcional: Verificar se o procedimento está associado a consultas futuras antes de inativar
      // const consultasFuturas = await prisma.consultaProcedimento.count({
      //   where: {
      //     procedimento_id: Number(id),
      //     consulta: {
      //       data_hora_inicio: { gte: new Date() },
      //       status: { in: ['AGENDADA', 'CONFIRMADA', 'PENDENTE_CONFIRMACAO'] }
      //     }
      //   }
      // });
      // if (consultasFuturas > 0) {
      //   return res.status(400).json({ error: 'Não é possível inativar o procedimento: possui consultas futuras agendadas.' });
      // }


      await prisma.procedimento.update({
        where: { id_procedimento: Number(id) },
        data: { ativo: false }
      });

      return res.json({ message: 'Procedimento inativado com sucesso.' });
    } catch (err) {
      console.error('Erro ao inativar procedimento:', err);
      return res.status(500).json({ error: 'Erro ao inativar procedimento.' });
    }
  }
};

module.exports = { ProcedimentosController };