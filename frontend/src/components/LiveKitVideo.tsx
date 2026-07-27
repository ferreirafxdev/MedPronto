import React, { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  ParticipantTile,
  GridLayout,
  DisconnectButton,
  MediaDeviceMenu,
  TrackRefContext
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import apiClient from '../api/client';
import { Loader2, AlertCircle, PhoneOff } from 'lucide-react';

interface LiveKitVideoProps {
  roomId: string;
  role: 'doctor' | 'patient';
  userName?: string;
  onLeave?: () => void;
}

export const LiveKitVideo: React.FC<LiveKitVideoProps> = ({ roomId, role, userName, onLeave }) => {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchToken = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.post('/api/livekit/token', {
          roomName: roomId,
          participantName: userName || (role === 'doctor' ? 'Médico' : 'Paciente')
        });

        if (!isMounted) return;

        if (response.data?.success && response.data?.token) {
          setToken(response.data.token);
          
          // Se o backend retornar a URL do LiveKit, utiliza ela, caso contrário usa env ou fallback
          let url = response.data.serverUrl || import.meta.env.VITE_LIVEKIT_URL;
          
          // Se a URL for ws://localhost:7880 mas o frontend estiver em HTTPS/host externo, adapta
          if (!url) {
            const host = window.location.hostname;
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            url = `${protocol}//${host}:7880`;
          }

          setServerUrl(url);
        } else {
          setError(response.data?.error || 'Erro ao obter token de acesso ao LiveKit');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Erro na requisição do token LiveKit:', err);
        setError(err.response?.data?.error || 'Falha de comunicação com o servidor LiveKit.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (roomId) {
      fetchToken();
    }

    return () => {
      isMounted = false;
    };
  }, [roomId, role, userName]);

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#090d16',
        borderRadius: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        gap: '1rem',
        fontFamily: '"Inter", sans-serif'
      }}>
        <Loader2 size={36} color="#38bdf8" style={{ animation: 'spin 1.5s linear infinite' }} />
        <p style={{ color: 'white', fontWeight: 600 }}>Conectando à sala LiveKit SFU...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !token || !serverUrl) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#090d16',
        borderRadius: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ef4444',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: '"Inter", sans-serif'
      }}>
        <AlertCircle size={48} style={{ marginBottom: '1rem' }} />
        <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Falha na Conexão de Vídeo</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '400px' }}>{error || 'Não foi possível inicializar o LiveKit.'}</p>
        {onLeave && (
          <button
            onClick={onLeave}
            style={{
              marginTop: '1.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '0.75rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Voltar
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#090d16',
      borderRadius: '1.5rem',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        onDisconnected={onLeave}
        data-lk-theme="default"
        style={{ height: '100%', width: '100%' }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};

export default LiveKitVideo;
