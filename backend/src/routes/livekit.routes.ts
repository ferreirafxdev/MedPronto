import { Router, Request, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { authenticateToken } from '../middleware/auth.middleware';
import { config } from '../config';

const router = Router();

/**
 * Endpoint para geração de AccessToken JWT do LiveKit para salas de atendimento
 */
router.post('/token', authenticateToken, async (req: any, res: Response) => {
  try {
    const { roomName, participantName } = req.body;

    if (!roomName) {
      return res.status(400).json({ error: 'roomName é obrigatório.' });
    }

    const identity = req.user?.id || `user-${Math.random().toString(36).substring(7)}`;
    const name = participantName || req.user?.name || identity;

    const apiKey = config.livekit.apiKey;
    const apiSecret = config.livekit.apiSecret;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: 'Credenciais do LiveKit não configuradas no servidor.' });
    }

    // Instancia o gerador de tokens do LiveKit
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      ttl: '2h' // Validade do token: 2 horas
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const token = await at.toJwt();

    res.json({
      success: true,
      token,
      serverUrl: config.livekit.url,
      roomName,
      participantName: name
    });
  } catch (err: any) {
    console.error('Erro ao gerar token do LiveKit:', err);
    res.status(500).json({ error: 'Falha ao gerar token de acesso à sala de vídeo.' });
  }
});

export default router;
