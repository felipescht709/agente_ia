// src/routes/usuario.routes.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

// Rota protegida que retorna os dados do usuário logado
router.get('/me', verificarToken, async (req, res) => {
  console.log('✅ Token recebido:', req.usuario); // debug
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        id_clinica: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.json({ usuario });
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = { UsuarioRoutes: router };
