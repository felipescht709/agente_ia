const express = require('express');
const { ProcedimentosController } = require('../controllers/procedimentos.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', verificarToken, ProcedimentosController.criar);
router.get('/', verificarToken, ProcedimentosController.listar);
router.get('/:id', verificarToken, ProcedimentosController.detalhar);
router.put('/:id', verificarToken, ProcedimentosController.atualizar);
router.delete('/:id', verificarToken, ProcedimentosController.inativar);

module.exports = { ProcedimentosRoutes: router };
