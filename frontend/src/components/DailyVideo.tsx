import React, { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import { Camera, Mic, PhoneOff, Monitor, Settings } from 'lucide-react';

interface DailyVideoProps {
  roomUrl: string;
  token?: string;
  onLeave?: () => void;
}

const DailyVideo: React.FC<DailyVideoProps> = ({ roomUrl, token, onLeave }) => {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [callObject, setCallObject] = useState<any>(null);

  useEffect(() => {
    if (!videoContainerRef.current) return;

    // Destroy existing instance if any
    if (callObject) {
      callObject.destroy();
    }

    // Initialize Daily Prebuilt
    const callFrame = DailyIframe.createFrame(videoContainerRef.current, {
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '1.5rem',
      },
      showLeaveButton: true,
      showFullscreenButton: true,
    });

    setCallObject(callFrame);

    // Join the room
    callFrame.join({ url: roomUrl, token });

    // Event listeners
    callFrame.on('left-meeting', () => {
      if (onLeave) onLeave();
    });

    return () => {
      callFrame.destroy();
    };
  }, [roomUrl, token]);

  return (
    <div 
      ref={videoContainerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '300px', 
        backgroundColor: '#000',
        borderRadius: '1.5rem',
        overflow: 'hidden',
        position: 'relative'
      }} 
    >
        {/* Placeholder if loading or no video */}
        {!roomUrl && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Conectando ao Daily.co...
            </div>
        )}
    </div>
  );
};

export default DailyVideo;
