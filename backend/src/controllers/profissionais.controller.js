const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const ProfissionaisController = {
  async criar(req, res) {
    const { usuario, profissional } = req.body;
    const { tipo, id_clinica } = req.usuario;

    // Somente ADMIN pode cadastrar profissional
    if (tipo !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas administradores podem cadastrar profissionais.' });
    }

    if (!usuario || !profissional) {
      return res.status(400).json({ error: 'Dados de usuário e profissional são obrigatórios.' });
    }

    try {
      // Verifica se e-mail já existe
      const usuarioExistente = await prisma.usuario.findUnique({
        where: { email: usuario.email }
      });

      if (usuarioExistente) {
        return res.status(400).json({ error: 'E-mail já está em uso.' });
      }

      const hash = await bcrypt.hash(usuario.senha, 10);

      // Cria o usuário do tipo PROFISSIONAL
      const novoUsuario = await prisma.usuario.create({
        data: {
          nome: usuario.nome,
          email: usuario.email,
          senha: hash,
          tipo: 'PROFISSIONAL',
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
          telemedicina: profissional.telemedicina,
          especialidade: profissional.especialidade,
          id_clinica,
          usuario: { connect: { id_usuario: novoUsuario.id_usuario } }
        }
      });

      // Cria agenda inicial do profissional
      await prisma.agenda.create({
        data: {
          data: new Date(), // pode ser substituído por lógica de escalas
          hora_inicio: new Date(),
          hora_fim: new Date(),
          status: 'DISPONIVEL',
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
      res.status(500).json({ error: 'Erro ao cadastrar profissional.' });
    }
  },

  async listar(req, res) {
    const { id_clinica } = req.usuario;

    try {
      const profissionais = await prisma.profissionalDaSaude.findMany({
        where: { id_clinica },
        orderBy: { nome_profissional: 'asc' }
      });

      res.json(profissionais);
    } catch (err) {
      console.error('❌ Erro ao listar profissionais:', err);
      res.status(500).json({ error: 'Erro ao listar profissionais.' });
    }
  },

async atualizar(req, res) {
  const { id } = req.params;
  const { id_clinica, tipo } = req.usuario;

  if (tipo !== 'ADMIN') {
    return res.status(403).json({ error: 'Apenas administradores podem editar profissionais.' });
  }

  try {
    const profissionalExistente = await prisma.profissionalDaSaude.findFirst({
      where: {
        id_profissional_saude: Number(id),
        id_clinica,
        ativo: true
      }
    });

    if (!profissionalExistente) {
      return res.status(404).json({ error: 'Profissional não encontrado.' });
    }

    const atualizado = await prisma.profissionalDaSaude.update({
      where: { id_profissional_saude: Number(id) },
      data: {
        nome_profissional: req.body.nome_profissional,
        data_nascimento: new Date(req.body.data_nascimento),
        conselho: req.body.conselho,
        numero_conselho: req.body.numero_conselho,
        uf_conselho: req.body.uf_conselho,
        rqe: req.body.rqe,
        telefone: req.body.telefone,
        email: req.body.email,
        telemedicina: req.body.telemedicina ?? false,
        especialidade: req.body.especialidade
      }
    });

    return res.json({ profissional: atualizado });
  } catch (err) {
    console.error('Erro ao atualizar profissional:', err);
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
        id_clinica,
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
        agenda: true
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

  if (tipo !== 'ADMIN') {
    return res.status(403).json({ error: 'Apenas administradores podem inativar profissionais.' });
  }

  try {
    const profissional = await prisma.profissionalDaSaude.findFirst({
      where: {
        id_profissional_saude: Number(id),
        id_clinica,
        ativo: true
      }
    });

    if (!profissional) {
      return res.status(404).json({ error: 'Profissional não encontrado ou já inativo.' });
    }

    await prisma.profissionalDaSaude.update({
      where: { id_profissional_saude: Number(id) },
      data: { ativo: false }
    });

    return res.status(204).send();
  } catch (err) {
    console.error('Erro ao inativar profissional:', err);
    return res.status(500).json({ error: 'Erro ao inativar profissional.' });
  }
}
};

module.exports = { ProfissionaisController };
