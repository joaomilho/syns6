import { ImageResponse } from 'next/og';

// Image metadata
export const alt = 'syns6 - Karaoke, redefined.';
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
          background: '#000',
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
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: '12px solid #00ff00',
            boxShadow: '0 0 20px 5px rgba(0, 255, 0, 0.6)',
            marginBottom: '40px',
            backgroundColor: '#000000',
          }}
        />

        <h1
          style={{
            fontSize: '64px',
            color: '#fff',
            textAlign: 'center',
            fontFamily: 'var(--font-geist-sans)',
            
          }}
        >
          Karaoke, redefined.
        </h1>
      </div>
    ),
    {
      ...size,
    }
  );
}
