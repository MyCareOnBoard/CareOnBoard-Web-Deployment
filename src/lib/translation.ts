/**
 * Voice transcript translation: delegates to authenticated Cloud Function (Gemini).
 */

import { translateToEnglishViaApi } from '@/lib/api/gemini';

/** True when we should call the API to translate to English before Accept. */
export function shouldTranslateToEnglish(detectedLanguage: string | null): boolean {
  if (!detectedLanguage?.trim()) return false;
  const base = detectedLanguage.trim().toLowerCase().split(/[-_]/)[0];
  return base !== 'en';
}

export async function translateToEnglish(
  text: string,
  sourceLanguage?: string | null,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return translateToEnglishViaApi(trimmed, sourceLanguage);
}
