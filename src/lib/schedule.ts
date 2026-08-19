import type { ScheduleDay, ScheduleSlot, WeekDay } from "@/lib/types";

export const weekDays: WeekDay[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const weekDayLabels: Record<WeekDay, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miercoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sabado",
  sunday: "Domingo",
};

const minutesPerDay = 24 * 60;
const minutesPerWeek = 7 * minutesPerDay;

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const cloneSchedule = (schedule: ScheduleDay[]) =>
  schedule.map((entry) => ({
    ...entry,
    slots: entry.slots.map((slot) => ({ ...slot })),
  }));

export const ensureFullSchedule = (schedule?: ScheduleDay[] | null) => {
  const byDay = new Map((schedule || []).map((entry) => [entry.day, entry]));

  return weekDays.map((day) => {
    const entry = byDay.get(day);
    return entry
      ? { ...entry, slots: entry.slots.map((slot) => ({ ...slot })) }
      : { day, allDay: false, slots: [] };
  });
};

const buildOccupancy = (schedule: ScheduleDay[]) => {
  const occupancy = new Uint8Array(minutesPerWeek);
  let overlap = false;

  ensureFullSchedule(schedule).forEach((entry, dayIndex) => {
    const intervals = entry.allDay
      ? [{ start: 0, end: minutesPerDay }]
      : entry.slots.map((slot) => {
          const start = toMinutes(slot.startTime);
          const end = toMinutes(slot.endTime);
          return { start, end: end > start ? end : end + minutesPerDay };
        });

    intervals.forEach((interval) => {
      for (
        let minute = dayIndex * minutesPerDay + interval.start;
        minute < dayIndex * minutesPerDay + interval.end;
        minute += 1
      ) {
        const weekMinute = minute % minutesPerWeek;
        if (occupancy[weekMinute]) {
          overlap = true;
        }
        occupancy[weekMinute] = 1;
      }
    });
  });

  return { occupancy, overlap };
};

export const getScheduleError = (schedule: ScheduleDay[]) => {
  const entries = ensureFullSchedule(schedule);

  for (const entry of entries) {
    for (const slot of entry.slots) {
      if (!/^\d{2}:\d{2}$/.test(slot.startTime) || !/^\d{2}:\d{2}$/.test(slot.endTime)) {
        return `${weekDayLabels[entry.day]} tiene una hora incompleta.`;
      }

      if (slot.startTime === slot.endTime) {
        return `${weekDayLabels[entry.day]} tiene un bloque con inicio y fin iguales.`;
      }

      if (toMinutes(slot.startTime) % 15 !== 0 || toMinutes(slot.endTime) % 15 !== 0) {
        return "Los horarios deben usar intervalos de 15 minutos.";
      }
    }
  }

  return buildOccupancy(entries).overlap
    ? "Existen bloques superpuestos, incluyendo cruces entre dias."
    : null;
};

export const isSlotCoveredBySchedule = (
  day: WeekDay,
  slot: ScheduleSlot | null,
  schedule: ScheduleDay[],
) => {
  const { occupancy } = buildOccupancy(schedule);
  const dayIndex = weekDays.indexOf(day);
  const start = slot ? toMinutes(slot.startTime) : 0;
  const rawEnd = slot ? toMinutes(slot.endTime) : minutesPerDay;
  const end = slot && rawEnd <= start ? rawEnd + minutesPerDay : rawEnd;

  for (
    let minute = dayIndex * minutesPerDay + start;
    minute < dayIndex * minutesPerDay + end;
    minute += 1
  ) {
    if (!occupancy[minute % minutesPerWeek]) {
      return false;
    }
  }

  return true;
};

export const getScheduleSummary = (schedule?: ScheduleDay[]) => {
  const entries = ensureFullSchedule(schedule);
  const activeDays = entries.filter((entry) => entry.allDay || entry.slots.length > 0);

  if (activeDays.length === 0) {
    return "Sin horario";
  }

  if (activeDays.every((entry) => entry.allDay)) {
    return "Todos los dias, 24 horas";
  }

  return `${activeDays.length} de 7 dias`;
};
