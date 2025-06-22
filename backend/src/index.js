const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); 

const authRoutes = require('./routes/auth.routes');
const { ConsultasRoutes } = require('./routes/consultas.routes');
const { ConveniosRoutes } = require('./routes/convenios.routes');
const { PacientesRoutes } = require('./routes/pacientes.routes');
const { ProcedimentosRoutes } = require('./routes/procedimentos.routes'); 
const { ProfissionaisRoutes } = require('./routes/profissionais.routes');
const { RelatoriosRoutes } = require('./routes/relatorios.routes');
const { UsuarioRoutes } = require('./routes/usuario.routes');
const whatsappGatewayRoutes = require('./routes/whatsappGateway.routes');
const aiGatewayRoutes = require('./routes/aiGateway.routes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rotas existentes
app.use('/api/auth', authRoutes);
app.use('/api/consultas', ConsultasRoutes);
app.use('/api/convenios', ConveniosRoutes);
app.use('/api/pacientes', PacientesRoutes);
app.use('/api/procedimentos', ProcedimentosRoutes);
app.use('/api/profissionais', ProfissionaisRoutes);
app.use('/api/relatorios', RelatoriosRoutes);
app.use('/api/usuarios', UsuarioRoutes); 
app.use('/', whatsappGatewayRoutes);
app.use('/api', aiGatewayRoutes);

app.get('/', (req, res) => {
    res.send('Backend Agente IA está rodando na porta ' + PORT);
});

app.listen(PORT, () => {
    console.log(`Backend Agente IA rodando em http://localhost:${PORT}`);
});