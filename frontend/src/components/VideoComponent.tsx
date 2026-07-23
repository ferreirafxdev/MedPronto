import React, { useRef, useEffect } from 'react';

interface Props {
  stream?: MediaStream | null;
  isMain?: boolean;
  label?: string;
}

const VideoComponent: React.FC<Props> = ({ stream, isMain, label }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

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
          objectFit: 'cover'
        }}
      />
      {label && (
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
          {label}
        </div>
      )}
    </div>
  );
};

export default VideoComponent;
