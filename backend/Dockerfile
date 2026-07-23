# Etapa de build
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependência
COPY package.json package-lock.json ./

# Instala as dependências (incluindo dev para build)
RUN npm install

# Copia o restante do código
COPY . .

# Gera o client do Prisma
RUN npx prisma generate

# Faz o build do TypeScript
RUN npm run build

# Etapa de produção
FROM node:20-alpine

WORKDIR /app

# Copia dependências de produção apenas
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copia os arquivos buildados e o prisma gerado
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Comando para rodar as migrações (se aplicável) e iniciar
CMD ["npm", "start"]
