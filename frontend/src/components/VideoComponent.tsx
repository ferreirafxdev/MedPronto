import { useEffect, useRef } from 'react';
import { StreamManager } from 'openvidu-browser';

interface Props {
  streamManager: StreamManager;
  isMain?: boolean;
}

const VideoComponent = ({ streamManager, isMain }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (streamManager && videoRef.current) {
      streamManager.addVideoElement(videoRef.current);
    }
  }, [streamManager]);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%', 
      overflow: 'hidden', 
      borderRadius: isMain ? '0' : '1rem',
      background: '#000',
      boxShadow: isMain ? 'none' : '0 10px 25px rgba(0,0,0,0.3)'
    }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', // This handles the "enquadramento" by filling the container
          transform: streamManager.remote ? 'none' : 'scaleX(-1)' // Mirror local video
        }}
      />
      <div style={{ 
        position: 'absolute', 
        bottom: '1rem', 
        left: '1rem', 
        background: 'rgba(0,0,0,0.5)', 
        color: 'white', 
        padding: '0.25rem 0.75rem', 
        borderRadius: '2rem', 
        fontSize: '0.7rem',
        fontWeight: 600,
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {JSON.parse(streamManager.stream.connection.data).clientData}
      </div>
    </div>
  );
};

export default VideoComponent;
