const express = require('express');
const { RelatoriosController } = require('../controllers/relatorios.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/consultas', verificarToken, RelatoriosController.consultas);
router.get('/consultas/faltantes', verificarToken, RelatoriosController.consultasFaltantes);
// Conversão do robô: interagidos vs. agendados
router.get('/robo/conversao', verificarToken, RelatoriosController.conversaoRobo);
// Pacientes que interagiram com o robô mas não agendaram
router.get('/robo/sem-consulta', verificarToken, RelatoriosController.interagiramSemConsulta);
// Total de horas do robô
router.get('/robo/horas-trabalhadas', verificarToken, RelatoriosController.horasRobo);
// Economia estimada pelo robô
router.get('/robo/economia', verificarToken, RelatoriosController.economiaRobo);
// NPS / Pesquisa de satisfação
router.get('/nps', verificarToken, RelatoriosController.nps);
router.get('/procedimentos/total-executados', verificarToken, RelatoriosController.totalProcedimentosExecutados);
router.get('/consultas/valor-arrecadado', verificarToken, RelatoriosController.valorArrecadado);
router.get('/consultas/canceladas', verificarToken, RelatoriosController.consultasCanceladas);
router.get('/consultas/particulares', verificarToken, RelatoriosController.consultasParticulares);
router.get('/consultas/convenio', verificarToken, RelatoriosController.consultasConvenio);
router.get('/consultas/convenio', verificarToken, RelatoriosController.consultasConvenio);
router.get('/profissionais/top-atendimentos', verificarToken, RelatoriosController.profissionalTopAtendimentos);
router.get('/profissionais/top-valor', verificarToken, RelatoriosController.profissionalTopValor);
router.get('/procedimentos/top-volume', verificarToken, RelatoriosController.procedimentoTopVolume);
router.get('/procedimentos/top-valor', verificarToken, RelatoriosController.procedimentoTopValor);
router.get('/profissionais/media-horas-online', verificarToken, RelatoriosController.mediaHorasOnline);
router.get('/profissionais/media-horas-presencial', verificarToken, RelatoriosController.mediaHorasPresencial);
router.get('/consultas/presenciais', verificarToken, RelatoriosController.consultasPresenciais);
router.get('/consultas/online', verificarToken, RelatoriosController.consultasOnline);
router.get('/pacientes/top-gastos', verificarToken, RelatoriosController.pacienteTopGasto);



module.exports = { RelatoriosRoutes: router };
