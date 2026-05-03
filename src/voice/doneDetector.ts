export type DoneDetector = (text: string) => boolean;

const DEFAULT_PATTERNS: readonly RegExp[] = [
  /\bdone\b/i,
  /\bsave\b/i,
  /\bthat'?s it\b/i,
  /\bfinish(?:ed)?\b/i,
  /\bend\b/i,
];

export const defaultDoneDetector: DoneDetector = (text: string) => {
  if (!text) {
    return false;
  }
  for (const pattern of DEFAULT_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
};

export function makeDoneDetector(patterns: readonly RegExp[]): DoneDetector {
  return (text) => {
    if (!text) {
      return false;
    }
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  };
}
