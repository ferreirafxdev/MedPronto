# Multi-stage build para o Frontend (React + Vite)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Variáveis de ambiente durante o build
ARG VITE_API_URL
ARG VITE_LIVEKIT_URL
ARG VITE_TURN_SERVER
ARG VITE_TURN_USERNAME
ARG VITE_TURN_PASSWORD
ARG VITE_VIDEOSDK_TOKEN

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_LIVEKIT_URL=$VITE_LIVEKIT_URL
ENV VITE_TURN_SERVER=$VITE_TURN_SERVER
ENV VITE_TURN_USERNAME=$VITE_TURN_USERNAME
ENV VITE_TURN_PASSWORD=$VITE_TURN_PASSWORD
ENV VITE_VIDEOSDK_TOKEN=$VITE_VIDEOSDK_TOKEN


RUN npm run build

# Servidor estático com Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
