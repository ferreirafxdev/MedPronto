import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mic, MicOff, Video, VideoOff, PhoneOff, RefreshCw } from 'lucide-react';

interface WebRTCVideoProps {
  roomId: string;
  role: 'doctor' | 'patient';
  userName?: string;
  onLeave?: () => void;
  onMeetingEnd?: () => void;
}

/**
 * Componente de Vídeo WebRTC Nativo (Peer-to-Peer) com Signaling via Socket.io
 * Substitui completamente a dependência de plataformas externas (Daily.co / LiveKit)
 */
const WebRTCVideo: React.FC<WebRTCVideoProps> = ({ roomId, role, userName, onLeave, onMeetingEnd }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  // Configuração dos servidores STUN/TURN (Coturn proprietário e fallback público STUN)
  const iceServersConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Suporte a servidor TURN se configurado no ambiente
      ...(import.meta.env.VITE_TURN_SERVER ? [{
        urls: import.meta.env.VITE_TURN_SERVER,
        username: import.meta.env.VITE_TURN_USERNAME || '',
        credential: import.meta.env.VITE_TURN_PASSWORD || ''
      }] : [])
    ]
  };

  useEffect(() => {
    let isMounted = true;

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    // Conecta ao Socket.io
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    // Inicializa a mídia local (Câmera e Microfone)
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });

        if (!isMounted) return;

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Entra na sala no WebSocket
        socket.emit('join-room', { roomId, role });

      } catch (err) {
        console.error('Erro ao acessar câmera/microfone:', err);
        setConnectionStatus('disconnected');
      }
    };

    initLocalStream();

    // Eventos do WebSocket Signaling
    socket.on('connect', () => {
      console.log('Conectado ao servidor de sinalização WebRTC');
    });

    // Quando outro usuário entra na sala
    socket.on('user-joined', async ({ socketId }: { socketId: string, role: string }) => {
      console.log(`Novo usuário conectado (${socketId}). Iniciando chamada P2P...`);
      createPeerConnection(socketId, true);
    });

    // Trata sinais WebRTC recebidos (Offer, Answer, ICE Candidate)
    socket.on('signal', async ({ sender, signal }: { sender: string, signal: any }) => {
      if (!pcRef.current) {
        createPeerConnection(sender, false);
      }

      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('signal', { roomId, signal: { sdp: pc.localDescription }, to: sender });
          }
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Erro no processamento de sinal WebRTC:', err);
      }
    });

    // Chamada finalizada pelo outro participante
    socket.on('call-ended', () => {
      setHasRemoteVideo(false);
      setConnectionStatus('disconnected');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (onMeetingEnd) {
        onMeetingEnd();
      }
    });

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [roomId, role, onMeetingEnd]);

  /**
   * Cria e configura a RTCPeerConnection
   */
  const createPeerConnection = async (targetSocketId: string, isInitiator: boolean) => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(iceServersConfig);
    pcRef.current = pc;

    // Adiciona tracks locais à conexão
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Trata recebimento do stream remoto
    pc.ontrack = (event) => {
      console.log('Stream remoto recebido com sucesso');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setHasRemoteVideo(true);
        setConnectionStatus('connected');
      }
    };

    // Envia candidatos ICE para o peer
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('signal', {
          roomId,
          signal: { candidate: event.candidate },
          to: targetSocketId
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('Estado da conexão ICE:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionStatus('connected');
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setConnectionStatus('disconnected');
        setHasRemoteVideo(false);
      }
    };

    // Se for o iniciador, envia o Offer SDP
    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit('signal', {
          roomId,
          signal: { sdp: pc.localDescription },
          to: targetSocketId
        });
      } catch (err) {
        console.error('Erro ao criar Offer WebRTC:', err);
      }
    }
  };

  /**
   * Limpa conexões e streams de mídia
   */
  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  /**
   * Alterna estado do Microfone
   */
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  /**
   * Alterna estado da Câmera
   */
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  /**
   * Encerra a chamada
   */
  const handleEndCall = () => {
    socketRef.current?.emit('end-call', { roomId });
    cleanup();
    if (onLeave) onLeave();
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#090d16',
      borderRadius: '1.5rem',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Inter", sans-serif'
    }}>

      {/* Vídeo Remoto (Tela Inteira do Container) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: hasRemoteVideo ? 'block' : 'none'
        }}
      />

      {/* Placeholder caso o participante ainda não esteja no vídeo */}
      {!hasRemoteVideo && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          color: '#94a3b8',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '2px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6',
            animation: connectionStatus === 'connecting' ? 'spin 2s linear infinite' : 'none'
          }}>
            <RefreshCw size={28} />
          </div>
          <div>
            <h4 style={{ color: 'white', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              {role === 'doctor' ? 'Aguardando paciente entrar...' : 'Conectando ao médico...'}
            </h4>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
              Sala P2P Segura: <span style={{ color: '#38bdf8' }}>{roomId?.substring(0, 8)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Vídeo Local (Picture-in-Picture no Canto Inferior Direito) */}
      <div style={{
        position: 'absolute',
        bottom: '5.5rem',
        right: '1.5rem',
        width: '160px',
        height: '100px',
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        border: '2px solid rgba(255,255,255,0.15)',
        background: '#1e293b',
        zIndex: 20
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
            transform: 'scaleX(-1)' // Espelha vídeo local
          }}
        />
        <div style={{
          position: 'absolute',
          bottom: '0.4rem',
          left: '0.4rem',
          background: 'rgba(0,0,0,0.6)',
          padding: '0.1rem 0.5rem',
          borderRadius: '0.5rem',
          color: 'white',
          fontSize: '0.65rem',
          backdropFilter: 'blur(4px)'
        }}>
          Você ({userName || role})
        </div>
      </div>

      {/* Barra de Controles (Barra Inferior Flutuante) */}
      <div style={{
        position: 'absolute',
        bottom: '1.25rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'rgba(15, 23, 42, 0.85)',
        padding: '0.6rem 1.25rem',
        borderRadius: '2rem',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)',
        zIndex: 30
      }}>
        {/* Alternar Áudio */}
        <button
          onClick={toggleAudio}
          title={isAudioMuted ? 'Ativar Microfone' : 'Desativar Microfone'}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: 'none',
            background: isAudioMuted ? '#ef4444' : 'rgba(255,255,255,0.1)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Alternar Vídeo */}
        <button
          onClick={toggleVideo}
          title={isVideoMuted ? 'Ativar Câmera' : 'Desativar Câmera'}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: 'none',
            background: isVideoMuted ? '#ef4444' : 'rgba(255,255,255,0.1)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        {/* Encerrar Chamada */}
        <button
          onClick={handleEndCall}
          title="Sair da Chamada"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: 'none',
            background: '#dc2626',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <PhoneOff size={20} />
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default React.memo(WebRTCVideo);

