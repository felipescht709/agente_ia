const { PrismaClient, StatusConsultaInterno, TipoInteracaoRobo } = require('@prisma/client'); // Importar enums relevantes
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
      // Usar os valores string do Enum Interno para filtragem
      const agendadas = consultas.filter(c => c.status === StatusConsultaInterno.AGENDADA).length;
      const realizadas = consultas.filter(c => c.status === StatusConsultaInterno.REALIZADA).length;
      const canceladas = consultas.filter(c => c.status === StatusConsultaInterno.CANCELADA).length;
      const faltas = consultas.filter(c => c.status === StatusConsultaInterno.NAO_COMPARECEU).length; // Usar o enum correto

      const online = consultas.filter(c => c.telemedicina === true).length;
      const presencial = consultas.filter(c => c.telemedicina === false).length;

      // Se id_convenio é null, é particular.
      const particulares = consultas.filter(c => c.id_convenio === null).length;
      const convenios = consultas.filter(c => c.id_convenio !== null).length;

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
        // Usar os enums TipoInteracaoRobo para tipos de interação mais específicos
        tipo: { in: [TipoInteracaoRobo.DUVIDA_GERAL, TipoInteracaoRobo.SOLICITACAO_AGENDAMENTO_INICIAL] } // Ajustado para os novos enums
      },
      select: {
        id_paciente: true
      },
      distinct: ['id_paciente'] // Garante IDs de pacientes únicos
    });

    const ids = interacoes.map(i => i.id_paciente);

    const pacientes = await prisma.paciente.findMany({
      where: {
        id_clinica,
        id_paciente: { in: ids },
        consultas: { none: { id_clinica } }, // Garante que não tenham consultas para ESTA clínica
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
        status: StatusConsultaInterno.NAO_COMPARECEU, // Usar o enum correto
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
    // Para contar procedimentos executados POR CLÍNICA, precisamos de uma JOIN ou filtro mais complexo
    // ConsultaProcedimento não tem id_clinica direto, mas a Consulta tem
    const resultados = await prisma.consultaProcedimento.groupBy({
      by: ['procedimento_id'],
      where: {
        consulta: { // Filtra a consulta pela clínica
          id_clinica
        }
      },
      _count: true
    });

    const procedimentos = await Promise.all(resultados.map(async (item) => {
      // Buscar o procedimento associado à clínica
      const proc = await prisma.procedimento.findUnique({
        where: {
          id_procedimento: item.procedimento_id,
          id_clinica // Garante que o procedimento é da clínica certa
        },
        select: { nome_procedimento: true } // Selecionar apenas o necessário
      });

      // Retornar apenas se o procedimento for encontrado (pertencer à clínica)
      if (proc) {
        return {
          procedimento: proc.nome_procedimento,
          total: item._count
        };
      }
      return null;
    }));

    // Filtrar quaisquer entradas nulas que possam ter surgido
    const filteredProcedimentos = procedimentos.filter(Boolean);

    res.json(filteredProcedimentos);
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
        status: StatusConsultaInterno.REALIZADA // Usar o enum correto
      },
      select: {
        valor: true
      }
    });

    // Reduce soma o valor. O valor agora é Decimal, então pode precisar de .toNumber() se você precisar do número.
    // Prisma tipa Decimal como objeto Decimal.js, a soma direta pode funcionar, mas para garantir:
    const total = consultas.reduce((acc, c) => acc + (c.valor?.toNumber() || 0), 0);

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

    // Conta pacientes que têm pelo menos uma consulta para esta clínica
    const comConsulta = await prisma.paciente.count({
      where: {
        id_clinica,
        ativo: true,
        consultas: {
          some: { id_clinica } // Filtrar consultas pela ID da clínica
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
      where: { id_clinica }, // Filtra por id_clinica
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
      where: { id_clinica }, // Filtra por id_clinica
      select: { economia_estimada: true }
    });

    // Se economia_estimada for Decimal, use .toNumber()
    const totalEconomia = controle.reduce((acc, c) => acc + c.economia_estimada.toNumber(), 0);

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
      where: { id_clinica }, // Filtra por id_clinica
      select: {
        // renomeado no schema para nota_satisfacao e comentario
        nota_satisfacao: true,
        comentario: true,
        data_avaliacao: true
      }
    });

    const total = avaliacoes.length;

    // Opcional: Calcular NPS real (Promotores - Detratores) / Total * 100
    // const promotores = avaliacoes.filter(a => a.nota_satisfacao >= 9).length;
    // const neutros = avaliacoes.filter(a => a.nota_satisfacao >= 7 && a.nota_satisfacao <= 8).length;
    // const detratores = avaliacoes.filter(a => a.nota_satisfacao >= 0 && a.nota_satisfacao <= 6).length;
    // const npsScore = total > 0 ? ((promotores - detratores) / total) * 100 : 0;


    res.json({
      total_avaliacoes: total,
      // nps_score: npsScore.toFixed(2), // Exemplo de como incluir o score
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
        status: StatusConsultaInterno.CANCELADA // Usar o enum correto
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
        status: StatusConsultaInterno.REALIZADA, // Usar o enum correto
        id_convenio: null // Filtra por consultas sem convênio
      },
      select: {
        id_consulta: true,
        valor: true, // Valor agora é Decimal
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
        status: StatusConsultaInterno.REALIZADA, // Usar o enum correto
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
        status: StatusConsultaInterno.REALIZADA // Usar o enum correto
      },
      _count: true
    });

    const top = consultas.sort((a, b) => b._count - a._count)[0];

    if (!top) return res.json({ mensagem: 'Nenhum atendimento registrado.' });

    const profissional = await prisma.profissionalDaSaude.findUnique({
      where: { id_profissional_saude: top.profissional_id, id_clinica }, // Filtrar profissional por id_clinica também
      select: { nome_profissional: true }
    });

    if (!profissional) { // Caso o profissional não seja da clínica, embora não devesse acontecer com o groupBy
      return res.status(404).json({ error: 'Profissional top não encontrado para esta clínica.' });
    }

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
        status: StatusConsultaInterno.REALIZADA, // Usar o enum correto
        valor: { not: null }
      },
      select: {
        valor: true, // Valor é Decimal
        profissional_id: true
      }
    });

    const somatorio = {};

    for (const consulta of consultas) {
      const id = consulta.profissional_id;
      // Acesse o valor como Decimal e converta para número antes de somar
      somatorio[id] = (somatorio[id] || 0) + (consulta.valor?.toNumber() || 0);
    }

    // Object.entries(somatorio) retorna [id, valor]
    const [idTop, total] = Object.entries(somatorio).sort((a, b) => b[1] - a[1])[0] || [];

    if (!idTop) return res.json({ mensagem: 'Nenhum valor registrado.' });

    const profissional = await prisma.profissionalDaSaude.findUnique({
      where: { id_profissional_saude: parseInt(idTop), id_clinica }, // Filtrar profissional por id_clinica também
      select: { nome_profissional: true }
    });

    if (!profissional) {
      return res.status(404).json({ error: 'Profissional top por valor não encontrado para esta clínica.' });
    }

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
    // Agrupar procedimentos executados dentro da clínica
    const resultados = await prisma.consultaProcedimento.groupBy({
      by: ['procedimento_id'],
      where: {
        consulta: { // Filtra consultas por id_clinica
          id_clinica
        }
      },
      _count: true
    });

    const top = resultados.sort((a, b) => b._count - a._count)[0];

    if (!top) return res.json({ mensagem: 'Nenhum procedimento registrado.' });

    const procedimento = await prisma.procedimento.findUnique({
      where: { id_procedimento: top.procedimento_id, id_clinica }, // Filtrar procedimento por id_clinica também
      select: { nome_procedimento: true }
    });

    if (!procedimento) {
      return res.status(404).json({ error: 'Procedimento top por volume não encontrado para esta clínica.' });
    }

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
        data_hora_fim: { not: null },
        status: { in: [StatusConsultaInterno.REALIZADA, StatusConsultaInterno.FINALIZADA_SEM_ATENDIMENTO] } // Considerar status concluídos
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
      const duracao = (new Date(c.data_hora_fim).getTime() - new Date(c.data_hora_inicio).getTime()) / (1000 * 60 * 60); // Duração em horas
      acumulado[c.profissional_id] = (acumulado[c.profissional_id] || 0) + duracao;
      contagem[c.profissional_id] = (contagem[c.profissional_id] || 0) + 1;
    }

    const resultado = await Promise.all(Object.keys(acumulado).map(async (id) => {
      const profissional = await prisma.profissionalDaSaude.findUnique({
        where: { id_profissional_saude: parseInt(id), id_clinica }, // Filtra profissional por id_clinica
        select: { nome_profissional: true }
      });

      if (!profissional) return null; // Retorna null se profissional não for da clínica

      return {
        profissional: profissional.nome_profissional,
        media_horas: (acumulado[id] / contagem[id]).toFixed(2)
      };
    }));

    res.json(resultado.filter(Boolean)); // Filtra entradas nulas
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
        data_hora_fim: { not: null },
        status: { in: [StatusConsultaInterno.REALIZADA, StatusConsultaInterno.FINALIZADA_SEM_ATENDIMENTO] } // Considerar status concluídos
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
      const duracao = (new Date(c.data_hora_fim).getTime() - new Date(c.data_hora_inicio).getTime()) / (1000 * 60 * 60); // Duração em horas
      acumulado[c.profissional_id] = (acumulado[c.profissional_id] || 0) + duracao;
      contagem[c.profissional_id] = (contagem[c.profissional_id] || 0) + 1;
    }

    const resultado = await Promise.all(Object.keys(acumulado).map(async (id) => {
      const profissional = await prisma.profissionalDaSaude.findUnique({
        where: { id_profissional_saude: parseInt(id), id_clinica }, // Filtra profissional por id_clinica
        select: { nome_profissional: true }
      });

      if (!profissional) return null; // Retorna null se profissional não for da clínica

      return {
        profissional: profissional.nome_profissional,
        media_horas: (acumulado[id] / contagem[id]).toFixed(2)
      };
    }));

    res.json(resultado.filter(Boolean)); // Filtra entradas nulas
  } catch (err) {
    console.error("Erro em mediaHorasOnline:", err);
    res.status(500).json({ error: "Erro ao calcular média de horas online." });
  }
},

async procedimentoTopValor(req, res) {
  const { id_clinica } = req.usuario;

  try {
    // Agrupar procedimentos executados dentro da clínica
    const procedimentos = await prisma.consultaProcedimento.findMany({
      where: {
        consulta: { // Filtra a consulta pela clínica
          id_clinica,
          status: StatusConsultaInterno.REALIZADA // Apenas procedimentos de consultas realizadas
        }
      },
      include: {
        procedimento: {
          select: {
            id_procedimento: true,
            nome_procedimento: true,
            valor: true // Valor é Decimal
          }
        }
      }
    });

    const valores = {};

    for (const cp of procedimentos) {
      // Garante que o procedimento existe e pertence à clínica (já filtrado pela consulta)
      if (cp.procedimento) {
        const id = cp.procedimento.id_procedimento;
        valores[id] = (valores[id] || 0) + (cp.procedimento.valor?.toNumber() || 0);
      }
    }

    const [idTop, total] = Object.entries(valores).sort((a, b) => b[1] - a[1])[0] || [];

    if (!idTop) return res.json({ mensagem: 'Nenhum procedimento com valor registrado para esta clínica.' });

    const procedimento = await prisma.procedimento.findUnique({
      where: { id_procedimento: parseInt(idTop), id_clinica }, // Filtrar procedimento por id_clinica
      select: { nome_procedimento: true }
    });

    if (!procedimento) { // Caso o procedimento não seja da clínica
      return res.status(404).json({ error: 'Procedimento top por valor não encontrado para esta clínica.' });
    }

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
        status: StatusConsultaInterno.REALIZADA // Usar o enum correto
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
        status: StatusConsultaInterno.REALIZADA // Usar o enum correto
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
    // Buscar consultas realizadas para a clínica e incluir procedimentos e seus valores
    const consultas = await prisma.consulta.findMany({
      where: {
        id_clinica,
        status: StatusConsultaInterno.REALIZADA // Apenas consultas realizadas
      },
      select: {
        paciente_id: true,
        procedimentos: {
          include: {
            procedimento: {
              select: { valor: true } // Selecionar apenas o valor do procedimento
            }
          }
        }
      }
    });

    const gastos = {};

    for (const consulta of consultas) {
      const total = consulta.procedimentos.reduce((acc, cp) => acc + (cp.procedimento?.valor?.toNumber() || 0), 0); // Somar valores como número
      gastos[consulta.paciente_id] = (gastos[consulta.paciente_id] || 0) + total;
    }

    const [idTop, total] = Object.entries(gastos).sort((a, b) => b[1] - a[1])[0] || [];

    if (!idTop) return res.json({ mensagem: 'Nenhum gasto registrado para esta clínica.' });

    const paciente = await prisma.paciente.findUnique({
      where: { id_paciente: parseInt(idTop), id_clinica }, // Filtrar paciente por id_clinica
      select: { nome: true }
    });

    if (!paciente) {
      return res.status(404).json({ error: 'Paciente top por gasto não encontrado para esta clínica.' });
    }

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