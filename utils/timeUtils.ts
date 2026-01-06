
import { VALID_WORKING_DAYS, OFFICE_HOURS_START, OFFICE_HOURS_END } from '../constants';

/**
 * Calculates elapsed hours between two dates, considering only:
 * - Working days: Saturday to Thursday (Friday excluded)
 * - Office hours: 9:00 AM to 6:00 PM
 */
export const calculateElapsedHours = (startDateStr: string, endDateStr: string): number => {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  if (start >= end) return 0;

  let totalMilliseconds = 0;
  let current = new Date(start);

  while (current < end) {
    const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const isWorkingDay = VALID_WORKING_DAYS.includes(dayOfWeek);

    if (isWorkingDay) {
      // Create bounds for office hours on the current day
      const dayStart = new Date(current);
      dayStart.setHours(OFFICE_HOURS_START, 0, 0, 0);
      
      const dayEnd = new Date(current);
      dayEnd.setHours(OFFICE_HOURS_END, 0, 0, 0);

      // Intersection of [current, end] and [dayStart, dayEnd]
      const actualStart = current > dayStart ? current : dayStart;
      const actualEnd = end < dayEnd ? end : dayEnd;

      if (actualStart < actualEnd) {
        totalMilliseconds += actualEnd.getTime() - actualStart.getTime();
      }
    }

    // Move to next day 9:00 AM
    current.setDate(current.getDate() + 1);
    current.setHours(OFFICE_HOURS_START, 0, 0, 0);
  }

  return Math.max(0, parseFloat((totalMilliseconds / (1000 * 60 * 60)).toFixed(2)));
};
