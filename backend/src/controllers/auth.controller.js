const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');



const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'agenteia_secret';

const AuthController = {
  register: async (req, res) => {
    const { nome_clinica, usuario } = req.body;
    const { nome, email, senha, tipo } = usuario;

    try {
      const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
      if (usuarioExistente) {
        return res.status(400).json({ error: 'E-mail já cadastrado.' });
      }

      const clinica = await prisma.clinica.create({
        data: {
          nome_clinica,
          telefone: '',
          email,
          cnpj: '',
          razao_social: '',
          cep: '',
          logradouro: '',
          numero: '',
          bairro: '',
          cidade: '',
          uf: '',
          codigo_ibge: ''
        }
      });

      const hash = await bcrypt.hash(senha, 10);

      const novoUsuario = await prisma.usuario.create({
        data: {
          nome,
          email,
          senha: hash,
          tipo,
          id_clinica: clinica.id_clinica
        }
      });

      const token = jwt.sign(
        { id: novoUsuario.id_usuario, tipo: novoUsuario.tipo, id_clinica: novoUsuario.id_clinica },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        usuario: {
          id: novoUsuario.id_usuario,
          nome,
          email,
          tipo,
          id_clinica: novoUsuario.id_clinica
        },
        token
      });
    } catch (err) {
      console.error('❌ Erro no cadastro:', err);
      return res.status(500).json({ error: 'Erro ao registrar usuário.' });
    }
  },

  login: async (req, res) => {
    const { email, senha } = req.body;

    try {
      const usuario = await prisma.usuario.findUnique({ where: { email } });
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Senha inválida.' });
      }

      const token = jwt.sign(
        { id: usuario.id_usuario, tipo: usuario.tipo, id_clinica: usuario.id_clinica },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        usuario: {
          id: usuario.id_usuario,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo
        },
        token
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao autenticar usuário.' });
    }
  },

  primeiroAcesso: async (req, res) => {
    const { clinica, usuario, profissional } = req.body;

    try {
      const usuarioExistente = await prisma.usuario.findUnique({
        where: { email: usuario.email }
      });

      if (usuarioExistente) {
        return res.status(400).json({ error: 'E-mail já cadastrado.' });
      }

      const novaClinica = await prisma.clinica.create({
        data: {
          nome_clinica: clinica.nome_clinica,
          telefone: clinica.telefone || '',
          email: usuario.email,
          cnpj: clinica.cnpj || '',
          razao_social: clinica.razao_social || '',
          cep: clinica.cep || '',
          logradouro: clinica.logradouro || '',
          numero: clinica.numero || '',
          complemento: clinica.complemento || '',
          bairro: clinica.bairro || '',
          cidade: clinica.cidade || '',
          uf: clinica.uf || '',
          codigo_ibge: clinica.codigo_ibge || ''
        }
      });

      const hash = await bcrypt.hash(usuario.senha, 10);
      const novoUsuario = await prisma.usuario.create({
        data: {
          nome: usuario.nome,
          email: usuario.email,
          senha: hash,
          tipo: usuario.tipo,
          id_clinica: novaClinica.id_clinica
        }
      });

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
          id_clinica: novaClinica.id_clinica,
          usuario: { connect: { id_usuario: novoUsuario.id_usuario } }
        }
      });

      await prisma.agenda.create({
        data: {
          data: new Date(),
          hora_inicio: new Date(),
          hora_fim: new Date(),
          status: 'DISPONIVEL',
          profissional_id: novoProfissional.id_profissional_saude,
          id_clinica: novaClinica.id_clinica
        }
      });

      const token = jwt.sign(
        {
          id: novoUsuario.id_usuario,
          tipo: novoUsuario.tipo,
          id_clinica: novoUsuario.id_clinica
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        usuario: {
          id: novoUsuario.id_usuario,
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          tipo: novoUsuario.tipo,
          id_clinica: novoUsuario.id_clinica
        },
        profissional: {
          id: novoProfissional.id_profissional_saude,
          nome_profissional: novoProfissional.nome_profissional
        },
        token
      });
    } catch (err) {
      console.error('❌ Erro no primeiro acesso:', err);
      return res.status(500).json({ error: 'Erro ao realizar o primeiro acesso.' });
    }
  }
};

module.exports = AuthController;