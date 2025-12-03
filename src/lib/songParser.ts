/**
 * Song title parser - extracts clean title, normalized artist, and extra info
 * (remixes, remasters, editions, etc.)
 */

export interface ParsedSong {
  title: string;
  artist: string;
  extra: string | null;
}

// Patterns that indicate "extra" info (remix, remaster, edition, etc.)
const EXTRA_PATTERNS = [
  /remix/i,
  /remaster(ed)?/i,
  /edition/i,
  /version/i,
  /mix/i,
  /edit/i,
  /live/i,
  /acoustic/i,
  /demo/i,
  /radio/i,
  /extended/i,
  /original/i,
  /deluxe/i,
  /bonus/i,
  /anniversary/i,
  /\d{4}/, // Year like 2004
];

// Patterns for featured artists
const FEAT_PATTERN = /\(?\s*(?:feat\.?|ft\.?|featuring)\s+(.+?)\)?$/i;

function isExtraInfo(text: string): boolean {
  return EXTRA_PATTERNS.some(pattern => pattern.test(text));
}

function normalizeArtistName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function artistsOverlap(featArtists: string, existingArtist: string): boolean {
  // Extract individual artist names from the feat string
  const featNames = featArtists
    .split(/[,&]/)
    .map(s => s.replace(/\s+from\s+.+$/i, '').trim()) // Remove "from X" suffixes for comparison
    .filter(Boolean);
  
  const existingNormalized = normalizeArtistName(existingArtist);
  
  // Check if any of the featured artists are already in the existing artist string
  return featNames.some(name => {
    const normalized = normalizeArtistName(name);
    return normalized.length > 2 && existingNormalized.includes(normalized);
  });
}

export function parseSongTitle(title: string, artist: string): ParsedSong {
  let cleanTitle = title.trim();
  let cleanArtist = artist.trim();
  let extra: string | null = null;

  // 1. Check for dash-separated suffix (e.g., "Burn – Remastered 2004")
  const dashMatch = cleanTitle.match(/^(.+?)\s*[–—-]\s*(.+)$/);
  if (dashMatch) {
    const [, mainTitle, suffix] = dashMatch;
    if (isExtraInfo(suffix)) {
      cleanTitle = mainTitle.trim();
      extra = suffix.trim();
    }
  }

  // 2. Check for parenthetical content
  const parenMatch = cleanTitle.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    const [, mainTitle, parenContent] = parenMatch;
    
    // Check if it's a feat/featuring
    const featMatch = parenContent.match(/^(?:feat\.?|ft\.?|featuring)\s+(.+)$/i);
    if (featMatch) {
      const featArtists = featMatch[1].trim();
      
      // Check if featured artists overlap with existing artist
      if (artistsOverlap(featArtists, cleanArtist)) {
        // Merge the full featured info into artist
        // Find and replace the partial match with the full version
        const featNames = featArtists.split(/[,&]/).map(s => s.trim()).filter(Boolean);
        
        for (const featName of featNames) {
          const baseName = featName.replace(/\s+from\s+.+$/i, '').trim();
          const baseNormalized = normalizeArtistName(baseName);
          
          // If this featured artist has additional info (like "from CYNE")
          if (featName !== baseName && baseNormalized.length > 2) {
            // Replace the base name with the full name in the artist string
            const regex = new RegExp(baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            if (regex.test(cleanArtist)) {
              cleanArtist = cleanArtist.replace(regex, featName);
            }
          }
        }
        
        cleanTitle = mainTitle.trim();
        // extra stays null - feat info was merged into artist
      } else {
        // Featured artist not in existing artist - keep as extra
        cleanTitle = mainTitle.trim();
        extra = `feat. ${featArtists}`;
      }
    } else if (isExtraInfo(parenContent)) {
      // It's remix/remaster/edition info
      cleanTitle = mainTitle.trim();
      extra = parenContent.trim();
    }
  }

  // 3. Handle feat at end without parentheses (e.g., "Song feat. Artist")
  if (!extra) {
    const featEndMatch = cleanTitle.match(/^(.+?)\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/i);
    if (featEndMatch) {
      const [, mainTitle, featArtists] = featEndMatch;
      
      if (artistsOverlap(featArtists, cleanArtist)) {
        cleanTitle = mainTitle.trim();
        // Merge logic same as above
        const featNames = featArtists.split(/[,&]/).map(s => s.trim()).filter(Boolean);
        for (const featName of featNames) {
          const baseName = featName.replace(/\s+from\s+.+$/i, '').trim();
          const baseNormalized = normalizeArtistName(baseName);
          if (featName !== baseName && baseNormalized.length > 2) {
            const regex = new RegExp(baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            if (regex.test(cleanArtist)) {
              cleanArtist = cleanArtist.replace(regex, featName);
            }
          }
        }
      } else {
        cleanTitle = mainTitle.trim();
        extra = `feat. ${featArtists}`;
      }
    }
  }

  return {
    title: cleanTitle,
    artist: cleanArtist,
    extra,
  };
}

