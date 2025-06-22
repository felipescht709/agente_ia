const { PrismaClient, StatusConsultaInterno, OrigemAgendamento } = require('@prisma/client'); // Importar enums
const prisma = new PrismaClient();

const ConsultasController = {
  // Método para criar consulta (via interface humana)
  async criar(req, res) {
    const { id_clinica } = req.usuario; // id_clinica da clínica do usuário logado
    const {
      paciente_id,
      profissional_id,
      data_hora_inicio,
      data_hora_fim,
      valor,
      telemedicina = false,
      status, // Deve ser um StatusConsultaInterno
      observacoes,
      id_convenio // Pode ser nulo
    } = req.body;

    // Validações básicas
    if (!paciente_id || !profissional_id || !data_hora_inicio || !status) {
        return res.status(400).json({ error: 'Paciente, profissional, data/hora de início e status são obrigatórios.' });
    }
    if (!Object.values(StatusConsultaInterno).includes(status)) {
        return res.status(400).json({ error: `Status da consulta inválido. Valores permitidos: ${Object.values(StatusConsultaInterno).join(', ')}` });
    }

    try {
        // Opcional: Verificar se paciente e profissional existem E pertencem à mesma clínica
        const paciente = await prisma.paciente.findFirst({ where: { id_paciente: paciente_id, id_clinica, ativo: true } });
        const profissional = await prisma.profissionalDaSaude.findFirst({ where: { id_profissional_saude: profissional_id, id_clinica, ativo: true } });

        if (!paciente || !profissional) {
            return res.status(404).json({ error: 'Paciente ou profissional não encontrado ou não pertence a esta clínica.' });
        }

        // Criar a consulta
        const consulta = await prisma.consulta.create({
            data: {
                paciente_id,
                profissional_id,
                data_hora_inicio: new Date(data_hora_inicio),
                data_hora_fim: data_hora_fim ? new Date(data_hora_fim) : null,
                valor,
                telemedicina: Boolean(telemedicina),
                status,
                observacoes,
                id_clinica, // Garante que a consulta seja criada para a clínica do usuário logado
                id_convenio,
                origem_agendamento: OrigemAgendamento.MANUAL // Origem manual
            }
        });

        // Opcional: Atualizar status do slot da agenda se houver um sistema de slotting direto
        // Ex: marcar o slot como AGENDADO

        return res.status(201).json(consulta);
    } catch (err) {
        console.error('Erro ao criar consulta:', err);
        return res.status(500).json({ error: 'Erro ao criar consulta.' });
    }
  },

  // Novo método para criar consulta (usado pelo Agente IA)
  async criarPeloAgente(req, res) {
    const {
      clientId, // id_clinica vindo do n8n (Agente IA)
      paciente_id,
      profissional_id,
      data_hora_inicio,
      data_hora_fim,
      valor, // Pode vir ou ser calculado pelo backend
      telemedicina,
      status, // Virá do n8n, como 'PENDENTE_CONFIRMACAO' ou 'AGENDADA'
      observacoes
    } = req.body;

    if (!clientId || !paciente_id || !profissional_id || !data_hora_inicio || !status) {
        return res.status(400).json({ error: 'ID da clínica, paciente, profissional, data/hora e status são obrigatórios.' });
    }
    if (!Object.values(StatusConsultaInterno).includes(status)) {
        return res.status(400).json({ error: `Status da consulta inválido. Valores permitidos: ${Object.values(StatusConsultaInterno).join(', ')}` });
    }

    try {
        // Verificar se paciente e profissional existem E pertencem à mesma clínica (clientId)
        const paciente = await prisma.paciente.findFirst({ where: { id_paciente: paciente_id, id_clinica: parseInt(clientId), ativo: true } });
        const profissional = await prisma.profissionalDaSaude.findFirst({ where: { id_profissional_saude: profissional_id, id_clinica: parseInt(clientId), ativo: true } });

        if (!paciente || !profissional) {
            return res.status(404).json({ error: 'Paciente ou profissional não encontrado para esta clínica.' });
        }

        // Criar a consulta
        const consulta = await prisma.consulta.create({
            data: {
                paciente_id,
                profissional_id,
                data_hora_inicio: new Date(data_hora_inicio),
                data_hora_fim: data_hora_fim ? new Date(data_hora_fim) : null,
                valor: valor || null, // Se o valor não for fornecido, deixe null
                telemedicina: Boolean(telemedicina),
                status,
                observacoes: observacoes || 'Agendado via Agente IA',
                id_clinica: parseInt(clientId),
                origem_agendamento: OrigemAgendamento.WHATSAPP_BOT // Origem Agente IA
            }
        });
        return res.status(201).json(consulta);
    } catch (err) {
        console.error('Erro ao criar consulta pelo Agente IA:', err);
        return res.status(500).json({ error: 'Erro ao criar consulta pelo Agente IA.' });
    }
  },

  async listar(req, res) {
    const { id_clinica } = req.usuario;

    try {
      const consultas = await prisma.consulta.findMany({
        where: { id_clinica }, // Filtra por id_clinica
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

  // Novo método para buscar consultas para lembretes (para o Agente IA)
  async buscarProximasConsultas(req, res) {
    const { clientId, data, status } = req.query; // data: YYYY-MM-DD, status: AGENDADA
    if (!clientId || !data) {
        return res.status(400).json({ error: 'ID da clínica e data são obrigatórios.' });
    }

    const dataBusca = new Date(data);
    const dataFimDoDia = new Date(dataBusca);
    dataFimDoDia.setHours(23, 59, 59, 999); // Ajusta para o final do dia

    try {
      const consultas = await prisma.consulta.findMany({
        where: {
          id_clinica: parseInt(clientId),
          data_hora_inicio: {
            gte: dataBusca,
            lte: dataFimDoDia // Busca até o final do dia
          },
          status: status || StatusConsultaInterno.AGENDADA // Status padrão AGENDADA
        },
        include: {
          paciente: { select: { id_paciente: true, nome: true, telefone: true } },
          profissional: { select: { id_profissional_saude: true, nome_profissional: true } }
          // Opcional: incluir endereço da clínica/consultório se relevante para o lembrete
          // clinica: { select: { logradouro: true, numero: true, cidade: true, uf: true } }
        },
        orderBy: { data_hora_inicio: 'asc' }
      });

      res.status(200).json(consultas);
    } catch (err) {
      console.error('Erro ao buscar próximas consultas (Agente IA):', err);
      res.status(500).json({ error: 'Erro ao buscar próximas consultas.' });
    }
  },

  // Novo método para buscar consultas realizadas ontem (para o Agente IA)
  async buscarRealizadasOntem(req, res) {
    const { clientId } = req.query;
    if (!clientId) {
        return res.status(400).json({ error: 'ID da clínica é obrigatório.' });
    }

    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1); // Volta um dia
    ontem.setHours(0, 0, 0, 0); // Início do dia de ontem

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Início do dia de hoje

    try {
      const consultas = await prisma.consulta.findMany({
        where: {
          id_clinica: parseInt(clientId),
          data_hora_inicio: {
            gte: ontem,
            lt: hoje // Menor que o início de hoje (até 23:59:59 de ontem)
          },
          status: StatusConsultaInterno.REALIZADA // Apenas as realmente realizadas
        },
        include: {
          paciente: { select: { id_paciente: true, nome: true, telefone: true } },
          profissional: { select: { id_profissional_saude: true, nome_profissional: true } }
        },
        orderBy: { data_hora_inicio: 'desc' }
      });

      res.status(200).json(consultas);
    } catch (err) {
      console.error('Erro ao buscar consultas realizadas ontem (Agente IA):', err);
      res.status(500).json({ error: 'Erro ao buscar consultas realizadas ontem.' });
    }
  },

    async detalhar(req, res) {
        const { id } = req.params;
        const { id_clinica } = req.usuario; // id_clinica da clínica do usuário logado

        try {
            const consulta = await prisma.consulta.findFirst({
            where: {
                id_consulta: Number(id),
                id_clinica // Garante que o usuário só detalhe consultas da sua clínica
            },
            include: {
                paciente: true,
                profissional: true,
                procedimentos: {
                    include: {
                        procedimento: true
                    }
                },
                convenio: true // Incluir dados do convênio
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
        const { id_clinica } = req.usuario; // id_clinica do usuário logado
        const {
            status, // Agora é StatusConsultaInterno
            data_hora_inicio,
            data_hora_fim,
            observacoes,
            id_convenio // Pode ser atualizado
        } = req.body;

        try {
            // Primeiro, verifica se a consulta existe E pertence à clínica do usuário logado
            const consultaExistente = await prisma.consulta.findFirst({
            where: {
                id_consulta: Number(id),
                id_clinica
            }
            });

            if (!consultaExistente) {
            return res.status(404).json({ error: 'Consulta não encontrada ou não pertence a esta clínica.' });
            }

            // Valida o status recebido
            if (status && !Object.values(StatusConsultaInterno).includes(status)) {
                return res.status(400).json({ error: `Status da consulta inválido. Valores permitidos: ${Object.values(StatusConsultaInterno).join(', ')}` });
            }

            const atualizada = await prisma.consulta.update({
            where: { id_consulta: Number(id) },
            data: {
                status: status || consultaExistente.status, // Atualiza status se fornecido
                data_hora_inicio: data_hora_inicio ? new Date(data_hora_inicio) : consultaExistente.data_hora_inicio,
                data_hora_fim: data_hora_fim ? new Date(data_hora_fim) : consultaExistente.data_hora_fim,
                observacoes: observacoes ?? consultaExistente.observacoes, // Usa nullish coalescing
                id_convenio: id_convenio ?? consultaExistente.id_convenio // Atualiza convênio
            }
            });

            res.json(atualizada);
        } catch (err) {
            console.error('Erro ao atualizar consulta:', err);
            res.status(500).json({ error: 'Erro ao atualizar consulta.' });
        }
    },

    // Novo método para atualizar status da consulta (usado pelo Agente IA)
    async atualizarStatusPeloAgente(req, res) {
        const { id } = req.params; // id da consulta
        const { clientId, status, observacoes } = req.body; // clientId e novo status do bot

        if (!clientId || !status) {
            return res.status(400).json({ error: 'ID da clínica (clientId) e status são obrigatórios.' });
        }
        if (!Object.values(StatusConsultaInterno).includes(status)) {
            return res.status(400).json({ error: `Status da consulta inválido. Valores permitidos: ${Object.values(StatusConsultaInterno).join(', ')}` });
        }

        try {
            // Primeiro, verifica se a consulta existe E pertence à clínica do Agente IA
            const consultaExistente = await prisma.consulta.findFirst({
                where: {
                    id_consulta: Number(id),
                    id_clinica: parseInt(clientId)
                }
            });

            if (!consultaExistente) {
                return res.status(404).json({ error: 'Consulta não encontrada para esta clínica.' });
            }

            const atualizada = await prisma.consulta.update({
                where: { id_consulta: Number(id) },
                data: {
                    status,
                    observacoes: observacoes || consultaExistente.observacoes,
                    // Opcional: registrar id_usuario do bot que fez a alteração
                    // id_usuario_alteracao: id_usuario_do_bot (se você criar um usuário para o bot)
                }
            });

            return res.status(200).json(atualizada);
        } catch (err) {
            console.error('Erro ao atualizar status da consulta pelo Agente IA:', err);
            return res.status(500).json({ error: 'Erro ao atualizar status da consulta pelo Agente IA.' });
        }
    },

    async associarProcedimentos(req, res) {
        const { id } = req.params; // id da consulta
        const { procedimentos_ids } = req.body;
        const { id_clinica } = req.usuario; // id_clinica da clínica do usuário logado

        if (!Array.isArray(procedimentos_ids) || procedimentos_ids.length === 0) {
            return res.status(400).json({ error: 'Informe pelo menos um procedimento.' });
        }

        try {
            // Verifica se a consulta existe E pertence à clínica do usuário
            const consulta = await prisma.consulta.findFirst({
            where: { id_consulta: Number(id), id_clinica }
            });

            if (!consulta) {
            return res.status(404).json({ error: 'Consulta não encontrada ou não pertence a esta clínica.' });
            }

            // Opcional: Verificar se os procedimentos_ids pertencem à mesma clínica
            const procedimentosValidos = await prisma.procedimento.count({
                where: {
                    id_procedimento: { in: procedimentos_ids },
                    id_clinica
                }
            });
            if (procedimentosValidos !== procedimentos_ids.length) {
                return res.status(400).json({ error: 'Um ou mais procedimentos não pertencem a esta clínica ou não existem.' });
            }


            // Conectar procedimentos à consulta
            const registros = await Promise.all(
            procedimentos_ids.map(async (pid) => {
                return await prisma.consultaProcedimento.upsert({
                where: {
                    consulta_id_procedimento_id: { // Usa a chave composta
                    consulta_id: Number(id),
                    procedimento_id: pid
                    }
                },
                update: {}, // Não faz nada se já existe
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
        const { id } = req.params; // id da consulta
        const { id_clinica } = req.usuario; // id_clinica da clínica do usuário logado

        try {
            // Verifica se a consulta existe E pertence à clínica do usuário
            const consulta = await prisma.consulta.findFirst({
            where: { id_consulta: Number(id), id_clinica }
            });

            if (!consulta) {
            return res.status(404).json({ error: 'Consulta não encontrada ou não pertence a esta clínica.' });
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
        const { id, id_procedimento } = req.params; // id da consulta, id do procedimento
        const { id_clinica } = req.usuario; // id_clinica da clínica do usuário logado

        try {
            // Verifica se a consulta existe E pertence à clínica do usuário
            const consulta = await prisma.consulta.findFirst({
            where: { id_consulta: Number(id), id_clinica }
            });

            if (!consulta) {
            return res.status(404).json({ error: 'Consulta não encontrada ou não pertence a esta clínica.' });
            }

            await prisma.consultaProcedimento.delete({
            where: {
                consulta_id_procedimento_id: { // Usa a chave composta
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