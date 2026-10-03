/** "15:34 ET": the time in `timeZone`, 24-hour, followed by a short zone label. */
export function formatClock(date: Date, timeZone: string, label: string): string {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${time} ${label}`;
}
