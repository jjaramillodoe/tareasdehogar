/** Mon=0 … Sun=6 local dates with at least one approved task. */
export function weekDoneFromDates(isoDates: string[]): boolean[] {
  const flags = [false, false, false, false, false, false, false];
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  for (const raw of isoDates) {
    const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
    if (Number.isNaN(d.getTime()) || d < monday || d > sunday) continue;
    flags[(d.getDay() + 6) % 7] = true;
  }
  return flags;
}

export function localDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
