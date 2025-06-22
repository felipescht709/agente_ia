const { PrismaClient, TipoUsuario, StatusAgenda } = require('@prisma/client'); // Importar enums
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const ProfissionaisController = {
  async criar(req, res) {
    const { usuario, profissional } = req.body;
    const { tipo, id_clinica } = req.usuario; // id_clinica da clínica do usuário logado

    // Somente ADMIN pode cadastrar profissional
    if (tipo !== TipoUsuario.ADMIN) { // Usar enum
      return res.status(403).json({ error: 'Apenas administradores podem cadastrar profissionais.' });
    }

    if (!usuario || !profissional) {
      return res.status(400).json({ error: 'Dados de usuário e profissional são obrigatórios.' });
    }
    if (!usuario.email || !usuario.senha || !usuario.nome || !profissional.cpf || !profissional.nome_profissional || !profissional.telefone || !profissional.email || !profissional.data_nascimento) {
        return res.status(400).json({ error: 'Campos obrigatórios de usuário e profissional não preenchidos.' });
    }


    try {
      // Verifica se e-mail de USUARIO já existe (e-mail do login)
      const usuarioExistente = await prisma.usuario.findUnique({
        where: { email: usuario.email }
      });

      if (usuarioExistente) {
        return res.status(400).json({ error: 'E-mail de usuário já está em uso.' });
      }

      // Verifica se CPF de PROFISSIONAL já existe APENAS dentro da clínica
      const profissionalCpfExistente = await prisma.profissionalDaSaude.findFirst({
        where: { cpf: profissional.cpf, id_clinica }
      });
      if (profissionalCpfExistente) {
        return res.status(400).json({ error: 'CPF já cadastrado para outro profissional nesta clínica.' });
      }

      // Verifica se e-mail de PROFISSIONAL já existe APENAS dentro da clínica
      const profissionalEmailExistente = await prisma.profissionalDaSaude.findFirst({
        where: { email: profissional.email, id_clinica }
      });
      if (profissionalEmailExistente) {
        return res.status(400).json({ error: 'E-mail de profissional já cadastrado para outro profissional nesta clínica.' });
      }


      const hash = await bcrypt.hash(usuario.senha, 10);

      // Cria o usuário do tipo PROFISSIONAL
      const novoUsuario = await prisma.usuario.create({
        data: {
          nome: usuario.nome,
          email: usuario.email,
          senha: hash,
          tipo: TipoUsuario.PROFISSIONAL, // Usar enum
          id_clinica
        }
      });

      // Cria o profissional da saúde
      const novoProfissional = await prisma.profissionalDaSaude.create({
        data: {
          nome_profissional: profissional.nome_profissional,
          data_nascimento: new Date(profissional.data_nascimento),
          cpf: profissional.cpf,
          conselho: profissional.conselho,
          numero_conselho: profissional.numero_conselho,
          uf_conselho: profissional.uf_conselho,
          rqe: profissional.rqe,
          telefone: profissional.telefone,
          email: profissional.email,
          telemedicina: Boolean(profissional.telemedicina),
          especialidade: profissional.especialidade,
          id_clinica, // Garante que o profissional seja criado para a clínica do usuário logado
          usuario: { connect: { id_usuario: novoUsuario.id_usuario } }
        }
      });

      // Cria agenda inicial do profissional (usar enums e considerar dados mais realistas)
      // Esta agenda inicial pode ser um único slot genérico ou uma tela separada para configuração de escala.
      await prisma.agenda.create({
        data: {
          data: new Date(), // Data atual para um slot inicial. Ajuste conforme sua lógica.
          hora_inicio: new Date(new Date().setHours(9, 0, 0, 0)), // Exemplo: 09:00 de hoje
          hora_fim: new Date(new Date().setHours(17, 0, 0, 0)),   // Exemplo: 17:00 de hoje
          status: StatusAgenda.DISPONIVEL, // Usar enum
          profissional_id: novoProfissional.id_profissional_saude,
          id_clinica
        }
      });

      res.status(201).json({
        profissional: {
          id: novoProfissional.id_profissional_saude,
          nome_profissional: novoProfissional.nome_profissional
        },
        usuario: {
          id: novoUsuario.id_usuario,
          email: novoUsuario.email
        }
      });
    } catch (err) {
      console.error('❌ Erro ao cadastrar profissional:', err);
      // Tratamento de erros de unicidade
      if (err.code === 'P2002') {
        if (err.meta?.target?.includes('email')) {
          return res.status(409).json({ error: 'E-mail já está em uso por outro usuário.' });
        }
        if (err.meta?.target?.includes('cpf')) {
          return res.status(409).json({ error: 'CPF já cadastrado para esta clínica.' });
        }
        if (err.meta?.target?.includes('numero_conselho')) { // Se numero_conselho é único globalmente
            return res.status(409).json({ error: 'Número de conselho já cadastrado.' });
        }
      }
      res.status(500).json({ error: 'Erro ao cadastrar profissional.' });
    }
  },

  async listar(req, res) {
    const { id_clinica } = req.usuario;

    try {
      const profissionais = await prisma.profissionalDaSaude.findMany({
        where: { id_clinica }, // Filtra por id_clinica
        orderBy: { nome_profissional: 'asc' }
      });

      res.json(profissionais);
    } catch (err) {
      console.error('❌ Erro ao listar profissionais:', err);
      res.status(500).json({ error: 'Erro ao listar profissionais.' });
    }
  },

  // Novo método para buscar profissionais por nome (para o Agente IA)
  async buscarPorNome(req, res) {
    const { clientId } = req.body; // id_clinica vindo do n8n para o bot
    const { nomeProfissional } = req.query; // Nome do profissional para busca

    if (!clientId) {
      return res.status(400).json({ error: 'ID da clínica (clientId) é obrigatório.' });
    }
    if (!nomeProfissional) {
      return res.status(400).json({ error: 'Nome do profissional é obrigatório para busca.' });
    }

    try {
      const profissionais = await prisma.profissionalDaSaude.findMany({
        where: {
          id_clinica: parseInt(clientId),
          nome_profissional: {
            contains: nomeProfissional, // Busca parcial
            mode: 'insensitive' // Case-insensitive
          },
          ativo: true
        },
        select: { // Retorna apenas os campos necessários para o n8n
          id_profissional_saude: true,
          nome_profissional: true,
          especialidade: true,
          telemedicina: true
        }
      });

      if (profissionais.length === 0) {
        return res.status(404).json({ message: 'Nenhum profissional encontrado com este nome para esta clínica.' });
      }

      res.status(200).json(profissionais);
    } catch (err) {
      console.error('Erro ao buscar profissional por nome (Agente IA):', err);
      res.status(500).json({ error: 'Erro ao buscar profissional por nome.' });
    }
  },


  async atualizar(req, res) {
    const { id } = req.params;
    const { id_clinica, tipo } = req.usuario;

    if (tipo !== TipoUsuario.ADMIN) { // Usar enum
      return res.status(403).json({ error: 'Apenas administradores podem editar profissionais.' });
    }

    try {
      // Primeiro, verifica se o profissional existe E pertence à clínica do usuário logado
      const profissionalExistente = await prisma.profissionalDaSaude.findFirst({
        where: {
          id_profissional_saude: Number(id),
          id_clinica, // Filtra por id_clinica
          ativo: true
        }
      });

      if (!profissionalExistente) {
        return res.status(404).json({ error: 'Profissional não encontrado ou não pertence a esta clínica.' });
      }

      // Se e-mail ou CPF forem alterados, verificar unicidade dentro da clínica
      if (req.body.cpf && req.body.cpf !== profissionalExistente.cpf) {
        const cpfDuplicado = await prisma.profissionalDaSaude.findFirst({
          where: {
            cpf: req.body.cpf,
            id_clinica,
            NOT: { id_profissional_saude: Number(id) }
          }
        });
        if (cpfDuplicado) {
          return res.status(400).json({ error: 'Novo CPF já cadastrado para outro profissional nesta clínica.' });
        }
      }
      if (req.body.email && req.body.email !== profissionalExistente.email) {
        const emailDuplicado = await prisma.profissionalDaSaude.findFirst({
          where: {
            email: req.body.email,
            id_clinica,
            NOT: { id_profissional_saude: Number(id) }
          }
        });
        if (emailDuplicado) {
          return res.status(400).json({ error: 'Novo e-mail já cadastrado para outro profissional nesta clínica.' });
        }
      }

      const atualizado = await prisma.profissionalDaSaude.update({
        where: { id_profissional_saude: Number(id) },
        data: {
          nome_profissional: req.body.nome_profissional,
          data_nascimento: req.body.data_nascimento ? new Date(req.body.data_nascimento) : undefined,
          conselho: req.body.conselho,
          numero_conselho: req.body.numero_conselho,
          uf_conselho: req.body.uf_conselho,
          rqe: req.body.rqe,
          telefone: req.body.telefone,
          email: req.body.email,
          telemedicina: typeof req.body.telemedicina === 'boolean' ? req.body.telemedicina : undefined, // Garante que seja booleano
          especialidade: req.body.especialidade
        }
      });

      return res.json({ profissional: atualizado });
    } catch (err) {
      console.error('Erro ao atualizar profissional:', err);
      // Tratamento de erros de unicidade
      if (err.code === 'P2002') {
        if (err.meta?.target?.includes('cpf')) {
          return res.status(409).json({ error: 'CPF já cadastrado para esta clínica.' });
        }
        if (err.meta?.target?.includes('email')) {
          return res.status(409).json({ error: 'E-mail já cadastrado para esta clínica.' });
        }
      }
      return res.status(500).json({ error: 'Erro ao atualizar profissional.' });
    }
  },

  async detalhar(req, res) {
    const { id } = req.params;
    const { id_clinica } = req.usuario;

    try {
      const profissional = await prisma.profissionalDaSaude.findFirst({
        where: {
          id_profissional_saude: Number(id),
          id_clinica, // Filtra por id_clinica
          ativo: true
        },
        include: {
          usuario: {
            select: {
              id_usuario: true,
              nome: true,
              email: true
            }
          },
          agenda: { // Adicionado include para agenda para poder ver os slots
            where: { id_clinica }, // Filtrar agenda por id_clinica
            orderBy: { data: 'asc', hora_inicio: 'asc' }
          }
        }
      });

      if (!profissional) {
        return res.status(404).json({ error: 'Profissional não encontrado.' });
      }

      return res.json(profissional);
    } catch (err) {
      console.error('Erro ao buscar profissional:', err);
      return res.status(500).json({ error: 'Erro ao buscar profissional.' });
    }
  },

  async inativar(req, res) {
    const { id } = req.params;
    const { id_clinica, tipo } = req.usuario;

    if (tipo !== TipoUsuario.ADMIN) { // Usar enum
      return res.status(403).json({ error: 'Apenas administradores podem inativar profissionais.' });
    }

    try {
      // Primeiro, verifica se o profissional existe E pertence à clínica do usuário logado
      const profissional = await prisma.profissionalDaSaude.findFirst({
        where: {
          id_profissional_saude: Number(id),
          id_clinica, // Filtra por id_clinica
          ativo: true
        }
      });

      if (!profissional) {
        return res.status(404).json({ error: 'Profissional não encontrado ou já inativo.' });
      }

      // Opcional: Verificar se o profissional tem consultas futuras agendadas
      // const consultasFuturas = await prisma.consulta.count({
      //   where: {
      //     profissional_id: Number(id),
      //     id_clinica,
      //     data_hora_inicio: { gte: new Date() },
      //     status: { in: [StatusConsultaInterno.AGENDADA, StatusConsultaInterno.CONFIRMADA, StatusConsultaInterno.PENDENTE_CONFIRMACAO] }
      //   }
      // });
      // if (consultasFuturas > 0) {
      //   return res.status(400).json({ error: 'Não é possível inativar o profissional: possui consultas futuras agendadas.' });
      // }


      await prisma.profissionalDaSaude.update({
        where: { id_profissional_saude: Number(id) },
        data: { ativo: false }
      });

      return res.status(204).send();
    } catch (err) {
      console.error('Erro ao inativar profissional:', err);
      res.status(500).json({ error: 'Erro ao inativar profissional.' });
    }
  }
};

module.exports = { ProfissionaisController };