import { Request, Response } from 'express';
import { createDailyRoom, createDailyToken } from '../services/daily.service';
import { config } from '../config';

/**
 * Endpoint unificado para gerar a URL da sala e o Token de acesso no Daily.co
 * Substitui o fluxo antigo do LiveKit.
 */
export const getDailyRoomAndToken = async (req: Request, res: Response) => {
  try {
    const { room, username, isDoctor } = req.body;

    if (!room || !username) {
      return res.status(400).json({ error: 'Parâmetros "room" e "username" são obrigatórios.' });
    }

    // 1. Tenta criar a sala (se ela já existir, a API do Daily retorna erro 400 'room-exists')
    // Para simplificar, poderíamos sempre gerar um ID único, mas como o 'room' 
    // é baseado no 'consultationId', vamos ignorar o erro se a sala já existir e apenas pegar o token.
    let roomData: any = null;
    let roomName = `medpronto-${room}`;

    try {
      roomData = await createDailyRoom(room);
      roomName = roomData.name;
    } catch (e: any) {
      // Se já existe, usamos o roomName padrão, mas você poderia chamar GET /rooms/:id
      console.log('Sala pode já existir, seguindo para geração de token...');
    }

    // A URL padrão de salas do Daily.co criadas pela API é https://<seu-dominio>.daily.co/<nome-da-sala>
    // Precisamos pegar isso do env ou compor com a API key que está no workspace.
    const domain = config.dailyDomain; 
    const url = `https://${domain}.daily.co/${roomName}`;

    // 2. Gera o token seguro (Dono se isDoctor = true)
    const token = await createDailyToken(roomName, Boolean(isDoctor), username as string);

    res.json({ 
      url: url, // A URL real seria retornada na criação, mas compomos aqui pra caso já exista
      token,
      roomName
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
