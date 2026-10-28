export interface CharStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  utf8Bytes: number;
}

export function computeCharStats(text: string): CharStats {
  const characters = [...text].length; // code points, not UTF-16 units
  const charactersNoSpaces = [...text.replace(/\s/g, '')].length;
  const trimmed = text.trim();
  const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter(Boolean).length;
  // Empty string → 0 lines; otherwise count newline separators + 1
  const lines = text.length === 0 ? 0 : text.split(/\r\n|\n|\r/).length;
  const utf8Bytes = new TextEncoder().encode(text).length;
  return { characters, charactersNoSpaces, words, lines, utf8Bytes };
}
