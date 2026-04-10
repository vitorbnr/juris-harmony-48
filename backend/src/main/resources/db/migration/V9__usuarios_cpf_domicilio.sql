ALTER TABLE usuarios
    ADD COLUMN cpf VARCHAR(11),
    ADD COLUMN habilitado_domicilio BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX uq_usuarios_cpf ON usuarios(cpf);
