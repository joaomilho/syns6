import styles from './Logo.module.css';

export interface LogoProps {
  loading?: boolean;
}

/**
 * Syns6 Logo - Hollow green circle with glow
 * Matches the favicon design exactly
 * Fixed size of 20px
 * When loading prop is true, spins smoothly
 */
export default function Logo({ loading = false }: LogoProps) {
  return (
    <div 
      className={`${styles.container} ${loading ? styles.loading : ''}`}
    >
      <div className={styles.circle} />
    </div>
  );
}

