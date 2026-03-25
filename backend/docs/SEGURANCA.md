# Documentação de Segurança e Deploy (Produção)

Este documento detalha as práticas obrigatórias para manter o sistema Viana Advocacia seguro, estável e **sem risco de perda de dados** no ambiente de produção (Hostinger KVM1 ou superior).

---

## 🔒 1. Segurança do Banco de Dados (PostgreSQL)

O banco de dados é o coração do sistema. Ele roda conteinerizado, garantindo isolamento.

- **Volumes Nomeados:** O arquivo `docker-compose.prod.yml` usa um volume `pgdata`. Isso significa que mesmo se o container for apagado (`docker down`), **os dados não são perdidos**.
- **Senha Forte:** A variável `DB_PASSWORD` no `.env` deve ter pelo menos 20 caracteres gerados aleatoriamente.
- **Porta Oculta:** O PostgreSQL **NÃO** deve expor a porta 5432 para a internet pública, apenas a rede interna do Docker (`viana_network`).

### 🔄 Estratégia de Backup 3-2-1
Para evitar qualquer risco de perda, configure o seguinte script (`/opt/backups/backup-db.sh`) na VPS rodando diariamente no Cron (`0 2 * * *` - 2h da manhã):

```bash
#!/bin/bash
data=$(date +%Y-%m-%d)
# 1. Gera dump seguro
docker exec viana_postgres_prod pg_dump -U viana viana_db > /opt/backups/viana_$data.sql
# 2. Compacta
gzip /opt/backups/viana_$data.sql
# 3. Envia para o Cloudflare R2 (Offsite Backup) usano AWS CLI (aws-cli configurado com R2)
aws s3 cp /opt/backups/viana_$data.sql.gz s3://viana-backups/ --endpoint-url https://SUA-URL.r2.cloudflarestorage.com
```
*Ative também o backup semanal nativo da Hostinger (+R$16,99/mês) como última linha de defesa.*

---

## 🔑 2. Gestão de JWT (JSON Web Tokens)

- O `JWT_SECRET` do `.env` no backend de produção **deve** ser uma string aleatória de no mínimo 256 bits (ex: `openssl rand -base64 64`).
- **Política de Rotação:** O JWT Secret deve ser alterado caso algum administrador desconfie de vazamento. Isso fará o logout imediato de *todos* os usuários, forçando novo login.

---

## ☁️ 3. Cloudflare R2 (Documentos)

Os arquivos (petições, CNHs, comprovantes) dos clientes são armazenados no Cloudflare R2, protegendo a VPS de falta de espaço e garantindo redundância geográfica.

- **Bucket Privado:** O bucket `system-viana` **não** pode ter acesso público lido habilitado. O frontend fará o download via backend (o backend baixa do R2 e serve ao usuário via Spring Boot autorizado).
- **Sem Egress Fees:** O Cloudflare não cobra taxa de saída, o que mantém os custos em zero.

---

## 🌐 4. HTTPS / SSL Obrigatório (Nginx)

Nunca acesse o sistema HTTP puro. Configure o Nginx como Proxy Reverso com Certbot (Let's Encrypt).

Exemplo de bloco `server` (Nginx):
```nginx
server {
    server_name vianaadv.com.br;

    location / {
        proxy_pass http://localhost:8081; # Aponta para o container backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    listen 443 ssl;
    # Certificados gerados pelo Certbot ficam aqui...
}
```

---

## 📝 5. Logs de Auditoria

O sistema já possui a classe `LogAuditoriaService.java` que rastreia:
- Quem acessou? (Usuário / IP)
- O que fez? (Criação, Edição, Deleção)
- Qual registro? (Cliente ID, Processo ID)

Qualquer ação não-autorizada deve ser verificada consultando a aba **"Logs de Acesso"** em Configurações. Administradores devem verificar periodicamente por logins em horários estranhos (ex: 3h da manhã).
