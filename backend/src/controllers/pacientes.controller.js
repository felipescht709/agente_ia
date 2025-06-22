const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PacientesController = {
  // Novo método para buscar ou criar um paciente, usado pelo Agente IA
  async buscarOuCriar(req, res) {
    // Para chamadas do Agente IA (n8n), o id_clinica virá diretamente do corpo da requisição
    // O middleware de autenticação (se houver) pode ser ignorado ou ter uma rota específica para o bot.
    const { clientId, cpf, nome, data_nascimento, email, telefone } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'ID da clínica (clientId) é obrigatório.' });
    }
    if (!cpf || !nome || !telefone || !email) { 
        return res.status(400).json({ error: 'CPF, nome, telefone e email são obrigatórios para buscar ou criar paciente.' });
    }

    try {
      // Tenta encontrar um paciente existente com o CPF E id_clinica
      let paciente = await prisma.paciente.findUnique({
        where: {
          cpf_id_clinica: { 
             cpf: cpf,
             id_clinica: parseInt(clientId),
          },
          // Se não tiver chave composta, use findFirst com AND:
          // cpf: cpf,
          // id_clinica: parseInt(clientId),
        },
      });

      if (paciente) {
        // Se o paciente existe, retorna-o.
        // Opcional: Se o paciente foi encontrado, mas algum dado (como telefone/email) mudou, você pode atualizá-lo aqui.
        if (paciente.telefone !== telefone || paciente.email !== email) {
            paciente = await prisma.paciente.update({
                where: { id_paciente: paciente.id_paciente },
                data: { telefone, email }
            });
        }
        return res.status(200).json({ status: 'existente', data: paciente });
      } else {
        // Se o paciente não existe para esta clínica, cria um novo
        // Note que data_nascimento é obrigatória no seu schema. Se o bot não fornecer, pode falhar.
        // Opcional: Se o bot não tiver data_nascimento, você pode usar uma data padrão ou null (se o campo permitir).
        const novaDataNascimento = data_nascimento ? new Date(data_nascimento) : new Date('2000-01-01'); // Ajuste conforme a necessidade ou se é obrigatório/opcional para o bot

        const novoPaciente = await prisma.paciente.create({
          data: {
            cpf,
            nome,
            data_nascimento: novaDataNascimento, // Usar a data processada
            email,
            telefone,
            id_clinica: parseInt(clientId),
            ativo: true // Paciente novo sempre ativo por padrão
          }
        });
        return res.status(201).json({ status: 'criado', data: novoPaciente });
      }
    } catch (err) {
      console.error('Erro ao buscar ou criar paciente:', err);
      // Erro comum pode ser CPF já existente para OUTRA clínica.
      // O schema anterior tinha 'cpf @unique', o novo tem 'cpf @unique([id_clinica, cpf])' se implementou a chave composta.
      // Se não implementou a chave composta no CPF e ele é GLOBAL @unique, o findUnique({ where: { cpf } }) já seria suficiente.
      // Com o schema atualizado (com '@@unique([cpf, id_clinica])'), o findUnique precisa dos dois.
      if (err.code === 'P2002' && err.meta?.target?.includes('cpf')) { // Erro de unique constraint
        return res.status(409).json({ error: 'CPF já cadastrado para esta clínica.' });
      }
      return res.status(500).json({ error: 'Erro ao buscar ou criar paciente.' });
    }
  },

  async criar(req, res) {
    // Este método é para a criação manual via sistema (usuário logado)
    const { id_clinica } = req.usuario; // id_clinica vem do token de autenticação
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
      // A verificação de CPF agora precisa incluir id_clinica para ser precisa em um SaaS
      const pacienteExistente = await prisma.paciente.findFirst({
        where: {
          cpf: cpf,
          id_clinica: id_clinica 
        }
      });

      if (pacienteExistente) {
        return res.status(400).json({ error: 'Paciente com este CPF já está cadastrado para esta clínica.' });
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
          id_clinica, // Garante que o paciente seja criado para a clínica do usuário logado
          ativo: true
        }
      });

      return res.status(201).json(paciente);
    } catch (err) {
      console.error('Erro ao cadastrar paciente:', err);
      // Adicionado tratamento para erro de unique constraint caso o CPF seja @unique global
      if (err.code === 'P2002' && err.meta?.target?.includes('cpf')) {
        return res.status(409).json({ error: 'CPF já cadastrado.' }); // Se o CPF for globalmente único
      }
      return res.status(500).json({ error: 'Erro ao cadastrar paciente.' });
    }
  },

  async listar(req, res) {
    const { id_clinica } = req.usuario;

    try {
      const pacientes = await prisma.paciente.findMany({
        where: { id_clinica, ativo: true }, // Garante que só lista pacientes da clínica do usuário
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
          id_clinica, // Garante que o usuário só detalhe pacientes da sua clínica
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
    const { id_clinica } = req.usuario; // id_clinica do usuário logado

    try {
      // Primeiro, verifica se o paciente existe E pertence à clínica do usuário logado
      const pacienteExistente = await prisma.paciente.findFirst({
        where: {
          id_paciente: Number(id),
          id_clinica,
          ativo: true
        }
      });

      if (!pacienteExistente) {
        return res.status(404).json({ error: 'Paciente não encontrado ou não pertence a esta clínica.' });
      }

      // Se houver tentativa de atualizar CPF, deve-se verificar a unicidade também dentro da clínica
      if (req.body.cpf && req.body.cpf !== pacienteExistente.cpf) {
        const cpfDuplicado = await prisma.paciente.findFirst({
          where: {
            cpf: req.body.cpf,
            id_clinica,
            NOT: { id_paciente: Number(id) } // Exclui o próprio paciente da verificação
          }
        });
        if (cpfDuplicado) {
          return res.status(400).json({ error: 'Novo CPF já cadastrado para outro paciente nesta clínica.' });
        }
      }

      const atualizado = await prisma.paciente.update({
        where: { id_paciente: Number(id) },
        data: {
          nome: req.body.nome,
          email: req.body.email,
          telefone: req.body.telefone,
          data_nascimento: req.body.data_nascimento ? new Date(req.body.data_nascimento) : undefined, // Atualizado para usar data_nascimento do body e lidar com undefined
          codigo_ibge: req.body.codigo_ibge,
          cep: req.body.cep,
          logradouro: req.body.logradouro,
          numero: req.body.numero,
          complemento: req.body.complemento,
          bairro: req.body.bairro,
          cidade: req.body.cidade,
          uf: req.body.uf,
          cpf: req.body.cpf // Adicionado CPF para permitir atualização
        }
      });

      res.json(atualizado);
    } catch (err) {
      console.error('Erro ao atualizar paciente:', err);
      if (err.code === 'P2002' && err.meta?.target?.includes('cpf')) {
        return res.status(409).json({ error: 'CPF já cadastrado.' });
      }
      return res.status(500).json({ error: 'Erro ao atualizar paciente.' });
    }
  },

  async inativar(req, res) {
    const { id } = req.params;
    const { id_clinica } = req.usuario;

    try {
      const paciente = await prisma.paciente.findFirst({
        where: {
          id_paciente: Number(id),
          id_clinica, // Garante que o usuário só inative pacientes da sua clínica
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
  }
};

module.exports = { PacientesController };