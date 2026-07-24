# MedPronto Online - Documentação do SaaS (Telemedicina)

Este documento detalha o funcionamento, arquitetura e instruções de uso do sistema completo para o SaaS "Pronto Socorro Online".

## Arquitetura do Sistema

O sistema é dividido em duas partes principais:

1. **Frontend (Dashboard e Interfaces Visuais)**:
   - Construído com React.js + Vite.
   - Design moderno (Glassmorphism, Dark Mode, animações estéticas).
   - Gerenciamento de estado global com `Zustand`.
   - Navegação e Rotas via `react-router-dom`.
   - WebSockets integrados para comunicação em tempo real usando `socket.io-client`.
   - Sistema de vídeo peer-to-peer preparado na UI.

2. **Backend (APIs, Redes e Fila)**:
   - Construído com Node.js + Express + TypeScript.
   - Fila em tempo real gerenciada pelo Redis (Upstash) sob as rotas de API `/api/enqueue` e `/api/take-patient`.
   - Geração de PDF dinâmica no encerramento da consulta utilizando o `pdfkit`.
   - Comunicação real-time via `Socket.io` garantindo que o painel do médico e do paciente sincronizem no momento do atendimento.
   - Upload de Prontuários (PDF) diretamente para o Supabase Storage via S3 API ou Supabase SDK.

## Estrutura de Diretórios

- `/frontend`: Contém o código client-side (Frontend).
  - `/src/pages/Admin`: Dashboard administrativo, finanças e cadastro médico.
  - `/src/pages/Patient`: Fluxo do paciente, desde cadastro na fila (queixa principal) até sala de vídeo e histórico.
  - `/src/pages/Doctor`: Fluxo do médico, desde login, assumir fila até tela de prontuário com abas (Evolução, Exames, Receita, Chat e Vídeo).
  - `/src/store`: Contexto global.

- `/backend`: Contém o código server-side (Backend).
  - `index.ts`: Arquivo central contendo a API REST, manipulação Redis, geração de PDF, integração S3 no Supabase e Socket.io.

## Fluxo de Fila (Redis e UI)

1. Paciente acessa a tela `/patient/login`, informa `Nome, CPF, Idade, E-mail e Queixa`.
2. Ao "Entrar na fila", o frontend chama a Rota `/api/enqueue`.
3. O servidor enfileira o paciente em uma lista do Redis (`rpush('patient_queue', ...)`).
4. O servidor envia via WebSockets um evento global informando atualização de fila (`queue_updated`).
5. O Médico no Painel visualiza a lista gerada dinamicamente pelo Redis (`lrange`).
6. O Médico seleciona "Chamar Próximo da Fila" (`/api/take-patient`). O redis retira do topo (`lpop`) e registra o paciente como `in-consultation`.
7. O Paciente e o Médico entram na mesma "Sala" (Socket Room).
8. Na sala (`ConsultationRoom`), o Médico atende, evolui o caso preenchendo as abas.
9. Ao concluir, aperta "Encerrar". O Backend recebe os dados, monta um **PDF (Prontuário Médico)** e envia usando o EndPoint do Supabase Storage.
10. O histórico e link PDF ficam disponíveis no Painel Administrativo.

## Como Iniciar o Projeto (Como Desenvolvedor)

Abra dois terminais (PowerShell/CMD).

**Terminal 1 (Backend - Fila, Socket, PDF, Supabase):**
```bash
cd backend
npm install
npx ts-node-dev src/index.ts
```
*(O servidor Backend rodará na porta 3001 e vai se conectar auto no seu Redis e Supabase).*

**Terminal 2 (Frontend - Interface Visual):**
```bash
cd frontend
npm install
npm run dev
```
*(A aplicação frontend abrirá na URL: http://localhost:5173).*

## Como Iniciar em Produção (Deploy 100% Self-Hosted na VPS)

Todo o ecossistema roda dentro de contêineres Docker isolados e otimizados:

1. Clone o repositório na sua VPS (Ubuntu/Debian):
```bash
git clone <url-do-repositorio>
cd Saas
```

2. Crie o arquivo `.env` com base no exemplo:
```bash
cp .env.production.example .env
nano .env
```
> 💡 **Não tem um domínio pago? Sem problemas!**
> Você pode usar o serviço **gratuito e automático** `sslip.io`:
> Se o IP da sua VPS for `191.252.100.50`, defina no seu `.env`:
> - `DOMAIN_NAME=191.252.100.50.sslip.io`
> - `VITE_API_URL=https://191.252.100.50.sslip.io`
> - `CORS_ORIGIN=https://191.252.100.50.sslip.io`
> 
> *Isso gera um domínio válido apontando para seu IP e permite que o Caddy emita um certificado **HTTPS/SSL 100% Gratuito**, garantindo que as permissões de Câmera e Microfone do WebRTC funcionem no navegador sem nenhum bloqueio de segurança!*


3. Suba todos os serviços em segundo plano:
```bash
docker compose up -d --build
```

4. Execute as migrações do banco de dados no contêiner do Backend:
```bash
docker compose exec backend npx prisma db push
```

## Arquitetura 100% Self-Hosted (Sem custos com SaaS externos)
- **Banco de Dados**: PostgreSQL 15 rodando em contêiner Docker com volume persistente para prontuários, usuários e atestados.
- **Fila & WebSocket**: Redis 7 local gerenciando a fila do Pronto Socorro (BullMQ) e troca de mensagens.
- **Prontuários & PDFs**: Salvos diretamente no volume persistente Docker (`/app/uploads`), servidos com segurança via API Node.js.
- **WebRTC Vídeo**: Servidor Coturn (STUN/TURN) nativo integrado para passagem de vídeo P2P com baixíssima latência e custo zero.

