import React from 'react';
import WebRTCVideo from './WebRTCVideo';

interface DailyVideoProps {
  roomUrl?: string;
  token?: string;
  roomId?: string;
  role?: 'doctor' | 'patient';
  userName?: string;
  onLeave?: () => void;
}

/**
 * Componente Wrapper para manter retrocompatibilidade e redirecionar para WebRTCVideo Nativo
 */
const DailyVideo: React.FC<DailyVideoProps> = ({ roomUrl, roomId, role = 'patient', userName, onLeave }) => {
  // Extrai roomId do roomUrl se não tiver passado explicitamente
  const effectiveRoomId = roomId || roomUrl?.split('/').pop() || 'sala-consulta';

  return (
    <WebRTCVideo 
      roomId={effectiveRoomId} 
      role={role} 
      userName={userName}
      onLeave={onLeave} 
    />
  );
};

export default DailyVideo;

