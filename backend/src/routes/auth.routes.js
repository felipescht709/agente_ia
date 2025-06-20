const express = require('express');
const AuthController = require('../controllers/auth.controller');
const router = express.Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/primeiro-acesso', AuthController.primeiroAcesso);

module.exports = router;