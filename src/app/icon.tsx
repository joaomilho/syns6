import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};

export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#000000',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Green circle with shadow */}
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#00ff00',
            boxShadow: '0 0 8px 2px rgba(0, 255, 0, 0.6)',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}

