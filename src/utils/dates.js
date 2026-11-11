export const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
export const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function weekdayIndex(date) {
  return (date.getDay() + 6) % 7;
}

export function todayWeekday() {
  return weekdayIndex(new Date());
}

export function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfWeek(date) {
  return addDays(date, -weekdayIndex(date));
}

export function dateOfWeekday(dayIndex) {
  return addDays(startOfWeek(new Date()), dayIndex);
}

export function toIsoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseIsoDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isIsoDate(text) {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  return toIsoDate(parseIsoDate(text)) === text;
}

export function daysBetween(fromDate, toDate) {
  return Math.round((toDate - fromDate) / MS_PER_DAY);
}

export function todayIso() {
  return toIsoDate(new Date());
}

export function currentClockTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
