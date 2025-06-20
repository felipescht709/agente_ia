const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RelatoriosController = {
  async consultas(req, res) {
    const { id_clinica } = req.usuario;
    const { inicio, fim } = req.query;

    try {
      const dataInicio = new Date(inicio);
      const dataFim = new Date(fim);

      const consultas = await prisma.consulta.findMany({
        where: {
          id_clinica,
          data_hora_inicio: {
            gte: dataInicio,
            lte: dataFim
          }
        }
      });

      const total = consultas.length;
      const agendadas = consultas.filter(c => c.status === 'AGENDADA').length;
      const realizadas = consultas.filter(c => c.status === 'REALIZADA').length;
      const canceladas = consultas.filter(c => c.status === 'CANCELADA').length;
      const faltas = consultas.filter(c => c.status === 'FALTOU').length;

      const online = consultas.filter(c => c.telemedicina === true).length;
      const presencial = consultas.filter(c => c.telemedicina === false).length;

      // Placeholder para convênio vs particular (assumindo todos são particulares por enquanto)
      const particulares = total;
      const convenios = 0;

      return res.json({
        total,
        agendadas,
        realizadas,
        canceladas,
        faltas,
        presenciais: presencial,
        telemedicina: online,
        particulares,
        convenios
      });
    } catch (err) {
      console.error('Erro ao gerar relatório de consultas:', err);
      res.status(500).json({ error: 'Erro ao gerar relatório de consultas.' });
    }
  },

async interagiramSemConsulta(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const interacoes = await prisma.interacaoRobo.findMany({
      where: {
        id_clinica,
        tipo: { in: ['DUVIDA', 'AGENDAMENTO'] }
      },
      select: {
        id_paciente: true
      },
      distinct: ['id_paciente']
    });

    const ids = interacoes.map(i => i.id_paciente);

    const pacientes = await prisma.paciente.findMany({
      where: {
        id_clinica,
        id_paciente: { in: ids },
        consultas: { none: {} },
        ativo: true
      },
      select: {
        id_paciente: true,
        nome: true,
        email: true,
        telefone: true
      },
      orderBy: { nome: 'asc' }
    });

    res.json({
      total: pacientes.length,
      pacientes
    });
  } catch (err) {
    console.error("Erro em interagiramSemConsulta:", err);
    res.status(500).json({ error: "Erro ao gerar relatório de pacientes que interagiram e não agendaram." });
  }
},

async consultasFaltantes(req, res) {
  const { id_clinica } = req.usuario;
  const { inicio, fim } = req.query;

  try {
    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);

    const faltantes = await prisma.consulta.findMany({
      where: {
        id_clinica,
        status: 'FALTOU',
        data_hora_inicio: {
          gte: dataInicio,
          lte: dataFim
        }
      },
      include: {
        paciente: { select: { nome: true } },
        profissional: { select: { nome_profissional: true } }
      },
      orderBy: { data_hora_inicio: 'asc' }
    });

    res.json({ total: faltantes.length, faltantes });
  } catch (err) {
    console.error('Erro ao buscar consultas faltantes:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório de faltantes.' });
  }
},

async totalProcedimentosExecutados(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const resultados = await prisma.consultaProcedimento.groupBy({
      by: ['procedimento_id'],
      _count: true
    });

    const procedimentos = await Promise.all(resultados.map(async (item) => {
      const proc = await prisma.procedimento.findUnique({
        where: { id_procedimento: item.procedimento_id }
      });

      return {
        procedimento: proc.nome_procedimento,
        total: item._count
      };
    }));

    res.json(procedimentos);
  } catch (err) {
    console.error("Erro em totalProcedimentosExecutados:", err);
    res.status(500).json({ error: "Erro ao gerar relatório: total de procedimentos executados." });
  }
},

async valorArrecadado(req, res) {
  const { id_clinica } = req.usuario;
  const { inicio, fim } = req.query;

  try {
    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);

    const consultas = await prisma.consulta.findMany({
      where: {
        id_clinica,
        data_hora_inicio: {
          gte: dataInicio,
          lte: dataFim
        },
        status: 'REALIZADA'
      },
      select: {
        valor: true
      }
    });

    const total = consultas.reduce((acc, c) => acc + (c.valor || 0), 0);

    res.json({ total_arrecadado: total });
  } catch (err) {
    console.error("Erro em valorArrecadado:", err);
    res.status(500).json({ error: "Erro ao calcular valor arrecadado." });
  }
},

async conversaoRobo(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const total = await prisma.paciente.count({
      where: {
        id_clinica,
        ativo: true
      }
    });

    const comConsulta = await prisma.paciente.count({
      where: {
        id_clinica,
        ativo: true,
        consultas: {
          some: {}
        }
      }
    });

    const semConsulta = total - comConsulta;
    const conversao = total > 0 ? ((comConsulta / total) * 100).toFixed(2) + '%' : '0%';

    res.json({
      total_pacientes: total,
      pacientes_com_consulta: comConsulta,
      pacientes_sem_consulta: semConsulta,
      taxa_conversao: conversao
    });
  } catch (err) {
    console.error("Erro em conversaoRobo:", err);
    res.status(500).json({ error: "Erro ao gerar relatório de conversão do robô." });
  }
},

async horasRobo(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const controle = await prisma.controleOperacional.findMany({
      where: { id_clinica },
      select: { horas_robo_trabalhadas: true }
    });

    const totalHoras = controle.reduce((acc, c) => acc + c.horas_robo_trabalhadas, 0);

    res.json({ total_horas_robo: totalHoras });
  } catch (err) {
    console.error("Erro em horasRobo:", err);
    res.status(500).json({ error: "Erro ao consultar horas do robô." });
  }
},

async economiaRobo(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const controle = await prisma.controleOperacional.findMany({
      where: { id_clinica },
      select: { economia_estimada: true }
    });

    const totalEconomia = controle.reduce((acc, c) => acc + c.economia_estimada, 0);

    res.json({ economia_estimada_total: totalEconomia });
  } catch (err) {
    console.error("Erro em economiaRobo:", err);
    res.status(500).json({ error: "Erro ao consultar economia estimada do robô." });
  }
},

async nps(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const avaliacoes = await prisma.avaliacao.findMany({
      where: { id_clinica },
      select: { parecer_profissional: true, descricao: true, data_avaliacao: true }
    });

    const total = avaliacoes.length;

    res.json({
      total_avaliacoes: total,
      avaliacoes
    });
  } catch (err) {
    console.error("Erro em nps:", err);
    res.status(500).json({ error: "Erro ao buscar avaliações de satisfação." });
  }
},

async consultasCanceladas(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const canceladas = await prisma.consulta.findMany({
      where: {
        id_clinica,
        status: 'CANCELADA'
      },
      select: {
        id_consulta: true,
        data_hora_inicio: true,
        paciente: { select: { nome: true } },
        profissional: { select: { nome_profissional: true } }
      },
      orderBy: { data_hora_inicio: 'desc' }
    });

    res.json({ total: canceladas.length, canceladas });
  } catch (err) {
    console.error("Erro em consultasCanceladas:", err);
    res.status(500).json({ error: "Erro ao buscar consultas canceladas." });
  }
},

async consultasParticulares(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const particulares = await prisma.consulta.findMany({
      where: {
        id_clinica,
        status: 'REALIZADA'
      },
      select: {
        id_consulta: true,
        valor: true,
        data_hora_inicio: true,
        paciente: { select: { nome: true } },
        profissional: { select: { nome_profissional: true } }
      },
      orderBy: { data_hora_inicio: 'desc' }
    });

    res.json({ total: particulares.length, consultas: particulares });
  } catch (err) {
    console.error("Erro em consultasParticulares:", err);
    res.status(500).json({ error: "Erro ao buscar atendimentos particulares." });
  }
},

async consultasConvenio(req, res) {
  const { id_clinica } = req.usuario;

  try {
    // Todas as consultas realizadas com convênio
    const consultas = await prisma.consulta.findMany({
      where: {
        id_clinica,
        status: 'REALIZADA',
        id_convenio: { not: null }
      },
      include: {
        convenio: true
      }
    });

    const agrupado = {};

    for (const consulta of consultas) {
      const nome = consulta.convenio?.nome || 'Desconhecido';
      agrupado[nome] = (agrupado[nome] || 0) + 1;
    }

    const resultado = Object.entries(agrupado).map(([nome, total]) => ({
      convenio: nome,
      total_consultas: total
    }));

    res.json({
      total_geral: consultas.length,
      convenios: resultado
    });
  } catch (err) {
    console.error('Erro em consultasConvenio:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório de atendimentos por convênio.' });
  }
},

async profissionalTopAtendimentos(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const consultas = await prisma.consulta.groupBy({
      by: ['profissional_id'],
      where: {
        id_clinica,
        status: 'REALIZADA'
      },
      _count: true
    });

    const top = consultas.sort((a, b) => b._count - a._count)[0];

    if (!top) return res.json({ mensagem: 'Nenhum atendimento registrado.' });

    const profissional = await prisma.profissionalDaSaude.findUnique({
      where: { id_profissional_saude: top.profissional_id },
      select: { nome_profissional: true }
    });

    res.json({
      profissional: profissional.nome_profissional,
      total_atendimentos: top._count
    });
  } catch (err) {
    console.error("Erro em profissionalTopAtendimentos:", err);
    res.status(500).json({ error: "Erro ao gerar relatório de atendimentos por profissional." });
  }
},

async profissionalTopValor(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const consultas = await prisma.consulta.findMany({
      where: {
        id_clinica,
        status: 'REALIZADA',
        valor: { not: null }
      },
      select: {
        valor: true,
        profissional_id: true
      }
    });

    const somatorio = {};

    for (const consulta of consultas) {
      const id = consulta.profissional_id;
      somatorio[id] = (somatorio[id] || 0) + (consulta.valor || 0);
    }

    const [idTop, total] = Object.entries(somatorio).sort((a, b) => b[1] - a[1])[0] || [];

    if (!idTop) return res.json({ mensagem: 'Nenhum valor registrado.' });

    const profissional = await prisma.profissionalDaSaude.findUnique({
      where: { id_profissional_saude: parseInt(idTop) },
      select: { nome_profissional: true }
    });

    res.json({
      profissional: profissional.nome_profissional,
      total_arrecadado: total
    });
  } catch (err) {
    console.error("Erro em profissionalTopValor:", err);
    res.status(500).json({ error: "Erro ao gerar relatório de valor por profissional." });
  }
},

async procedimentoTopVolume(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const resultados = await prisma.consultaProcedimento.groupBy({
      by: ['procedimento_id'],
      _count: true
    });

    const top = resultados.sort((a, b) => b._count - a._count)[0];

    if (!top) return res.json({ mensagem: 'Nenhum procedimento registrado.' });

    const procedimento = await prisma.procedimento.findUnique({
      where: { id_procedimento: top.procedimento_id },
      select: { nome_procedimento: true }
    });

    res.json({
      procedimento: procedimento.nome_procedimento,
      total_execucoes: top._count
    });
  } catch (err) {
    console.error("Erro em procedimentoTopVolume:", err);
    res.status(500).json({ error: "Erro ao gerar relatório de volume por procedimento." });
  }
},

async mediaHorasPresencial(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const consultas = await prisma.consulta.findMany({
      where: {
        id_clinica,
        telemedicina: false,
        data_hora_fim: { not: null }
      },
      select: {
        profissional_id: true,
        data_hora_inicio: true,
        data_hora_fim: true
      }
    });

    const acumulado = {};
    const contagem = {};

    for (const c of consultas) {
      const duracao = (new Date(c.data_hora_fim) - new Date(c.data_hora_inicio)) / (1000 * 60 * 60);
      acumulado[c.profissional_id] = (acumulado[c.profissional_id] || 0) + duracao;
      contagem[c.profissional_id] = (contagem[c.profissional_id] || 0) + 1;
    }

    const resultado = await Promise.all(Object.keys(acumulado).map(async (id) => {
      const profissional = await prisma.profissionalDaSaude.findUnique({
        where: { id_profissional_saude: parseInt(id) },
        select: { nome_profissional: true }
      });

      return {
        profissional: profissional.nome_profissional,
        media_horas: (acumulado[id] / contagem[id]).toFixed(2)
      };
    }));

    res.json(resultado);
  } catch (err) {
    console.error("Erro em mediaHorasPresencial:", err);
    res.status(500).json({ error: "Erro ao calcular média de horas presenciais." });
  }
},

async mediaHorasOnline(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const consultas = await prisma.consulta.findMany({
      where: {
        id_clinica,
        telemedicina: true,
        data_hora_fim: { not: null }
      },
      select: {
        profissional_id: true,
        data_hora_inicio: true,
        data_hora_fim: true
      }
    });

    const acumulado = {};
    const contagem = {};

    for (const c of consultas) {
      const duracao = (new Date(c.data_hora_fim) - new Date(c.data_hora_inicio)) / (1000 * 60 * 60);
      acumulado[c.profissional_id] = (acumulado[c.profissional_id] || 0) + duracao;
      contagem[c.profissional_id] = (contagem[c.profissional_id] || 0) + 1;
    }

    const resultado = await Promise.all(Object.keys(acumulado).map(async (id) => {
      const profissional = await prisma.profissionalDaSaude.findUnique({
        where: { id_profissional_saude: parseInt(id) },
        select: { nome_profissional: true }
      });

      return {
        profissional: profissional.nome_profissional,
        media_horas: (acumulado[id] / contagem[id]).toFixed(2)
      };
    }));

    res.json(resultado);
  } catch (err) {
    console.error("Erro em mediaHorasOnline:", err);
    res.status(500).json({ error: "Erro ao calcular média de horas online." });
  }
},

async procedimentoTopValor(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const procedimentos = await prisma.consultaProcedimento.findMany({
      where: {
        consulta: {
          id_clinica
        }
      },
      include: {
        procedimento: true
      }
    });

    const valores = {};

    for (const cp of procedimentos) {
      const id = cp.procedimento.id_procedimento;
      valores[id] = (valores[id] || 0) + (cp.procedimento.valor || 0);
    }

    const [idTop, total] = Object.entries(valores).sort((a, b) => b[1] - a[1])[0] || [];

    if (!idTop) return res.json({ mensagem: 'Nenhum procedimento com valor registrado.' });

    const procedimento = await prisma.procedimento.findUnique({
      where: { id_procedimento: parseInt(idTop) },
      select: { nome_procedimento: true }
    });

    res.json({
      procedimento: procedimento.nome_procedimento,
      total_arrecadado: total
    });
  } catch (err) {
    console.error("Erro em procedimentoTopValor:", err);
    res.status(500).json({ error: "Erro ao gerar relatório de valor por procedimento." });
  }
},

async consultasPresenciais(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const consultas = await prisma.consulta.findMany({
      where: {
        id_clinica,
        telemedicina: false,
        status: 'REALIZADA'
      },
      include: {
        paciente: { select: { nome: true } },
        profissional: { select: { nome_profissional: true } }
      },
      orderBy: { data_hora_inicio: 'desc' }
    });

    res.json({
      total: consultas.length,
      consultas
    });
  } catch (err) {
    console.error("Erro em consultasPresenciais:", err);
    res.status(500).json({ error: "Erro ao buscar atendimentos presenciais." });
  }
},

async consultasOnline(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const consultas = await prisma.consulta.findMany({
      where: {
        id_clinica,
        telemedicina: true,
        status: 'REALIZADA'
      },
      include: {
        paciente: { select: { nome: true } },
        profissional: { select: { nome_profissional: true } }
      },
      orderBy: { data_hora_inicio: 'desc' }
    });

    res.json({
      total: consultas.length,
      consultas
    });
  } catch (err) {
    console.error("Erro em consultasOnline:", err);
    res.status(500).json({ error: "Erro ao buscar atendimentos online." });
  }
},

async pacienteTopGasto(req, res) {
  const { id_clinica } = req.usuario;

  try {
    const consultas = await prisma.consulta.findMany({
      where: {
        id_clinica,
        status: 'REALIZADA'
      },
      select: {
        paciente_id: true,
        procedimentos: {
          include: {
            procedimento: true
          }
        }
      }
    });

    const gastos = {};

    for (const consulta of consultas) {
      const total = consulta.procedimentos.reduce((acc, cp) => acc + (cp.procedimento?.valor || 0), 0);
      gastos[consulta.paciente_id] = (gastos[consulta.paciente_id] || 0) + total;
    }

    const [idTop, total] = Object.entries(gastos).sort((a, b) => b[1] - a[1])[0] || [];

    if (!idTop) return res.json({ mensagem: 'Nenhum gasto registrado.' });

    const paciente = await prisma.paciente.findUnique({
      where: { id_paciente: parseInt(idTop) },
      select: { nome: true }
    });

    res.json({
      paciente: paciente.nome,
      total_gasto: total
    });
  } catch (err) {
    console.error("Erro em pacienteTopGasto:", err);
    res.status(500).json({ error: "Erro ao calcular paciente com maior gasto." });
  }
},

};

module.exports = { RelatoriosController };
