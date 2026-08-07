import { useEffect, useState, useCallback } from 'react';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useParticipants,
  useLocalParticipant,
  TrackToggle,
  DisconnectButton,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, RoomEvent } from 'livekit-client';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Loader2, AlertCircle, Wifi, WifiOff, Monitor
} from 'lucide-react';
import apiClient from '../api/client';

interface LiveKitVideoProps {
  roomId: string;
  role: 'doctor' | 'patient';
  userName?: string;
  onLeave?: () => void;
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

/**
 * LiveKit Video Component
 * Handles token fetching, room connection, and video/audio rendering
 * with a clean, professional medical UI.
 */
const LiveKitVideo: React.FC<LiveKitVideoProps> = ({
  roomId,
  role,
  userName = 'Usuario',
  onLeave,
}) => {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    setConnectionState('connecting');
    setError(null);
    try {
      const roomName = `consultation-${roomId}`;
      const participantName = `${role === 'doctor' ? 'Dr. ' : ''}${userName}`;

      const response = await apiClient.post('/api/livekit/token', {
        roomName,
        participantName,
      });

      if (response.data.success) {
        setToken(response.data.token);
        setServerUrl(response.data.serverUrl);
        setConnectionState('connected');
      } else {
        throw new Error('Falha ao obter token de acesso');
      }
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Erro ao conectar na sala de video';
      setError(message);
      setConnectionState('error');
    }
  }, [roomId, role, userName]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  if (connectionState === 'connecting' || connectionState === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#111827] rounded-lg gap-4">
        <Loader2 size={32} className="animate-spin text-[var(--color-brand)]" />
        <span className="text-[14px] font-medium text-[#9CA3AF]">
          Conectando a teleconsulta...
        </span>
      </div>
    );
  }

  if (connectionState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#111827] rounded-lg gap-4 p-6 text-center">
        <AlertCircle size={36} className="text-[var(--color-error)]" />
        <h4 className="text-white text-[15px] font-semibold m-0">Erro de Conexao</h4>
        <p className="text-[#9CA3AF] text-[13px] max-w-[360px] m-0">{error}</p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={fetchToken}
            className="btn-primary text-[13px] py-2 px-4"
          >
            Tentar Novamente
          </button>
          {onLeave && (
            <button
              onClick={onLeave}
              className="btn-secondary text-[13px] py-2 px-4 text-white border-[#374151] hover:bg-[#1F2937]"
            >
              Voltar
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) return null;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onDisconnected={() => {
        onLeave?.();
      }}
      style={{ height: '100%', width: '100%' }}
      data-lk-theme="default"
    >
      <RoomContent role={role} onLeave={onLeave} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
};

/**
 * Inner component that renders video tracks and controls
 */
const RoomContent: React.FC<{ role: string; onLeave?: () => void }> = ({ role, onLeave }) => {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const remoteTracks = tracks.filter(
    (t) => t.participant.sid !== localParticipant.sid && t.source === Track.Source.Camera
  );
  const localTracks = tracks.filter(
    (t) => t.participant.sid === localParticipant.sid && t.source === Track.Source.Camera
  );

  const remoteTrack = remoteTracks[0];
  const localTrack = localTracks[0];
  const remoteParticipant = participants.find(p => p.sid !== localParticipant.sid);

  return (
    <div className="relative h-full w-full bg-[#0F172A] flex flex-col">
      {/* Main Video Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Remote Video (Full Screen) */}
        {remoteTrack?.publication?.track ? (
          <VideoTrack
            trackRef={remoteTrack}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1E293B] flex items-center justify-center">
              <Monitor size={28} className="text-[#475569]" />
            </div>
            <div>
              <p className="text-white text-[14px] font-medium m-0">
                {remoteParticipant
                  ? `${remoteParticipant.name || 'Participante'} conectado`
                  : 'Aguardando participante...'
                }
              </p>
              <p className="text-[#64748B] text-[12px] m-0 mt-1">
                {remoteParticipant
                  ? 'Camera desativada'
                  : role === 'patient'
                    ? 'O medico entrara na sala em instantes'
                    : 'O paciente entrara na sala em instantes'
                }
              </p>
            </div>
            {!remoteParticipant && (
              <Loader2 size={20} className="animate-spin text-[var(--color-brand)] mt-2" />
            )}
          </div>
        )}

        {/* Local Video (PiP - Picture in Picture) */}
        <div className="absolute top-4 right-4 w-[180px] h-[135px] rounded-lg overflow-hidden bg-[#1E293B] border border-[#334155] shadow-lg z-10">
          {localTrack?.publication?.track ? (
            <VideoTrack
              trackRef={localTrack}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <VideoOff size={20} className="text-[#475569]" />
            </div>
          )}
          <div className="absolute bottom-1.5 left-2 text-[10px] text-white/80 font-medium bg-black/40 px-1.5 py-0.5 rounded">
            Voce
          </div>
        </div>

        {/* Connection Status */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md z-10">
          <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
          <span className="text-[11px] text-white/80 font-medium">Conectado</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-center gap-3 py-3 px-4 bg-[#0F172A] border-t border-[#1E293B]">
        <TrackToggle
          source={Track.Source.Microphone}
          className="w-10 h-10 rounded-full bg-[#1E293B] border border-[#334155] text-white flex items-center justify-center cursor-pointer hover:bg-[#334155] transition-colors"
        />
        <TrackToggle
          source={Track.Source.Camera}
          className="w-10 h-10 rounded-full bg-[#1E293B] border border-[#334155] text-white flex items-center justify-center cursor-pointer hover:bg-[#334155] transition-colors"
        />
        <button
          onClick={onLeave}
          className="w-10 h-10 rounded-full bg-[var(--color-error)] text-white flex items-center justify-center cursor-pointer hover:bg-[#B91C1C] transition-colors"
          title="Encerrar chamada"
        >
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  );
};

export default LiveKitVideo;
