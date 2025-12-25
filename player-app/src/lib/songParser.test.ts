import { parseSongTitle, ParsedSong } from './songParser';

// Simple test runner
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e: any) {
    failed++;
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
  }
}

function expect(actual: ParsedSong) {
  return {
    toEqual(expected: ParsedSong) {
      if (
        actual.title !== expected.title ||
        actual.artist !== expected.artist ||
        actual.extra !== expected.extra
      ) {
        throw new Error(
          `Expected: ${JSON.stringify(expected)}\n     Got: ${JSON.stringify(actual)}`
        );
      }
    }
  };
}

console.log('\n🧪 Song Parser Tests\n');

console.log('Remix/remaster in parentheses:');
test('extracts year remix from parentheses', () => {
  expect(parseSongTitle('When A Blind Man Cries (1997 Remix)', 'Deep Purple'))
    .toEqual({ title: 'When A Blind Man Cries', artist: 'Deep Purple', extra: '1997 Remix' });
});

test('extracts anniversary edition from parentheses', () => {
  expect(parseSongTitle('Burn (30th Anniversary Edition)', 'Deep Purple'))
    .toEqual({ title: 'Burn', artist: 'Deep Purple', extra: '30th Anniversary Edition' });
});

test('extracts live version from parentheses', () => {
  expect(parseSongTitle('Highway Star (Live)', 'Deep Purple'))
    .toEqual({ title: 'Highway Star', artist: 'Deep Purple', extra: 'Live' });
});

test('extracts acoustic version from parentheses', () => {
  expect(parseSongTitle('Layla (Acoustic)', 'Eric Clapton'))
    .toEqual({ title: 'Layla', artist: 'Eric Clapton', extra: 'Acoustic' });
});

test('extracts deluxe edition from parentheses', () => {
  expect(parseSongTitle('Album Track (Deluxe Edition)', 'Some Artist'))
    .toEqual({ title: 'Album Track', artist: 'Some Artist', extra: 'Deluxe Edition' });
});

console.log('\nRemaster after dash:');
test('extracts remastered year after en-dash', () => {
  expect(parseSongTitle('Burn – Remastered 2004', 'Deep Purple'))
    .toEqual({ title: 'Burn', artist: 'Deep Purple', extra: 'Remastered 2004' });
});

test('extracts remastered year after em-dash', () => {
  expect(parseSongTitle('Smoke on the Water — Remastered 2012', 'Deep Purple'))
    .toEqual({ title: 'Smoke on the Water', artist: 'Deep Purple', extra: 'Remastered 2012' });
});

test('extracts remastered year after regular dash', () => {
  expect(parseSongTitle('Child in Time - Remastered', 'Deep Purple'))
    .toEqual({ title: 'Child in Time', artist: 'Deep Purple', extra: 'Remastered' });
});

console.log('\nFeatured artists - overlap with existing artist:');
test('merges feat info when artists overlap', () => {
  expect(parseSongTitle('Feather (feat. Cise Starr & Akin from CYNE)', 'Nujabes, Cise Starr & Akin'))
    .toEqual({ title: 'Feather', artist: 'Nujabes, Cise Starr & Akin from CYNE', extra: null });
});

test('merges feat info with "from" suffix', () => {
  expect(parseSongTitle('Track (feat. John from Band)', 'Artist, John'))
    .toEqual({ title: 'Track', artist: 'Artist, John from Band', extra: null });
});

test('handles "with" pattern when artists overlap', () => {
  expect(parseSongTitle('STILL IN THE PAINT (with LAZER DIM 700 & Bktherula)', 'Denzel Curry, LAZER DIM 700, Bktherula'))
    .toEqual({ title: 'STILL IN THE PAINT', artist: 'Denzel Curry, LAZER DIM 700, Bktherula', extra: null });
});

console.log('\nFeatured artists - no overlap:');
test('keeps feat as extra when artist not in existing', () => {
  expect(parseSongTitle('Feather (feat. Bill)', 'Nujabes, Cise Starr & Akin'))
    .toEqual({ title: 'Feather', artist: 'Nujabes, Cise Starr & Akin', extra: 'feat. Bill' });
});

test('keeps feat as extra with multiple new artists', () => {
  expect(parseSongTitle('Song (feat. Alice & Bob)', 'Main Artist'))
    .toEqual({ title: 'Song', artist: 'Main Artist', extra: 'feat. Alice & Bob' });
});

test('handles ft. abbreviation', () => {
  expect(parseSongTitle('Track (ft. Someone)', 'Artist'))
    .toEqual({ title: 'Track', artist: 'Artist', extra: 'feat. Someone' });
});

test('handles featuring spelled out', () => {
  expect(parseSongTitle('Track (featuring Someone)', 'Artist'))
    .toEqual({ title: 'Track', artist: 'Artist', extra: 'feat. Someone' });
});

test('handles "with" pattern when artists dont overlap', () => {
  expect(parseSongTitle('Song (with Unknown Artist)', 'Main Artist'))
    .toEqual({ title: 'Song', artist: 'Main Artist', extra: 'with Unknown Artist' });
});

console.log('\nNo modifications needed:');
test('returns original when no special patterns', () => {
  expect(parseSongTitle('Simple Song Title', 'Simple Artist'))
    .toEqual({ title: 'Simple Song Title', artist: 'Simple Artist', extra: null });
});

test('preserves parenthetical that is not extra info', () => {
  expect(parseSongTitle('Song (Part 1)', 'Artist'))
    .toEqual({ title: 'Song (Part 1)', artist: 'Artist', extra: null });
});

console.log('\nEdge cases:');
test('handles empty strings', () => {
  expect(parseSongTitle('', ''))
    .toEqual({ title: '', artist: '', extra: null });
});

test('handles whitespace', () => {
  expect(parseSongTitle('  Song Title  ', '  Artist Name  '))
    .toEqual({ title: 'Song Title', artist: 'Artist Name', extra: null });
});

test('handles radio edit', () => {
  expect(parseSongTitle('Song (Radio Edit)', 'Artist'))
    .toEqual({ title: 'Song', artist: 'Artist', extra: 'Radio Edit' });
});

test('handles extended mix', () => {
  expect(parseSongTitle('Track (Extended Mix)', 'DJ'))
    .toEqual({ title: 'Track', artist: 'DJ', extra: 'Extended Mix' });
});

test('handles demo version', () => {
  expect(parseSongTitle('Unreleased (Demo)', 'Band'))
    .toEqual({ title: 'Unreleased', artist: 'Band', extra: 'Demo' });
});

// Summary
console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
