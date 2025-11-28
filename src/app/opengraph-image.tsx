import { ImageResponse } from 'next/og';

// Image metadata
export const alt = 'Syns - Music Visualization';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        {/* Logo - hollow green circle */}
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: '12px solid #00ff00',
            boxShadow: '0 0 40px 10px rgba(0, 255, 0, 0.6)',
            marginBottom: '40px',
          }}
        />
        
        {/* Title */}
        <div
          style={{
            fontSize: '80px',
            fontWeight: 'bold',
            color: '#ffffff',
            marginBottom: '20px',
            letterSpacing: '0.05em',
          }}
        >
          Syns
        </div>
        
        {/* Subtitle */}
        <div
          style={{
            fontSize: '36px',
            color: '#00ff00',
            textAlign: 'center',
          }}
        >
          Music Visualization
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
