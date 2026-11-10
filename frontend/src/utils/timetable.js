// The school days. The numbers match the ones the server uses.
export const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

// How tall one minute is. A 40-minute lesson is 70px tall.
// Make this smaller if the calendar feels too tall.
export const PX_PER_MINUTE = 1.75;
export const LESSON_DURATION_MINUTES = 35;

// Solid colours like Google Calendar. A subject always gets the same one,
// because we pick by its id. White text is readable on every one of them.
export const COLORS = [
  "#3f51b5",
  "#0b8043",
  "#d9480f",
  "#8e24aa",
  "#0277bd",
  "#c62828",
  "#2e7d6b",
  "#546e7a",
];

// "08:40:00" becomes 520 (minutes since midnight)
export const toMinutes = (time) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// "08:00:00" becomes "08:00"
export const timeLabel = (time) => time.slice(0, 5);