import { useEffect, useRef } from 'react';

interface Props {
  roomName: string;
  userName: string;
  onReady?: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

const JitsiVideo = ({ roomName, userName, onReady }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current && window.JitsiMeetExternalAPI) {
      const domain = 'meet.jit.si';
      const options = {
        roomName: `MedPronto_${roomName}`,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: {
          displayName: userName
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          enableWelcomePage: false,
          enableNoisyMicDetection: false,
          resolution: 720,
          constraints: {
            video: {
              height: { ideal: 720, max: 720, min: 480 },
              width: { ideal: 1280, max: 1280, min: 640 }
            }
          },
          // Customizing UI to look "native"
          toolbarButtons: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
            'tileview', 'select-background', 'download', 'help', 'mute-everyone',
            'security'
          ],
          settingsSections: ['devices', 'language', 'profile', 'calendar'],
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'chat', 'settings', 'tileview'],
          VIDEO_LAYOUT_FIT: 'both',
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_REMOTE_DISPLAY_NAME: 'Paciente',
          DISABLE_TRANSCRIPTION_SUBTITLES: true,
        }
      };

      apiRef.current = new window.JitsiMeetExternalAPI(domain, options);
      
      if (onReady) onReady();

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
