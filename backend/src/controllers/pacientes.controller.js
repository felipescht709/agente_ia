const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PacientesController = {
  async criar(req, res) {
    const { id_clinica } = req.usuario;
    const {
      cpf,
      nome,
      data_nascimento,
      email,
      telefone,
      codigo_ibge,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf
    } = req.body;

    try {
      const pacienteExistente = await prisma.paciente.findUnique({ where: { cpf } });

      if (pacienteExistente) {
        return res.status(400).json({ error: 'Paciente com este CPF já está cadastrado.' });
      }

      const paciente = await prisma.paciente.create({
        data: {
          cpf,
          nome,
          data_nascimento: new Date(data_nascimento),
          email,
          telefone,
          codigo_ibge,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
          id_clinica,
          ativo: true
        }
      });

      return res.status(201).json(paciente);
    } catch (err) {
      console.error('Erro ao cadastrar paciente:', err);
      return res.status(500).json({ error: 'Erro ao cadastrar paciente.' });
    }
  },

  async listar(req, res) {
    const { id_clinica } = req.usuario;

    try {
      const pacientes = await prisma.paciente.findMany({
        where: { id_clinica, ativo: true },
        orderBy: { nome: 'asc' }
      });

      res.json(pacientes);
    } catch (err) {
      console.error('Erro ao listar pacientes:', err);
      res.status(500).json({ error: 'Erro ao listar pacientes.' });
    }
  },
    async detalhar(req, res) {
        const { id } = req.params;
        const { id_clinica } = req.usuario;

        try {
            const paciente = await prisma.paciente.findFirst({
            where: {
                id_paciente: Number(id),
                id_clinica,
                ativo: true
            }
            });

            if (!paciente) {
            return res.status(404).json({ error: 'Paciente não encontrado.' });
            }

            res.json(paciente);
        } catch (err) {
            console.error('Erro ao buscar paciente:', err);
            res.status(500).json({ error: 'Erro ao buscar paciente.' });
        }
    },
    async atualizar(req, res) {
        const { id } = req.params;
        const { id_clinica } = req.usuario;

        try {
            const paciente = await prisma.paciente.findFirst({
            where: {
                id_paciente: Number(id),
                id_clinica,
                ativo: true
            }
            });

            if (!paciente) {
            return res.status(404).json({ error: 'Paciente não encontrado.' });
            }

            const atualizado = await prisma.paciente.update({
            where: { id_paciente: Number(id) },
            data: {
                nome: req.body.nome,
                email: req.body.email,
                telefone: req.body.telefone,
                data_nascimento: new Date(req.body.data_nascimento),
                codigo_ibge: req.body.codigo_ibge,
                cep: req.body.cep,
                logradouro: req.body.logradouro,
                numero: req.body.numero,
                complemento: req.body.complemento,
                bairro: req.body.bairro,
                cidade: req.body.cidade,
                uf: req.body.uf
            }
            });

            res.json(atualizado);
        } catch (err) {
            console.error('Erro ao atualizar paciente:', err);
            res.status(500).json({ error: 'Erro ao atualizar paciente.' });
        }
  },
    async inativar(req, res) {
        const { id } = req.params;
        const { id_clinica } = req.usuario;

        try {
            const paciente = await prisma.paciente.findFirst({
            where: {
                id_paciente: Number(id),
                id_clinica,
                ativo: true
            }
            });

            if (!paciente) {
            return res.status(404).json({ error: 'Paciente não encontrado ou já inativo.' });
            }

            await prisma.paciente.update({
            where: { id_paciente: Number(id) },
            data: { ativo: false }
            });

            res.status(204).send();
        } catch (err) {
            console.error('Erro ao inativar paciente:', err);
            res.status(500).json({ error: 'Erro ao inativar paciente.' });
        }
    },
    async detalhar(req, res) {
        const { id } = req.params;
        const { id_clinica } = req.usuario;

        try {
            const procedimento = await prisma.procedimento.findFirst({
            where: {
                id_procedimento: Number(id),
                id_clinica,
                ativo: true
            }
            });

            if (!procedimento) {
            return res.status(404).json({ error: 'Procedimento não encontrado.' });
            }

            res.json(procedimento);
        } catch (err) {
            console.error('Erro ao buscar procedimento:', err);
            res.status(500).json({ error: 'Erro ao buscar procedimento.' });
        }
    },
    async atualizar(req, res) {
        const { id } = req.params;
        const { id_clinica } = req.usuario;

        try {
            const existente = await prisma.procedimento.findFirst({
            where: {
                id_procedimento: Number(id),
                id_clinica,
                ativo: true
            }
            });

            if (!existente) {
            return res.status(404).json({ error: 'Procedimento não encontrado.' });
            }

            const atualizado = await prisma.procedimento.update({
            where: { id_procedimento: Number(id) },
            data: {
                nome_procedimento: req.body.nome_procedimento,
                tipo: req.body.tipo,
                valor: req.body.valor,
                duracao_minutos: req.body.duracao_minutos,
                telemedicina: Boolean(req.body.telemedicina),
                descricao: req.body.descricao
            }
            });

            res.json(atualizado);
        } catch (err) {
            console.error('Erro ao atualizar procedimento:', err);
            res.status(500).json({ error: 'Erro ao atualizar procedimento.' });
        }
    },
    async inativar(req, res) {
        const { id } = req.params;
        const { id_clinica } = req.usuario;

        try {
            const procedimento = await prisma.procedimento.findFirst({
            where: {
                id_procedimento: Number(id),
                id_clinica,
                ativo: true
            }
            });

            if (!procedimento) {
            return res.status(404).json({ error: 'Procedimento não encontrado ou já inativo.' });
            }

            await prisma.procedimento.update({
            where: { id_procedimento: Number(id) },
            data: { ativo: false }
            });

            res.status(204).send();
        } catch (err) {
            console.error('Erro ao inativar procedimento:', err);
            res.status(500).json({ error: 'Erro ao inativar procedimento.' });
        }
    }
};

module.exports = { PacientesController };
