
export const OFFICE_HOURS_START = 9; // 9 AM
export const OFFICE_HOURS_END = 18;  // 6 PM
export const WORKING_DAYS = [1, 2, 3, 4, 6, 0]; // Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6 -> Saturday(6) to Thursday(4)
// Correcting: Sat(6), Sun(0), Mon(1), Tue(2), Wed(3), Thu(4). Friday(5) is OFF.
export const VALID_WORKING_DAYS = [6, 0, 1, 2, 3, 4]; 
