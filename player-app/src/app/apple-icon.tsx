import { ImageResponse } from 'next/og';

// Image metadata for Apple devices
export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

// Image generation
export default function AppleIcon() {
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
        {/* Hollow green circle (ring) with shadow - larger for Apple */}
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: '12px solid #00ff00',
            boxShadow: '0 0 20px 5px rgba(0, 255, 0, 0.6)',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}

