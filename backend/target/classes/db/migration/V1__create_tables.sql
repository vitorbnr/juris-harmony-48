-- ============================================================================
-- V1__create_tables.sql
-- Viana Advocacia — Schema inicial
-- ============================================================================

-- ── Unidades ────────────────────────────────────────────────────────────────
CREATE TABLE unidades (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        VARCHAR(100) NOT NULL,
    cidade      VARCHAR(100) NOT NULL,
    estado      VARCHAR(2)   NOT NULL
);

-- ── Usuários ────────────────────────────────────────────────────────────────
CREATE TABLE usuarios (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          VARCHAR(150) NOT NULL,
    email         VARCHAR(200) NOT NULL UNIQUE,
    senha_hash    TEXT         NOT NULL,
    cargo         VARCHAR(100),
    oab           VARCHAR(20),
    papel         VARCHAR(20)  NOT NULL CHECK (papel IN ('ADMINISTRADOR','ADVOGADO','SECRETARIA')),
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
    unidade_id    UUID         NOT NULL REFERENCES unidades(id),
    criado_em     TIMESTAMP    NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_unidade ON usuarios(unidade_id);

-- ── Clientes ────────────────────────────────────────────────────────────────
CREATE TABLE clientes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            VARCHAR(200)  NOT NULL,
    tipo            VARCHAR(20)   NOT NULL CHECK (tipo IN ('PESSOA_FISICA','PESSOA_JURIDICA')),
    cpf_cnpj        VARCHAR(20)   NOT NULL UNIQUE,
    email           VARCHAR(200),
    telefone        VARCHAR(20),
    cidade          VARCHAR(100),
    estado          VARCHAR(2),
    data_cadastro   DATE          NOT NULL DEFAULT CURRENT_DATE,
    advogado_id     UUID          REFERENCES usuarios(id),
    unidade_id      UUID          NOT NULL REFERENCES unidades(id),
    ativo           BOOLEAN       NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMP     NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX idx_clientes_cpf_cnpj ON clientes(cpf_cnpj);
CREATE INDEX idx_clientes_unidade ON clientes(unidade_id);

-- ── Processos ───────────────────────────────────────────────────────────────
CREATE TABLE processos (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero               VARCHAR(30)    NOT NULL UNIQUE,
    cliente_id           UUID           NOT NULL REFERENCES clientes(id),
    tipo                 VARCHAR(20)    NOT NULL,
    vara                 VARCHAR(100),
    tribunal             VARCHAR(50),
    advogado_id          UUID           NOT NULL REFERENCES usuarios(id),
    status               VARCHAR(20)    NOT NULL CHECK (status IN ('EM_ANDAMENTO','AGUARDANDO','URGENTE','CONCLUIDO','SUSPENSO','ARQUIVADO')),
    data_distribuicao    DATE,
    ultima_movimentacao  DATE,
    proximo_prazo        DATE,
    valor_causa          NUMERIC(15,2),
    descricao            TEXT,
    unidade_id           UUID           NOT NULL REFERENCES unidades(id),
    criado_em            TIMESTAMP      NOT NULL DEFAULT NOW(),
    atualizado_em        TIMESTAMP      DEFAULT NOW()
);

CREATE INDEX idx_processos_numero ON processos(numero);
CREATE INDEX idx_processos_cliente ON processos(cliente_id);
CREATE INDEX idx_processos_advogado ON processos(advogado_id);
CREATE INDEX idx_processos_status ON processos(status);
CREATE INDEX idx_processos_unidade ON processos(unidade_id);

-- ── Movimentações ───────────────────────────────────────────────────────────
CREATE TABLE movimentacoes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processo_id  UUID        NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
    data         DATE        NOT NULL,
    descricao    TEXT        NOT NULL,
    tipo         VARCHAR(20) NOT NULL
);

CREATE INDEX idx_movimentacoes_processo ON movimentacoes(processo_id);

-- ── Prazos ──────────────────────────────────────────────────────────────────
CREATE TABLE prazos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo       VARCHAR(200) NOT NULL,
    processo_id  UUID         REFERENCES processos(id),
    data         DATE         NOT NULL,
    hora         TIME,
    tipo         VARCHAR(20)  NOT NULL,
    prioridade   VARCHAR(10)  NOT NULL CHECK (prioridade IN ('ALTA','MEDIA','BAIXA')),
    concluido    BOOLEAN      NOT NULL DEFAULT FALSE,
    advogado_id  UUID         REFERENCES usuarios(id),
    descricao    TEXT,
    unidade_id   UUID         REFERENCES unidades(id),
    criado_em    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prazos_advogado ON prazos(advogado_id);
CREATE INDEX idx_prazos_data ON prazos(data);
CREATE INDEX idx_prazos_unidade ON prazos(unidade_id);

-- ── Pastas ──────────────────────────────────────────────────────────────────
CREATE TABLE pastas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        VARCHAR(200) NOT NULL,
    cliente_id  UUID         REFERENCES clientes(id),
    processo_id UUID         REFERENCES processos(id),
    parent_id   UUID         REFERENCES pastas(id)
);

-- ── Documentos ──────────────────────────────────────────────────────────────
CREATE TABLE documentos (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome           VARCHAR(300) NOT NULL,
    tipo           VARCHAR(20)  NOT NULL,
    categoria      VARCHAR(20)  NOT NULL,
    tamanho_bytes  BIGINT       NOT NULL,
    storage_key    VARCHAR(500) NOT NULL,
    cliente_id     UUID         REFERENCES clientes(id),
    processo_id    UUID         REFERENCES processos(id),
    pasta_id       UUID         REFERENCES pastas(id),
    data_upload    TIMESTAMP    NOT NULL DEFAULT NOW(),
    uploaded_por   UUID         NOT NULL REFERENCES usuarios(id)
);

CREATE INDEX idx_documentos_cliente ON documentos(cliente_id);
CREATE INDEX idx_documentos_processo ON documentos(processo_id);
CREATE INDEX idx_documentos_pasta ON documentos(pasta_id);

-- ── Notificações ────────────────────────────────────────────────────────────
CREATE TABLE notificacoes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID         NOT NULL REFERENCES usuarios(id),
    titulo      VARCHAR(200) NOT NULL,
    descricao   TEXT         NOT NULL,
    tipo        VARCHAR(20)  NOT NULL,
    lida        BOOLEAN      NOT NULL DEFAULT FALSE,
    criada_em   TIMESTAMP    NOT NULL DEFAULT NOW(),
    link        VARCHAR(50)
);

CREATE INDEX idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX idx_notificacoes_lida ON notificacoes(usuario_id, lida);

-- ── Logs de Auditoria ───────────────────────────────────────────────────────
CREATE TABLE logs_auditoria (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID         NOT NULL REFERENCES usuarios(id),
    acao        VARCHAR(20)  NOT NULL,
    modulo      VARCHAR(20)  NOT NULL,
    descricao   TEXT         NOT NULL,
    data_hora   TIMESTAMP    NOT NULL DEFAULT NOW(),
    ip          VARCHAR(45)
);

CREATE INDEX idx_logs_usuario ON logs_auditoria(usuario_id);
CREATE INDEX idx_logs_data ON logs_auditoria(data_hora);

-- ── Dados Iniciais (seed) ───────────────────────────────────────────────────

-- Unidades
INSERT INTO unidades (id, nome, cidade, estado) VALUES
    ('a1b2c3d4-0001-0001-0001-000000000001', 'Carinhanha', 'Carinhanha', 'BA'),
    ('a1b2c3d4-0001-0001-0001-000000000002', 'Cocos',      'Cocos',      'BA');

-- Usuário Admin (senha: admin123 — BCrypt hash)
INSERT INTO usuarios (id, nome, email, senha_hash, cargo, oab, papel, ativo, unidade_id) VALUES
    ('b2c3d4e5-0002-0002-0002-000000000001',
     'QA Tester',
     'admin@gmail.com',
     '$2a$12$LJ3m4ys9VZ3bOW3GBKnGJeJd2QY6r.5sYf8rQkKZn1V5A0X5LvITe',
     'Advogado Sênior',
     'BA 23.825',
     'ADMINISTRADOR',
     TRUE,
     'a1b2c3d4-0001-0001-0001-000000000001');
