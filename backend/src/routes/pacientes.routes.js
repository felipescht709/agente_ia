const express = require('express');
const { PacientesController } = require('../controllers/pacientes.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', verificarToken, PacientesController.criar);
router.get('/', verificarToken, PacientesController.listar);
router.get('/:id', verificarToken, PacientesController.detalhar);
router.put('/:id', verificarToken, PacientesController.atualizar);
router.patch('/:id/inativar', verificarToken, PacientesController.inativar);
router.post('/buscar-ou-criar', PacientesController.buscarOuCriar); 

module.exports = { PacientesRoutes: router };
