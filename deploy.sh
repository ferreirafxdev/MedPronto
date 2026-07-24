#!/usr/bin/env bash
# Script de Deploy e Inicialização Automática - MedPronto Telemedicina (VPS Docker)

set -e

echo "🚀 Iniciando Deploy em Produção do MedPronto Telemedicina..."

# 1. Verifica se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Erro: Docker não está instalado nesta VPS. Por favor, instale o Docker primeiro."
    exit 1
fi

# 2. Verifica se o arquivo .env existe, se não, cria a partir do exemplo
if [ ! -f .env ]; then
    echo "⚠️ Arquivo .env não encontrado. Criando .env a partir de .env.production.example..."
    cp .env.production.example .env
    echo "👉 Por favor, configure o arquivo .env com seu domínio, IP da VPS e senhas antes de executar novamente!"
    exit 0
fi

# 3. Subir e compilar todos os serviços Docker
echo "📦 Compilando e subindo a infraestrutura (Postgres, Redis, Coturn, Backend, Frontend, Caddy SSL)..."
docker compose up -d --build

# 4. Aplicar o schema do banco de dados no PostgreSQL
echo "🗄️ Aplicando schema e migrações no PostgreSQL..."
docker compose exec backend npx prisma db push

echo "=========================================================="
echo "✅ DEPLOY EM PRODUÇÃO FINALIZADO COM SUCESSO!"
echo "🌐 Acesse sua aplicação com HTTPS seguro em seu domínio."
echo "=========================================================="
