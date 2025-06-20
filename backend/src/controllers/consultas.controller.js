const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ConsultasController = {
  async criar(req, res) {
    const { id_clinica } = req.usuario;
    const {
      paciente_id,
      profissional_id,
      data_hora_inicio,
      data_hora_fim,
      valor,
      telemedicina = false,
      status,
      observacoes
    } = req.body;

    try {
      const consulta = await prisma.consulta.create({
        data: {
          paciente_id,
          profissional_id,
          data_hora_inicio: new Date(data_hora_inicio),
          data_hora_fim: new Date(data_hora_fim),
          valor,
          telemedicina: Boolean(telemedicina),
          status,
          observacoes,
          id_clinica
        }
      });

      return res.status(201).json(consulta);
    } catch (err) {
      console.error('Erro ao criar consulta:', err);
      return res.status(500).json({ error: 'Erro ao criar consulta.' });
    }
  },

  async listar(req, res) {
    const { id_clinica } = req.usuario;

    try {
      const consultas = await prisma.consulta.findMany({
        where: { id_clinica },
        include: {
          paciente: { select: { nome: true } },
          profissional: { select: { nome_profissional: true } }
        },
        orderBy: { data_hora_inicio: 'asc' }
      });

      res.json(consultas);
    } catch (err) {
      console.error('Erro ao listar consultas:', err);
      res.status(500).json({ error: 'Erro ao listar consultas.' });
    }
  },
    async detalhar(req, res) {
        const { id } = req.params;
        const { id_clinica } = req.usuario;

        try {
            const consulta = await prisma.consulta.findFirst({
            where: {
                id_consulta: Number(id),
                id_clinica
            },
            include: {
                paciente: true,
                profissional: true,
                procedimentos: {
                include: {
                    procedimento: true
                }
                }
            }
            });

            if (!consulta) {
            return res.status(404).json({ error: 'Consulta não encontrada.' });
            }

            res.json(consulta);
        } catch (err) {
            console.error('Erro ao buscar consulta:', err);
            res.status(500).json({ error: 'Erro ao buscar consulta.' });
        }
    },
    async atualizar(req, res) {
        const { id } = req.params;
        const { id_clinica } = req.usuario;
        const {
            status,
            data_hora_inicio,
            data_hora_fim,
            observacoes
        } = req.body;

        try {
            const consulta = await prisma.consulta.findFirst({
            where: {
                id_consulta: Number(id),
                id_clinica
            }
            });

            if (!consulta) {
            return res.status(404).json({ error: 'Consulta não encontrada.' });
            }

            const atualizada = await prisma.consulta.update({
            where: { id_consulta: Number(id) },
            data: {
                status,
                data_hora_inicio: data_hora_inicio ? new Date(data_hora_inicio) : consulta.data_hora_inicio,
                data_hora_fim: data_hora_fim ? new Date(data_hora_fim) : consulta.data_hora_fim,
                observacoes
            }
            });

            res.json(atualizada);
        } catch (err) {
            console.error('Erro ao atualizar consulta:', err);
            res.status(500).json({ error: 'Erro ao atualizar consulta.' });
        }
    },

    async associarProcedimentos(req, res) {
        const { id } = req.params; // id da consulta
        const { procedimentos_ids } = req.body;
        const { id_clinica } = req.usuario;

        if (!Array.isArray(procedimentos_ids) || procedimentos_ids.length === 0) {
            return res.status(400).json({ error: 'Informe pelo menos um procedimento.' });
        }

        try {
            const consulta = await prisma.consulta.findFirst({
            where: { id_consulta: Number(id), id_clinica }
            });

            if (!consulta) {
            return res.status(404).json({ error: 'Consulta não encontrada.' });
            }

            const registros = await Promise.all(
            procedimentos_ids.map(async (pid) => {
                return await prisma.consultaProcedimento.upsert({
                where: {
                    consulta_id_procedimento_id: {
                    consulta_id: Number(id),
                    procedimento_id: pid
                    }
                },
                update: {},
                create: {
                    consulta_id: Number(id),
                    procedimento_id: pid
                }
                });
            })
            );

            return res.status(201).json({ procedimentos_adicionados: registros.length });
        } catch (err) {
            console.error('Erro ao associar procedimentos:', err);
            res.status(500).json({ error: 'Erro ao associar procedimentos.' });
        }
    },

    async listarProcedimentos(req, res) {
        const { id } = req.params;
        const { id_clinica } = req.usuario;

        try {
            const consulta = await prisma.consulta.findFirst({
            where: { id_consulta: Number(id), id_clinica }
            });

            if (!consulta) {
            return res.status(404).json({ error: 'Consulta não encontrada.' });
            }

            const procedimentos = await prisma.consultaProcedimento.findMany({
            where: { consulta_id: Number(id) },
            include: { procedimento: true }
            });

            res.json(procedimentos.map((item) => item.procedimento));
        } catch (err) {
            console.error('Erro ao listar procedimentos:', err);
            res.status(500).json({ error: 'Erro ao listar procedimentos da consulta.' });
        }
    },

    async removerProcedimento(req, res) {
        const { id, id_procedimento } = req.params;
        const { id_clinica } = req.usuario;

        try {
            const consulta = await prisma.consulta.findFirst({
            where: { id_consulta: Number(id), id_clinica }
            });

            if (!consulta) {
            return res.status(404).json({ error: 'Consulta não encontrada.' });
            }

            await prisma.consultaProcedimento.delete({
            where: {
                consulta_id_procedimento_id: {
                consulta_id: Number(id),
                procedimento_id: Number(id_procedimento)
                }
            }
            });

            res.status(204).send();
        } catch (err) {
            console.error('Erro ao remover procedimento da consulta:', err);
            res.status(500).json({ error: 'Erro ao remover procedimento da consulta.' });
        }
    }

};

module.exports = { ConsultasController };
