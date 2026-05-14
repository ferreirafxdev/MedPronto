import { Request, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { config } from '../config';

/**
 * Gera um token de acesso para o LiveKit
 * O roomId será o nome da sala de consulta.
 */
export const getLiveKitToken = async (req: Request, res: Response) => {
  try {
    const { room, username } = req.query;

    if (!room || !username) {
      return res.status(400).json({ error: 'Parâmetros "room" e "username" são obrigatórios.' });
    }

    // Configurações do LiveKit vindas do ambiente
    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';

    // Cria o token com as permissões da sala
    const at = new AccessToken(apiKey, apiSecret, {
      identity: username as string,
    });

    at.addGrant({ 
      roomJoin: true, 
      room: room as string, 
      canPublish: true, 
      canSubscribe: true 
    });

    res.json({ token: await at.toJwt() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
