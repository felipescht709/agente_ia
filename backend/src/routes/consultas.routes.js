const express = require('express');
const { ConsultasController } = require('../controllers/consultas.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', verificarToken, ConsultasController.criar);
router.get('/', verificarToken, ConsultasController.listar);
router.get('/:id', verificarToken, ConsultasController.detalhar);
router.patch('/:id', verificarToken, ConsultasController.atualizar);
router.post('/:id/procedimentos', verificarToken, ConsultasController.associarProcedimentos);
router.get('/:id/procedimentos', verificarToken, ConsultasController.listarProcedimentos);
router.delete('/:id/procedimentos/:id_procedimento', verificarToken, ConsultasController.removerProcedimento);

module.exports = { ConsultasRoutes: router };
