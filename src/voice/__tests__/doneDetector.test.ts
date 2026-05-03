import { defaultDoneDetector, makeDoneDetector } from '../doneDetector';

describe('defaultDoneDetector', () => {
  test.each([
    ['I am done'],
    ['DONE'],
    ['save it'],
    ["that's it"],
    ['thats it'],
    ['finish'],
    ['finished'],
    ['end'],
    ['okay end'],
  ])('returns true for "%s"', (text) => {
    expect(defaultDoneDetector(text)).toBe(true);
  });

  test.each([
    [''],
    ['I caught a 14 inch perch'],
    ['the perch was big'],
    ['saving graces of the morning'],
    ['endeavor'],
    ['finishing line yet'],
  ])('returns false for "%s"', (text) => {
    expect(defaultDoneDetector(text)).toBe(false);
  });

  test('makeDoneDetector accepts custom patterns', () => {
    const detector = makeDoneDetector([/\bcomplete\b/i]);
    expect(detector('this is complete')).toBe(true);
    expect(detector('this is partial')).toBe(false);
  });
});
