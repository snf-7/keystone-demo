import { SKILL_VOCABULARY } from '../db/skillVocabulary.js';

/**
 * STUB — MOCK DATA. Replace with the real extractor (no LLM calls yet).
 * MOCK: any known skill name found verbatim in the text, level 3.
 */
export function extractSkills(jobDescription: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const skill of SKILL_VOCABULARY) if (jobDescription.includes(skill)) out[skill] = 3;
  return out;
}
