/**
 * Search normalization utilities for consistent searching across the app
 * Handles special characters, apostrophes, diacritics, etc.
 */

const SEARCH_CHAR_FOLD_MAP: Record<string, string> = {
  ı: "i",
  İ: "i",
  ə: "e",
  Ə: "e",
  æ: "ae",
  Æ: "ae",
  œ: "oe",
  Œ: "oe",
  ø: "o",
  Ø: "o",
  đ: "d",
  Đ: "d",
  ł: "l",
  Ł: "l",
  þ: "th",
  Þ: "th",
  ð: "d",
  Ð: "d",
  ß: "ss",
};

/**
 * Folds special international characters to ASCII equivalents
 * Example: "Café" -> "cafe", "L'immensite" -> "L'immensite" (apostrophe preserved)
 */
export function foldSearchCharacters(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[ıİəƏæÆœŒøØđĐłŁþÞðÐß]/g, (char) => SEARCH_CHAR_FOLD_MAP[char] ?? char)
    .toLowerCase();
}

/**
 * Normalizes search text for consistent matching
 * - Folds special characters (ə→e, ı→i, etc.)
 * - Removes most punctuation EXCEPT apostrophes (preserves "L'immensite" style names)
 * - Collapses multiple spaces
 * - Trims whitespace
 */
export function normalizeSearchText(value: string): string {
  return foldSearchCharacters(value)
    // Remove punctuation but KEEP apostrophes for compound words like "L'immensite"
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
    // Replace apostrophes with nothing (removes them but doesn't add spaces)
    .replace(/[']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenizes normalized search text into individual search terms
 */
export function tokenizeSearch(normalizedText: string): string[] {
  return normalizedText
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

/**
 * Checks if all search tokens exist in the haystack
 */
export function matchesAllTokens(haystack: string, tokens: string[]): boolean {
  return tokens.length === 0 || tokens.every((token) => haystack.includes(token));
}

/**
 * Quick check if normalized query matches normalized haystack text
 */
export function searchMatches(query: string, haystack: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedHaystack = normalizeSearchText(haystack);
  const tokens = tokenizeSearch(normalizedQuery);
  return matchesAllTokens(normalizedHaystack, tokens);
}
