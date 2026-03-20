import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize text for matching by removing accents and converting to lowercase
 * This allows "cafe" to match "café", "arandano" to match "arándano", etc.
 * Keeps ñ as ñ since it's a distinct letter in Spanish (not an accent)
 */
export function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    // Remove combining diacritical marks EXCEPT tilde (U+0303) which makes ñ
    // Range \u0300-\u0302: grave, acute, circumflex
    // Range \u0304-\u030C: macron, breve, dot above, diaeresis, hook, ring, double acute
    // \u0303 is TILDE (for ñ) - we keep it
    .replace(/[\u0300-\u0302\u0304-\u030C\u030E-\u0310\u0312-\u0314\u031A\u031B\u0323-\u0328\u032D-\u0330\u0335-\u0338\u033A\u033B\u0340\u0341\u0358\u035B-\u035D]/g, '')
    .normalize('NFC')
}

/**
 * Create a word boundary regex for normalized matching
 * Uses normalized versions of both the word and the text to match
 */
export function createNormalizedWordBoundaryRegex(word: string): RegExp {
  const normalizedWord = normalizeForMatching(word)
  // Escape special regex characters
  const escapedWord = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escapedWord}\\b`, 'i')
}

/**
 * Check if a text contains a word using normalized matching
 * For single words: uses word boundary matching
 * For multi-word phrases: uses substring matching
 */
export function normalizedWordMatch(text: string, word: string, isMultiWord: boolean): boolean {
  const normalizedText = normalizeForMatching(text)
  const normalizedWord = normalizeForMatching(word)
  
  if (isMultiWord) {
    // For multi-word, check if contains the full phrase
    return normalizedText.includes(normalizedWord)
  } else {
    // For single word, use word boundary matching
    const regex = createNormalizedWordBoundaryRegex(word)
    return regex.test(normalizedText)
  }
}
