const express = require('express');
const { ConveniosController } = require('../controllers/convenios.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', verificarToken, ConveniosController.cadastrar);
router.get('/', verificarToken, ConveniosController.listar);

module.exports = { ConveniosRoutes: router };
