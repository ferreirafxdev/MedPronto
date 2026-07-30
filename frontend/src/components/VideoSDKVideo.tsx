import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';

const VIDEOSDK_TOKEN = import.meta.env.VITE_VIDEOSDK_TOKEN || '';
const VIDEOSDK_API = 'https://api.videosdk.live/v2';

interface VideoSDKVideoProps {
  roomId: string;
  role: 'doctor' | 'patient';
  userName?: string;
  onLeave?: () => void;
  onMeetingEnd?: () => void;
}

type MeetingState = 'idle' | 'joining' | 'joined' | 'error' | 'ended';

/**
 * VideoSDK WebRTC Component
 * 
 * Layout:
 * - Vídeo remoto: ocupa 100% da tela (fullscreen)
 * - Self-view (próprio): fixo no canto superior esquerdo (PiP)
 * - Controles flutuantes na parte inferior
 */
const VideoSDKVideo: React.FC<VideoSDKVideoProps> = ({
  roomId,
  role,
  userName = 'Usuário',
  onLeave,
  onMeetingEnd
}) => {
  const [state, setState] = useState<MeetingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [participants, setParticipants] = useState<Map<string, any>>(new Map());
  const [remoteParticipantId, setRemoteParticipantId] = useState<string | null>(null);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'poor'>('good');

  const meetingRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const sdkRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Carrega o SDK do VideoSDK dinamicamente
  const loadSDK = useCallback((): Promise<any> => {
    return new Promise((resolve, reject) => {
      // Se já carregado, retorna direto
      if ((window as any).VideoSDK) {
        resolve((window as any).VideoSDK);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://sdk.videosdk.live/js-sdk/0.1.6/videosdk.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).VideoSDK) {
          resolve((window as any).VideoSDK);
        } else {
          reject(new Error('VideoSDK não carregado após script'));
        }
      };
      script.onerror = () => reject(new Error('Falha ao carregar VideoSDK SDK'));
      document.head.appendChild(script);
    });
  }, []);

  // Cria a sala no VideoSDK se não existir
  const createMeetingRoom = useCallback(async (): Promise<string> => {
    const response = await fetch(`${VIDEOSDK_API}/rooms`, {
      method: 'POST',
      headers: {
        Authorization: VIDEOSDK_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ roomId })
    });
    const data = await response.json();
    // A API pode retornar o roomId existente ou criar um novo
    return data.roomId || roomId;
  }, [roomId]);

  // Renderiza o stream de um participante no elemento de vídeo
  const renderParticipantVideo = useCallback((participant: any, videoEl: HTMLVideoElement | null) => {
    if (!videoEl || !participant) return;
    try {
      const streams = participant.streams;
      if (!streams) return;
      const videoStream = streams.get('video');
      if (videoStream && videoStream.track) {
        const mediaStream = new MediaStream([videoStream.track]);
        videoEl.srcObject = mediaStream;
        videoEl.play().catch(() => {});
      }
    } catch (e) {
      console.warn('[VideoSDK] Erro ao renderizar vídeo:', e);
    }
  }, []);

  // Renderiza o stream de áudio de um participante no elemento de áudio
  const renderParticipantAudio = useCallback((participant: any, audioEl: HTMLAudioElement | null) => {
    if (!audioEl || !participant) return;
    try {
      const streams = participant.streams;
      if (!streams) return;
      const audioStream = streams.get('audio');
      if (audioStream && audioStream.track) {
        const mediaStream = new MediaStream([audioStream.track]);
        audioEl.srcObject = mediaStream;
        audioEl.play().catch((err) => {
          console.warn('[VideoSDK] Erro ao reproduzir áudio:', err);
        });
      }
    } catch (e) {
      console.warn('[VideoSDK] Erro ao renderizar áudio:', e);
    }
  }, []);

  // Inicializa e entra na meeting
  const joinMeeting = useCallback(async () => {
    setState('joining');
    setError(null);

    if (!VIDEOSDK_TOKEN) {
      setError('Chave de autenticação da videochamada (VideoSDK Token) não configurada no ambiente.');
      setState('error');
      return;
    }

    try {
      const VideoSDK = await loadSDK();
      sdkRef.current = VideoSDK;

      // Configura o Token globalmente no VideoSDK como exigido pelo JS SDK
      VideoSDK.config(VIDEOSDK_TOKEN);

      // Tenta criar/validar a sala
      try {
        await createMeetingRoom();
      } catch (e) {
        // Ignora erro de criação (sala pode já existir)
      }

      // Inicializa o meeting sem o token no parâmetro interno
      const meeting = VideoSDK.initMeeting({
        meetingId: roomId,
        name: userName,
        micEnabled: micOn,
        webcamEnabled: camOn,
      });

      meetingRef.current = meeting;

      // Adiciona o listener de stream para o participante local imediatamente
      meeting.localParticipant.on('stream-enabled', (stream: any) => {
        console.log('[VideoSDK] Stream local habilitada:', stream.kind);
        if (stream.kind === 'video') {
          renderParticipantVideo(meeting.localParticipant, localVideoRef.current);
        }
      });

      // Evento: entrou na meeting
      meeting.on('meeting-joined', () => {
        console.log('[VideoSDK] Meeting joined:', roomId);
        setState('joined');

        // Renderiza self-view local se já estiver disponível
        if (meeting.localParticipant) {
          renderParticipantVideo(meeting.localParticipant, localVideoRef.current);
        }

        // Renderiza participantes que já estavam na sala antes de entrarmos
        meeting.participants.forEach((participant: any) => {
          console.log('[VideoSDK] Participante pré-existente encontrado:', participant.id);
          setRemoteParticipantId(participant.id);
          
          // Renderização inicial tardia segura (espera carregamento dos refs no DOM)
          setTimeout(() => {
            renderParticipantVideo(participant, remoteVideoRef.current);
            renderParticipantAudio(participant, remoteAudioRef.current);
          }, 800);

          participant.on('stream-enabled', (stream: any) => {
            if (stream.kind === 'video') {
              renderParticipantVideo(participant, remoteVideoRef.current);
            } else if (stream.kind === 'audio') {
              renderParticipantAudio(participant, remoteAudioRef.current);
            }
          });

          participant.on('stream-disabled', (stream: any) => {
            if (stream.kind === 'video' && remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            } else if (stream.kind === 'audio' && remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = null;
            }
          });
        });
      });

      // Evento: meeting encerrada
      meeting.on('meeting-left', () => {
        console.log('[VideoSDK] Meeting left');
        setState('ended');
        // Limpa streams locais
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
        }
        onMeetingEnd?.();
        onLeave?.();
      });

      // Evento: erro na meeting
      meeting.on('error', (err: any) => {
        console.error('[VideoSDK] Erro:', err);
        setError(err?.message || 'Erro na videochamada');
        setState('error');
      });

      // Evento: participante entrou (em tempo real)
      meeting.on('participant-joined', (participant: any) => {
        console.log('[VideoSDK] Participante entrou:', participant.id);
        setParticipants(prev => new Map(prev.set(participant.id, participant)));
        setRemoteParticipantId(participant.id);

        // Renderiza streams imediatamente
        setTimeout(() => {
          renderParticipantVideo(participant, remoteVideoRef.current);
          renderParticipantAudio(participant, remoteAudioRef.current);
        }, 800);

        // Aguarda stream de vídeo/áudio do participante
        participant.on('stream-enabled', (stream: any) => {
          console.log('[VideoSDK] Stream habilitada:', stream.kind, 'para', participant.id);
          if (stream.kind === 'video') {
            renderParticipantVideo(participant, remoteVideoRef.current);
          } else if (stream.kind === 'audio') {
            renderParticipantAudio(participant, remoteAudioRef.current);
          }
        });

        participant.on('stream-disabled', (stream: any) => {
          console.log('[VideoSDK] Stream desabilitada:', stream.kind, 'para', participant.id);
          if (stream.kind === 'video' && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          } else if (stream.kind === 'audio' && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
          }
        });
      });

      // Evento: participante saiu
      meeting.on('participant-left', (participant: any) => {
        console.log('[VideoSDK] Participante saiu:', participant.id);
        setParticipants(prev => {
          const m = new Map(prev);
          m.delete(participant.id);
          return m;
        });
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null;
        }
        setRemoteParticipantId(null);
        // Se médico sair, e for paciente, considera consulta encerrada
        if (role === 'patient') {
          onMeetingEnd?.();
        }
      });

      // Entra na meeting
      meeting.join();

    } catch (err: any) {
      console.error('[VideoSDK] Falha ao entrar na meeting:', err);
      setError(err?.message || 'Falha ao conectar à videochamada');
      setState('error');
    }
  }, [roomId, userName, micOn, camOn, loadSDK, createMeetingRoom, renderParticipantVideo, onLeave, onMeetingEnd, role, remoteParticipantId]);

  useEffect(() => {
    joinMeeting();
    return () => {
      // Cleanup ao desmontar
      if (meetingRef.current) {
        try { meetingRef.current.leave(); } catch (e) {}
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleMic = useCallback(() => {
    if (!meetingRef.current) return;
    if (micOn) {
      meetingRef.current.muteMic?.();
    } else {
      meetingRef.current.unmuteMic?.();
    }
    setMicOn(v => !v);
  }, [micOn]);

  const handleToggleCam = useCallback(() => {
    if (!meetingRef.current) return;
    if (camOn) {
      meetingRef.current.disableWebcam?.();
    } else {
      meetingRef.current.enableWebcam?.();
    }
    setCamOn(v => !v);
  }, [camOn]);

  const handleLeave = useCallback(() => {
    if (meetingRef.current) {
      try { meetingRef.current.leave(); } catch (e) {}
    }
    onLeave?.();
  }, [onLeave]);

  // ─────── Tela de Carregamento ───────
  if (state === 'idle' || state === 'joining') {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #090d16, #0f172a)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: 'white', fontFamily: '"Inter", sans-serif', gap: '1.5rem'
      }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(37, 99, 235, 0.15)',
            border: '2px solid rgba(37, 99, 235, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse-ring 2s ease-in-out infinite'
          }}>
            <Loader2 size={36} color="#3b82f6" style={{ animation: 'spin 1.5s linear infinite' }} />
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>
            Conectando à videochamada...
          </p>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.4rem' }}>
            VideoSDK WebRTC · Sala: {roomId.substring(0, 8)}...
          </p>
        </div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse-ring { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.7; } }
        `}</style>
      </div>
    );
  }

  // ─────── Tela de Erro ───────
  if (state === 'error') {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: '#090d16',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: 'white', fontFamily: '"Inter", sans-serif',
        padding: '2rem', textAlign: 'center'
      }}>
        <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem' }}>Falha na Conexão</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '380px', lineHeight: 1.5 }}>
          {error || 'Não foi possível conectar à videochamada.'}
        </p>
        <button
          onClick={joinMeeting}
          style={{
            marginTop: '1.5rem', padding: '0.75rem 1.5rem',
            background: '#3b82f6', color: 'white', border: 'none',
            borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          Tentar Novamente
        </button>
        {onLeave && (
          <button
            onClick={onLeave}
            style={{
              marginTop: '0.75rem', padding: '0.6rem 1.25rem',
              background: 'transparent', color: '#64748b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'
            }}
          >
            Voltar
          </button>
        )}
      </div>
    );
  }

  // ─────── Sala de Vídeo Principal ───────
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000', overflow: 'hidden' }}>

      {/* VÍDEO REMOTO — Tela Cheia */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted={false}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover',
          background: '#111'
        }}
      />

      {/* ÁUDIO REMOTO */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        muted={false}
      />

      {/* Placeholder quando não há participante remoto */}
      {!remoteParticipantId && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          color: 'white', gap: '1rem'
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '2px solid rgba(56, 189, 248, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse-ring 2.5s ease-in-out infinite'
          }}>
            <Loader2 size={32} color="#38bdf8" style={{ animation: 'spin 2s linear infinite' }} />
          </div>
          <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.95rem' }}>
            {role === 'doctor' ? 'Aguardando paciente conectar...' : 'Aguardando médico conectar...'}
          </p>
        </div>
      )}

      {/* SELF-VIEW — Canto Superior Esquerdo (PiP) */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        width: '160px',
        height: '120px',
        borderRadius: '0.85rem',
        overflow: 'hidden',
        border: '2px solid rgba(255,255,255,0.2)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        zIndex: 30,
        background: '#111',
        transition: 'box-shadow 0.2s ease'
      }}>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)' // Espelho (modo selfie)
          }}
        />
        {!camOn && (
          <div style={{
            position: 'absolute', inset: 0,
            background: '#1e293b',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <VideoOff size={28} color="#64748b" />
          </div>
        )}
        {/* Badge "Você" */}
        <div style={{
          position: 'absolute', bottom: '0.4rem', left: '0.4rem',
          background: 'rgba(0,0,0,0.7)',
          padding: '0.15rem 0.4rem', borderRadius: '0.3rem',
          fontSize: '0.65rem', color: 'white', fontWeight: 700,
          backdropFilter: 'blur(4px)'
        }}>
          VOCÊ
        </div>
        {/* Indicador de mic no self-view */}
        {!micOn && (
          <div style={{
            position: 'absolute', top: '0.4rem', right: '0.4rem',
            background: 'rgba(239,68,68,0.9)', borderRadius: '50%',
            width: '20px', height: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <MicOff size={12} color="white" />
          </div>
        )}
      </div>

      {/* Badge de Qualidade de Rede */}
      <div style={{
        position: 'absolute', top: '1rem', right: '1rem', zIndex: 30,
        background: 'rgba(0,0,0,0.6)',
        padding: '0.3rem 0.6rem', borderRadius: '0.5rem',
        display: 'flex', alignItems: 'center', gap: '0.35rem',
        backdropFilter: 'blur(8px)',
        fontSize: '0.7rem', color: networkQuality === 'good' ? '#10b981' : '#f59e0b',
        fontWeight: 700
      }}>
        {networkQuality === 'good' ? <Wifi size={12} /> : <WifiOff size={12} />}
        {networkQuality === 'good' ? 'BOA QUALIDADE' : 'SINAL FRACO'}
      </div>

      {/* CONTROLES — Barra Inferior */}
      <div style={{
        position: 'absolute', bottom: '1.5rem', left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        display: 'flex', alignItems: 'center', gap: '1rem',
        background: 'rgba(9, 13, 22, 0.85)',
        padding: '0.85rem 1.5rem',
        borderRadius: '2rem',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.6)'
      }}>
        {/* Microfone */}
        <button
          onClick={handleToggleMic}
          title={micOn ? 'Silenciar microfone' : 'Ativar microfone'}
          style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: micOn ? 'rgba(255,255,255,0.1)' : '#ef4444',
            border: `1px solid ${micOn ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s ease', color: 'white'
          }}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        {/* Câmera */}
        <button
          onClick={handleToggleCam}
          title={camOn ? 'Desligar câmera' : 'Ligar câmera'}
          style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: camOn ? 'rgba(255,255,255,0.1)' : '#ef4444',
            border: `1px solid ${camOn ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s ease', color: 'white'
          }}
        >
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        {/* Encerrar Chamada */}
        <button
          onClick={handleLeave}
          title="Encerrar chamada"
          style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #dc2626, #ef4444)',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s ease', color: 'white',
            boxShadow: '0 8px 16px rgba(220,38,38,0.4)'
          }}
        >
          <PhoneOff size={22} />
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-ring { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.7; } }
      `}</style>
    </div>
  );
};

export default VideoSDKVideo;
