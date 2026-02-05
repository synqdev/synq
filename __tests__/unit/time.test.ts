/**
 * Time utility functions tests
 *
 * Tests for pure time manipulation functions used by availability service.
 * These functions handle time overlap detection, slot generation, and parsing.
 */
import {
  isOverlapping,
  generateTimeSlots,
  parseTime,
  formatTime,
} from '@/lib/utils/time';

describe('Time Utilities', () => {
  describe('isOverlapping', () => {
    describe('non-overlapping ranges', () => {
      it('returns false when ranges are completely separate', () => {
        // Range 1: 09:00-10:00, Range 2: 11:00-12:00
        expect(isOverlapping('09:00', '10:00', '11:00', '12:00')).toBe(false);
      });

      it('returns false when first range is after second', () => {
        // Range 1: 14:00-15:00, Range 2: 10:00-11:00
        expect(isOverlapping('14:00', '15:00', '10:00', '11:00')).toBe(false);
      });

      it('returns false for adjacent ranges (end equals start)', () => {
        // Range 1: 09:00-10:00, Range 2: 10:00-11:00 (back-to-back, not overlapping)
        expect(isOverlapping('09:00', '10:00', '10:00', '11:00')).toBe(false);
      });

      it('returns false for adjacent ranges (reversed)', () => {
        // Range 1: 10:00-11:00, Range 2: 09:00-10:00
        expect(isOverlapping('10:00', '11:00', '09:00', '10:00')).toBe(false);
      });
    });

    describe('overlapping ranges', () => {
      it('returns true when second range starts during first', () => {
        // Range 1: 09:00-11:00, Range 2: 10:00-12:00
        expect(isOverlapping('09:00', '11:00', '10:00', '12:00')).toBe(true);
      });

      it('returns true when second range ends during first', () => {
        // Range 1: 10:00-12:00, Range 2: 09:00-11:00
        expect(isOverlapping('10:00', '12:00', '09:00', '11:00')).toBe(true);
      });

      it('returns true when first range contains second entirely', () => {
        // Range 1: 09:00-14:00, Range 2: 10:00-12:00
        expect(isOverlapping('09:00', '14:00', '10:00', '12:00')).toBe(true);
      });

      it('returns true when second range contains first entirely', () => {
        // Range 1: 10:00-12:00, Range 2: 09:00-14:00
        expect(isOverlapping('10:00', '12:00', '09:00', '14:00')).toBe(true);
      });

      it('returns true when ranges are identical', () => {
        expect(isOverlapping('10:00', '11:00', '10:00', '11:00')).toBe(true);
      });
    });
  });

  describe('generateTimeSlots', () => {
    it('generates correct slots for 60-minute duration', () => {
      const slots = generateTimeSlots('09:00', '12:00', 60);
      expect(slots).toEqual(['09:00', '10:00', '11:00']);
    });

    it('only returns complete slots (partial slots excluded)', () => {
      // 09:00-10:30 with 60min = only 09:00 (10:00 would end at 11:00 which exceeds 10:30)
      const slots = generateTimeSlots('09:00', '10:30', 60);
      expect(slots).toEqual(['09:00']);
    });

    it('generates correct slots for 30-minute duration', () => {
      const slots = generateTimeSlots('09:00', '11:00', 30);
      expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30']);
    });

    it('returns empty array when no complete slots fit', () => {
      // 09:00-09:30 with 60min = no slots
      const slots = generateTimeSlots('09:00', '09:30', 60);
      expect(slots).toEqual([]);
    });

    it('generates correct slots for 90-minute duration', () => {
      const slots = generateTimeSlots('09:00', '13:00', 90);
      // 09:00 ends at 10:30, 10:30 ends at 12:00, 12:00 ends at 13:30 (exceeds)
      expect(slots).toEqual(['09:00', '10:30']);
    });

    it('handles edge case of exact fit', () => {
      // 09:00-10:00 with 60min = exactly one slot
      const slots = generateTimeSlots('09:00', '10:00', 60);
      expect(slots).toEqual(['09:00']);
    });
  });

  describe('parseTime', () => {
    it('parses standard time format correctly', () => {
      expect(parseTime('09:30')).toEqual({ hours: 9, minutes: 30 });
    });

    it('parses midnight correctly', () => {
      expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 });
    });

    it('parses noon correctly', () => {
      expect(parseTime('12:00')).toEqual({ hours: 12, minutes: 0 });
    });

    it('parses evening time correctly', () => {
      expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 });
    });

    it('parses single digit hour with leading zero', () => {
      expect(parseTime('08:15')).toEqual({ hours: 8, minutes: 15 });
    });
  });

  describe('formatTime', () => {
    it('formats time with leading zeros', () => {
      expect(formatTime(9, 5)).toBe('09:05');
    });

    it('formats double-digit time correctly', () => {
      expect(formatTime(14, 30)).toBe('14:30');
    });

    it('formats midnight correctly', () => {
      expect(formatTime(0, 0)).toBe('00:00');
    });

    it('formats noon correctly', () => {
      expect(formatTime(12, 0)).toBe('12:00');
    });

    it('formats end of day correctly', () => {
      expect(formatTime(23, 59)).toBe('23:59');
    });
  });
});
