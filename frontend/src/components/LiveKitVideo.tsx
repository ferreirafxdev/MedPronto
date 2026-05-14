import { useEffect, useState } from 'react';
import { 
  LiveKitRoom, 
  VideoConference, 
  RoomAudioRenderer,
  ControlBar,
  useTracks
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import apiClient from '../api/client';

interface Props {
  roomName: string;
  userName: string;
}

/**
 * Componente LiveKitVideo
 * Substitui o Jitsi para uma experiência WebRTC nativa e de alta performance.
 */
const LiveKitVideo = ({ roomName, userName }: Props) => {
  const [token, setToken] = useState<string | null>(null);
  
  // URL do servidor LiveKit (Substitua pela sua URL do Cloud ou Self-Hosted)
  const serverUrl = 'wss://medpronto-live-XXXX.livekit.cloud';

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data } = await apiClient.get(`/api/livekit/token?room=${roomName}&username=${userName}`);
        setToken(data.token);
      } catch (e) {
        console.error("Erro ao obter token do LiveKit", e);
      }
    };
    fetchToken();
  }, [roomName, userName]);

  if (!token) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
           <div className="animate-spin" style={{ marginBottom: '1rem' }}>⌛</div>
           <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Conectando ao servidor seguro...</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      connectOptions={{ autoSubscribe: true }}
      data-lk-theme="default"
      style={{ height: '100%', width: '100%' }}
    >
      {/* Interface customizada do LiveKit */}
      <VideoConference />
      
      {/* Renderizador de áudio necessário */}
      <RoomAudioRenderer />
      
      {/* Barra de controles opcional, pode ser customizada ou removida */}
      {/* <ControlBar variation="minimal" /> */}
    </LiveKitRoom>
  );
};

export default LiveKitVideo;
