ALTER TABLE clientes
    ALTER COLUMN cpf_cnpj DROP NOT NULL;

ALTER TABLE clientes
    ADD COLUMN rg VARCHAR(30),
    ADD COLUMN ctps VARCHAR(30),
    ADD COLUMN pis VARCHAR(20),
    ADD COLUMN titulo_eleitor_numero VARCHAR(20),
    ADD COLUMN titulo_eleitor_zona VARCHAR(10),
    ADD COLUMN titulo_eleitor_sessao VARCHAR(10),
    ADD COLUMN cnh_numero VARCHAR(20),
    ADD COLUMN cnh_categoria VARCHAR(5),
    ADD COLUMN cnh_vencimento DATE,
    ADD COLUMN passaporte_numero VARCHAR(30),
    ADD COLUMN certidao_reservista_numero VARCHAR(30),
    ADD COLUMN data_nascimento DATE,
    ADD COLUMN nome_pai VARCHAR(200),
    ADD COLUMN nome_mae VARCHAR(200),
    ADD COLUMN naturalidade VARCHAR(150),
    ADD COLUMN nacionalidade VARCHAR(100),
    ADD COLUMN estado_civil VARCHAR(50),
    ADD COLUMN profissao VARCHAR(100),
    ADD COLUMN empresa VARCHAR(150),
    ADD COLUMN atividade_economica VARCHAR(150),
    ADD COLUMN comentarios TEXT,
    ADD COLUMN banco_nome VARCHAR(100),
    ADD COLUMN banco_agencia VARCHAR(20),
    ADD COLUMN banco_conta VARCHAR(30),
    ADD COLUMN banco_tipo VARCHAR(20),
    ADD COLUMN chave_pix VARCHAR(100),
    ADD COLUMN is_falecido BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN detalhes_obito TEXT;

ALTER TABLE clientes
    ADD CONSTRAINT chk_clientes_banco_tipo
        CHECK (banco_tipo IS NULL OR banco_tipo IN ('CORRENTE', 'POUPANCA'));
