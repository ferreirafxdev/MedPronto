import { useEffect, useRef } from 'react';

// Definição das propriedades do componente de vídeo
interface Props {
  roomName: string;   // Nome da sala (ID único da consulta)
  userName: string;   // Nome do usuário que aparecerá no vídeo
  onReady?: () => void; // Callback opcional para quando o vídeo carregar
}

// Extensão da interface Window para o TypeScript reconhecer o script externo do Jitsi
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

/**
 * Componente JitsiVideo: Gerencia a integração com a API externa do Jitsi Meet.
 * Configurado para alta performance e baixa latência (P2P).
 */
const JitsiVideo = ({ roomName, userName, onReady }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null); // Referência ao container DOM do vídeo
  const apiRef = useRef<any>(null); // Referência à instância da API do Jitsi

  useEffect(() => {
    // Verifica se o container existe e se o script do Jitsi foi carregado no index.html
    if (containerRef.current && window.JitsiMeetExternalAPI) {
      const domain = 'meet.jit.si';
      const options = {
        roomName: `MedPronto_V2_${roomName}`, // Prefixo para evitar conflito de salas
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: { displayName: userName },
        
        // Sobrescrita de configurações de hardware e comportamento
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,   // Impede que abra o app mobile (mantém no browser)
          prejoinPageEnabled: false,  // Pula a tela de "entrar na sala"
          enableWelcomePage: false,   // Desativa página de boas-vindas do Jitsi
          p2p: { enabled: true },     // FORÇA P2P: Conexão direta entre usuários (não cai se o servidor estiver lento)
          resolution: 720,            // Qualidade HD 720p
          constraints: {
            video: { height: { ideal: 720 }, width: { ideal: 1280 } }
          },
          // Botões simplificados para layout clínico (apenas o essencial)
          toolbarButtons: ['microphone', 'camera', 'hangup', 'settings', 'videoquality'],
          settingsSections: ['devices'],
          disableSettingsSpelunking: true, // Impede o usuário de fuçar em configurações avançadas
          hideConferenceSubject: true,     // Esconde o nome da sala no topo
          hideConferenceTimer: true,       // Esconde o tempo de chamada interno do Jitsi
        },

        // Sobrescrita de interface visual
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'settings'],
          VIDEO_LAYOUT_FIT: 'both',
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_REMOTE_DISPLAY_NAME: 'Paciente',
          DISABLE_DOMINANT_SPEAKER_INDICATOR: true, // Remove ícones de "quem está falando"
          DISABLE_FOCUS_INDICATOR: true,            // Remove bordas azuis no vídeo ativo
          GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
          DISPLAY_WELCOME_PAGE_CONTENT: false,
          AUTHENTICATION_ENABLE: false,             // Garante que não peça senha na sala
        }
      };

      // Inicializa a instância do Jitsi
      apiRef.current = new window.JitsiMeetExternalAPI(domain, options);
      
      if (onReady) onReady();

      // Limpeza ao destruir o componente (encerra a chamada)
      return () => {
        if (apiRef.current) apiRef.current.dispose();
      };
    }
  }, [roomName, userName]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#000' }} />
  );
};

export default JitsiVideo;
