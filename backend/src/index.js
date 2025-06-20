const express = require('express');
const cors = require('cors');
const { UsuarioRoutes } = require('./routes/usuario.routes');
const { ProfissionaisRoutes } = require('./routes/profissionais.routes');
const { PacientesRoutes } = require('./routes/pacientes.routes');
const { ProcedimentosRoutes } = require('./routes/procedimentos.routes');
const { ConsultasRoutes } = require('./routes/consultas.routes');
const { RelatoriosRoutes } = require('./routes/relatorios.routes');
const { ConveniosRoutes } = require('./routes/convenios.routes');
const authRoutes = require('./routes/auth.routes');


const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/usuario', UsuarioRoutes);
app.use('/profissionais', ProfissionaisRoutes);
app.use('/pacientes', PacientesRoutes);
app.use('/procedimentos', ProcedimentosRoutes);
app.use('/consultas', ConsultasRoutes);
app.use('/relatorios', RelatoriosRoutes);
app.use('/convenios', ConveniosRoutes);


app.listen(4000, () => {
  console.log('🚀 Servidor rodando em http://localhost:4000');
});
