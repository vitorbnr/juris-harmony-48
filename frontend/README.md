# Viana Advocacia - Sistema de Gestão Jurídica

Um sistema de gestão web full-stack desenvolvido para escritórios de advocacia, contemplando gestão de processos, controle de prazos processuais e audiências, gestão de clientes, notificações em tempo real e administração de usuários com controle de acessos (Administrador, Advogado, Secretaria).

## 🚀 Tecnologias

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend:** Java 21, Spring Boot 3, Spring Security (JWT), Spring Data JPA.
- **Banco de Dados:** PostgreSQL (gerenciado via Flyway migrations).
- **Armazenamento:** Cloudflare R2 (Compatível com S3) para armazenamento de documentos/petições.

## 🏗️ Estrutura do Projeto

O repositório é um monorepo que contém o frontend e o backend:

- `/src`: Código-fonte do frontend (React)
  - `components/views`: Telas principais do sistema.
  - `services`: Camada de API (Axios).
  - `context`: Contextos globais (Auth, Theme).
- `/backend`: Código-fonte do backend (Spring Boot)
  - `src/main/java/com/viana/model`: Entidades JPA.
  - `src/main/java/com/viana/controller`: Endpoints REST.
  - `src/main/resources/db/migration`: Migrations do Flyway.
- `/deploy`: Configurações do Docker-compose para produção.
- `/docs`: Manuais e documentação de segurança.

## ⚙️ Como executar (Desenvolvimento)

### Pré-requisitos
- Node.js (v18+) e NPM
- Java 21+ e Maven
- PostgreSQL rodando (ex: via Docker)

### 1. Banco de Dados Local
```bash
docker-compose up -d postgres
```

### 2. Backend
No diretório `backend`, use o perfil `dev`:
```bash
cd backend
mvn spring-boot:run "-Dspring-boot.run.profiles=dev"
```

### 3. Frontend
Na raiz do projeto:
```bash
npm install
npm run dev
```

O sistema estará disponível em `http://localhost:8080` (A porta padrão pode ser 5173 dependendo do Vite, verifique o terminal). O default da API é `http://localhost:8081/api`.

Acesse no primeiro boot com as credenciais iniciais:
- **E-mail:** `wallysson@vianaadv.com`
- **Senha:** `admin123`

## 🛡️ Produção & Segurança

Para orientações sobre implantação em VPS e as políticas de backup (PostgreSQL + R2), leia rigorosamente o guia [SEGURANCA.md](./docs/SEGURANCA.md).