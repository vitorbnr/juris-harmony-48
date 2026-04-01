-- V2: Remove coluna ip dos logs de auditoria (campo não utilizado)
ALTER TABLE logs_auditoria DROP COLUMN IF EXISTS ip;
