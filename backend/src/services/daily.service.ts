import axios from 'axios';

const DAILY_API_KEY = process.env.DAILY_API_KEY || "2737dddf94a68f2315662645f4bcb35d913ca32cc6ec5d8f5585e49909c9cd8f";
const DAILY_API_URL = 'https://api.daily.co/v1/rooms';

export const createDailyRoom = async (consultationId: string) => {
  try {
    // A sala expira em 1 hora (3600 segundos) a partir de agora
    const expTime = Math.floor(Date.now() / 1000) + 3600;

    const response = await axios.post(
      DAILY_API_URL,
      {
        name: `medpronto-${consultationId}`,
        privacy: 'private', // IMPORTANTE: Define a sala como privada
        properties: {
          exp: expTime,
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Erro ao criar sala no Daily.co:', error?.response?.data || error.message);
    throw new Error('Falha ao instanciar sala de videoconferência.');
  }
};

// Se a sala é privada, precisamos gerar tokens de acesso para o médico e paciente
export const createDailyToken = async (roomName: string, isDoctor: boolean, userName: string) => {
  try {
    const response = await axios.post(
      'https://api.daily.co/v1/meeting-tokens',
      {
        properties: {
          room_name: roomName,
          is_owner: isDoctor, // O médico tem privilégios de dono (mutar paciente, etc)
          user_name: userName,
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.token;
  } catch (error: any) {
    console.error('Erro ao gerar token Daily.co:', error?.response?.data || error.message);
    throw new Error('Falha ao gerar credencial de acesso de vídeo.');
  }
};
