import styles from './Logo.module.css';

export interface LogoProps {
  loading?: boolean;
  size?: number;
}

/**
 * Syns6 Logo - Hollow green circle with glow
 * Matches the favicon design exactly
 * When loading prop is true, spins smoothly
 */
export default function Logo({ loading = false, size = 32 }: LogoProps) {
  return (
    <div 
      className={`${styles.container} ${loading ? styles.loading : ''}`}
      style={{ 
        width: size, 
        height: size,
      }}
    >
      <div className={styles.circle} />
    </div>
  );
}

