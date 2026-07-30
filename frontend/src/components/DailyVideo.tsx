import React from 'react';
import VideoSDKVideo from './VideoSDKVideo';

interface DailyVideoProps {
  roomUrl?: string;
  token?: string;
  roomId?: string;
  role?: 'doctor' | 'patient';
  userName?: string;
  onLeave?: () => void;
  onMeetingEnd?: () => void;
}

/**
 * Wrapper de compatibilidade → VideoSDK WebRTC
 */
const DailyVideo: React.FC<DailyVideoProps> = ({
  roomUrl,
  roomId,
  role = 'patient',
  userName,
  onLeave,
  onMeetingEnd
}) => {
  const effectiveRoomId = roomId || roomUrl?.split('/').pop() || 'sala-consulta';

  return (
    <VideoSDKVideo
      roomId={effectiveRoomId}
      role={role}
      userName={userName}
      onLeave={onLeave}
      onMeetingEnd={onMeetingEnd}
    />
  );
};

export default DailyVideo;
