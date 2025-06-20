const express = require('express');
const { ProfissionaisController } = require('../controllers/profissionais.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();
// Rotas profissionais da saúde
router.post('/', verificarToken, ProfissionaisController.criar);
router.get('/', verificarToken, ProfissionaisController.listar);
router.put('/:id', verificarToken, ProfissionaisController.atualizar);
router.get('/:id', verificarToken, ProfissionaisController.detalhar);
router.delete('/:id', verificarToken, ProfissionaisController.inativar);

//rotas pacientes

module.exports = { ProfissionaisRoutes: router };
