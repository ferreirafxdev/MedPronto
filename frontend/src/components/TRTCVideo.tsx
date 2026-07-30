import React, { useEffect, useState } from 'react';
import { TUICallKit, TUICallKitAPI, CallMediaType } from '@trtc/calls-uikit-react';
// @ts-ignore
import * as GenerateTestUserSig from '../debug/GenerateTestUserSig-es';
import { Loader2, AlertCircle, Phone } from 'lucide-react';

interface TRTCVideoProps {
  roomId: string;
  role: 'doctor' | 'patient';
  userName?: string;
  onLeave?: () => void;
}

const SDK_APP_ID = Number(import.meta.env.VITE_TRTC_SDK_APP_ID || 0);
const SDK_SECRET_KEY = import.meta.env.VITE_TRTC_SDK_SECRET_KEY || '';

const TRTCVideo: React.FC<TRTCVideoProps> = ({ roomId, role, userName, onLeave }) => {
  const [initStatus, setInitStatus] = useState<'idle' | 'initializing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Define userID para ambos os lados baseados no roomId para o pareamento direto
  const doctorUserId = `medico_${roomId}`;
  const patientUserId = `paciente_${roomId}`;

  const localUserId = role === 'doctor' ? doctorUserId : patientUserId;
  const remoteUserId = role === 'doctor' ? patientUserId : doctorUserId;

  useEffect(() => {
    let isMounted = true;

    if (!SDK_APP_ID || !SDK_SECRET_KEY) {
      setErrorMsg('Tencent TRTC VITE_TRTC_SDK_APP_ID ou VITE_TRTC_SDK_SECRET_KEY não configurados no arquivo .env.');
      setInitStatus('error');
      return;
    }

    const initTRTC = async () => {
      setInitStatus('initializing');
      try {
        // 1. Gera o UserSig localmente usando a ferramenta de depuração
        const { userSig } = (GenerateTestUserSig as any).genTestUserSig({
          userID: localUserId,
          SDKAppID: SDK_APP_ID,
          SecretKey: SDK_SECRET_KEY,
        });

        // 2. Inicializa o TUICallKitAPI
        await TUICallKitAPI.init({
          userID: localUserId,
          userSig,
          SDKAppID: SDK_APP_ID,
        });

        console.log('[TRTC] TUICallKit inicializado com sucesso para:', localUserId);
        
        if (isMounted) {
          setInitStatus('success');
        }

        // 3. Se for o médico, inicia a chamada automaticamente para o paciente!
        if (role === 'doctor') {
          console.log('[TRTC] Médico iniciando chamada para:', remoteUserId);
          setTimeout(async () => {
            try {
              await TUICallKitAPI.calls({
                userIDList: [remoteUserId],
                type: CallMediaType.VIDEO,
              });
            } catch (callErr: any) {
              console.error('[TRTC] Falha ao disparar chamada:', callErr);
            }
          }, 2000);
        }

      } catch (err: any) {
        console.error('[TRTC] Falha ao inicializar:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Erro desconhecido ao inicializar o TRTC.');
          setInitStatus('error');
        }
      }
    };

    initTRTC();

    return () => {
      isMounted = false;
    };
  }, [roomId, role, localUserId, remoteUserId]);

  if (initStatus === 'initializing') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        background: '#090d16',
        color: '#94a3b8',
        gap: '1rem',
        borderRadius: '1.5rem'
      }}>
        <Loader2 size={36} className="animate-spin" color="#38bdf8" />
        <span style={{ fontWeight: 600 }}>Inicializando Chamada Tencent TRTC...</span>
      </div>
    );
  }

  if (initStatus === 'error') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        background: '#090d16',
        color: '#f43f5e',
        padding: '2rem',
        textAlign: 'center',
        gap: '1rem',
        borderRadius: '1.5rem'
      }}>
        <AlertCircle size={40} />
        <h4 style={{ color: 'white', margin: 0, fontWeight: 700 }}>Erro de Configuração TRTC</h4>
        <p style={{ maxWidth: '400px', fontSize: '0.85rem', color: '#ef4444', margin: 0 }}>{errorMsg}</p>
        {onLeave && (
          <button onClick={onLeave} style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            marginTop: '1rem',
            fontWeight: 600
          }}>
            Voltar ao Painel
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#000',
      position: 'relative',
      borderRadius: '1.5rem',
      overflow: 'hidden'
    }}>
      <TUICallKit />

      {role === 'patient' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#94a3b8',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          zIndex: 10
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981'
          }}>
            <Phone size={28} />
          </div>
          <div>
            <h4 style={{ color: 'white', margin: 0, fontWeight: 700 }}>Linha de Chamada Pronta</h4>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
              Aguardando chamada de vídeo do médico...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(TRTCVideo);
