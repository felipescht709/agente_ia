-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('ADMIN', 'RECEPCIONISTA', 'PROFISSIONAL', 'SISTEMA_BOT');

-- CreateEnum
CREATE TYPE "StatusConsultaInterno" AS ENUM ('AGENDADA', 'CONFIRMADA', 'CANCELADA', 'REALIZADA', 'NAO_COMPARECEU', 'PENDENTE_CONFIRMACAO', 'REAGENDADA', 'FINALIZADA_SEM_ATENDIMENTO');

-- CreateEnum
CREATE TYPE "OrigemAgendamento" AS ENUM ('MANUAL', 'WHATSAPP_BOT', 'WEB_PORTAL', 'APP_MOBILE');

-- CreateEnum
CREATE TYPE "TipoProcedimentoInterno" AS ENUM ('CONSULTA', 'EXAME', 'TERAPIA', 'VACINA', 'RETORNO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusAgenda" AS ENUM ('DISPONIVEL', 'INDISPONIVEL', 'AGENDADO');

-- CreateEnum
CREATE TYPE "TipoBloqueioAgenda" AS ENUM ('FERIAS', 'FERIADO', 'ALMOCO', 'EVENTO', 'BLOQUEIO_PESSOAL', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoInteracaoRobo" AS ENUM ('DUVIDA_GERAL', 'SOLICITACAO_AGENDAMENTO_INICIAL', 'CONFIRMACAO_AGENDAMENTO_PACIENTE', 'CANCELAMENTO_AGENDAMENTO_PACIENTE', 'REAGENDAMENTO_SOLICITADO_PACIENTE', 'PESQUISA_SATISFACAO_ENVIADA', 'PESQUISA_SATISFACAO_RESPONDIDA', 'NOTIFICACAO_LEMBRETE', 'NOTIFICACAO_ALTERACAO', 'FALLBACK_PARA_HUMANO', 'INFO_SOBRE_PROCEDIMENTO', 'INFO_SOBRE_CONVENIO', 'ERRO_PROCESSAMENTO');

-- CreateEnum
CREATE TYPE "TipoCredencialServico" AS ENUM ('WHATSAPP_BUSINESS_API', 'ZAPI_API', 'OPENAI_API', 'OLLAMA_API', 'AMPLIMED_API', 'ICLINIC_API', 'FEEGOW_API', 'CRM_INTEGRATION_API', 'EHR_INTEGRATION_API', 'GATEWAY_SMS', 'GOOGLE_CALENDAR_API');

-- CreateTable
CREATE TABLE "Clinica" (
    "id_clinica" SERIAL NOT NULL,
    "nome_clinica" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "cnpj" TEXT,
    "razao_social" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "codigo_ibge" TEXT,
    "plano" TEXT NOT NULL DEFAULT 'BASICO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinica_pkey" PRIMARY KEY ("id_clinica")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "tipo" "TipoUsuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "id_clinica" INTEGER NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id_paciente" SERIAL NOT NULL,
    "cpf" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "data_nascimento" DATE NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "codigo_ibge" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "senha" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "id_clinica" INTEGER NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id_paciente")
);

-- CreateTable
CREATE TABLE "ProfissionalDaSaude" (
    "id_profissional_saude" SERIAL NOT NULL,
    "nome_profissional" TEXT NOT NULL,
    "imagem_profissional" TEXT,
    "data_nascimento" DATE NOT NULL,
    "cpf" TEXT NOT NULL,
    "conselho" TEXT,
    "numero_conselho" TEXT,
    "uf_conselho" TEXT,
    "rqe" TEXT,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telemedicina" BOOLEAN NOT NULL DEFAULT false,
    "especialidade" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "id_clinica" INTEGER NOT NULL,
    "usuario_id" INTEGER,

    CONSTRAINT "ProfissionalDaSaude_pkey" PRIMARY KEY ("id_profissional_saude")
);

-- CreateTable
CREATE TABLE "Consulta" (
    "id_consulta" SERIAL NOT NULL,
    "data_hora_inicio" TIMESTAMP(3) NOT NULL,
    "data_hora_fim" TIMESTAMP(3),
    "valor" DECIMAL(10,2),
    "telemedicina" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusConsultaInterno" NOT NULL,
    "observacoes" TEXT,
    "origem_agendamento" "OrigemAgendamento" NOT NULL DEFAULT 'MANUAL',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "profissional_id" INTEGER NOT NULL,
    "id_clinica" INTEGER NOT NULL,
    "id_convenio" INTEGER,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id_consulta")
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id_avaliacao" SERIAL NOT NULL,
    "consulta_id" INTEGER NOT NULL,
    "data_avaliacao" TIMESTAMP(3) NOT NULL,
    "nota_satisfacao" INTEGER,
    "recomendaria_clinica" BOOLEAN,
    "comentario" TEXT,
    "parecer_profissional" TEXT,
    "id_clinica" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id_avaliacao")
);

-- CreateTable
CREATE TABLE "Procedimento" (
    "id_procedimento" SERIAL NOT NULL,
    "nome_procedimento" TEXT NOT NULL,
    "tipo" "TipoProcedimentoInterno" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "duracao_minutos" INTEGER NOT NULL,
    "telemedicina" BOOLEAN NOT NULL DEFAULT false,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "id_clinica" INTEGER NOT NULL,

    CONSTRAINT "Procedimento_pkey" PRIMARY KEY ("id_procedimento")
);

-- CreateTable
CREATE TABLE "ConsultaProcedimento" (
    "consulta_id" INTEGER NOT NULL,
    "procedimento_id" INTEGER NOT NULL,

    CONSTRAINT "ConsultaProcedimento_pkey" PRIMARY KEY ("consulta_id","procedimento_id")
);

-- CreateTable
CREATE TABLE "Agenda" (
    "id_agenda" SERIAL NOT NULL,
    "data" DATE NOT NULL,
    "hora_inicio" TIME(0) NOT NULL,
    "hora_fim" TIME(0) NOT NULL,
    "status" "StatusAgenda" NOT NULL,
    "tipo_bloqueio" "TipoBloqueioAgenda",
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "profissional_id" INTEGER NOT NULL,
    "id_clinica" INTEGER NOT NULL,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id_agenda")
);

-- CreateTable
CREATE TABLE "ControleOperacional" (
    "id_controle" SERIAL NOT NULL,
    "id_clinica" INTEGER NOT NULL,
    "data_referencia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "pacientes_agendados" INTEGER NOT NULL DEFAULT 0,
    "pacientes_nao_agendados" INTEGER NOT NULL DEFAULT 0,
    "pacientes_faltantes" INTEGER NOT NULL DEFAULT 0,
    "nps" DOUBLE PRECISION,
    "total_consultas" INTEGER NOT NULL DEFAULT 0,
    "total_procedimentos" INTEGER NOT NULL DEFAULT 0,
    "valor_arrecadado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "horas_robo_trabalhadas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "economia_estimada" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ControleOperacional_pkey" PRIMARY KEY ("id_controle")
);

-- CreateTable
CREATE TABLE "InteracaoRobo" (
    "id_interacao" SERIAL NOT NULL,
    "id_clinica" INTEGER NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "tipo" "TipoInteracaoRobo" NOT NULL,
    "data_interacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mensagem_recebida" TEXT,
    "resposta_enviada" TEXT,
    "intencao_detectada" TEXT,
    "status_processamento" TEXT,
    "detalhes_erro" TEXT,
    "id_convenio" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InteracaoRobo_pkey" PRIMARY KEY ("id_interacao")
);

-- CreateTable
CREATE TABLE "Convenio" (
    "id_convenio" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "id_clinica" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Convenio_pkey" PRIMARY KEY ("id_convenio")
);

-- CreateTable
CREATE TABLE "CredenciaisCliente" (
    "id_credencial_cliente" SERIAL NOT NULL,
    "id_clinica" INTEGER NOT NULL,
    "tipo_servico" "TipoCredencialServico" NOT NULL,
    "chave_api" TEXT NOT NULL,
    "secret_key" TEXT,
    "phone_number_id" TEXT,
    "instance_url" TEXT,
    "webhook_token" TEXT,
    "configuracao_extra" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CredenciaisCliente_pkey" PRIMARY KEY ("id_credencial_cliente")
);

-- CreateTable
CREATE TABLE "MapeamentoStatusConsulta" (
    "id_mapeamento_status" SERIAL NOT NULL,
    "id_clinica" INTEGER NOT NULL,
    "sistema_externo" TEXT NOT NULL,
    "valor_externo" TEXT NOT NULL,
    "valor_interno" "StatusConsultaInterno" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapeamentoStatusConsulta_pkey" PRIMARY KEY ("id_mapeamento_status")
);

-- CreateTable
CREATE TABLE "MapeamentoTipoProcedimento" (
    "id_mapeamento_tipo" SERIAL NOT NULL,
    "id_clinica" INTEGER NOT NULL,
    "sistema_externo" TEXT NOT NULL,
    "valor_externo" TEXT NOT NULL,
    "valor_interno" "TipoProcedimentoInterno" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapeamentoTipoProcedimento_pkey" PRIMARY KEY ("id_mapeamento_tipo")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_cpf_key" ON "Paciente"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "ProfissionalDaSaude_cpf_key" ON "ProfissionalDaSaude"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "ProfissionalDaSaude_usuario_id_key" ON "ProfissionalDaSaude"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "Procedimento_id_clinica_nome_procedimento_key" ON "Procedimento"("id_clinica", "nome_procedimento");

-- CreateIndex
CREATE UNIQUE INDEX "CredenciaisCliente_id_clinica_tipo_servico_key" ON "CredenciaisCliente"("id_clinica", "tipo_servico");

-- CreateIndex
CREATE UNIQUE INDEX "MapeamentoStatusConsulta_id_clinica_sistema_externo_valor_e_key" ON "MapeamentoStatusConsulta"("id_clinica", "sistema_externo", "valor_externo");

-- CreateIndex
CREATE UNIQUE INDEX "MapeamentoTipoProcedimento_id_clinica_sistema_externo_valor_key" ON "MapeamentoTipoProcedimento"("id_clinica", "sistema_externo", "valor_externo");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id_clinica") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id_clinica") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfissionalDaSaude" ADD CONSTRAINT "ProfissionalDaSaude_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id_clinica") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfissionalDaSaude" ADD CONSTRAINT "ProfissionalDaSaude_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id_clinica") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id_paciente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "ProfissionalDaSaude"("id_profissional_saude") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_id_convenio_fkey" FOREIGN KEY ("id_convenio") REFERENCES "Convenio"("id_convenio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id_clinica") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "Consulta"("id_consulta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedimento" ADD CONSTRAINT "Procedimento_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id_clinica") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaProcedimento" ADD CONSTRAINT "ConsultaProcedimento_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "Consulta"("id_consulta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaProcedimento" ADD CONSTRAINT "ConsultaProcedimento_procedimento_id_fkey" FOREIGN KEY ("procedimento_id") REFERENCES "Procedimento"("id_procedimento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id_clinica") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "ProfissionalDaSaude"("id_profissional_saude") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleOperacional" ADD CONSTRAINT "ControleOperacional_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id_clinica") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteracaoRobo" ADD CONSTRAINT "InteracaoRobo_id_paciente_fkey" FOREIGN KEY ("id_paciente") REFERENCES "Paciente"("id_paciente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteracaoRobo" ADD CONSTRAINT "InteracaoRobo_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id_clinica") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteracaoRobo" ADD CONSTRAINT "InteracaoRobo_id_convenio_fkey" FOREIGN KEY ("id_convenio") REFERENCES "Convenio"("id_convenio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convenio" ADD CONSTRAINT "Convenio_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id_clinica") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredenciaisCliente" ADD CONSTRAINT "CredenciaisCliente_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id_clinica") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapeamentoStatusConsulta" ADD CONSTRAINT "MapeamentoStatusConsulta_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id_clinica") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapeamentoTipoProcedimento" ADD CONSTRAINT "MapeamentoTipoProcedimento_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id_clinica") ON DELETE RESTRICT ON UPDATE CASCADE;
