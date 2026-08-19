import { Copy, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ScheduleDay, ScheduleSlot, WeekDay } from "@/lib/types";
import {
  cloneSchedule,
  ensureFullSchedule,
  isSlotCoveredBySchedule,
  weekDayLabels,
  weekDays,
} from "@/lib/schedule";

type WeeklyScheduleEditorProps = {
  disabled?: boolean;
  globalSchedule?: ScheduleDay[];
  onChange: (schedule: ScheduleDay[]) => void;
  value: ScheduleDay[];
};

const defaultSlot: ScheduleSlot = { startTime: "09:00", endTime: "17:00" };

export const WeeklyScheduleEditor = ({
  disabled,
  globalSchedule,
  onChange,
  value,
}: WeeklyScheduleEditorProps) => {
  const schedule = ensureFullSchedule(value);

  const replaceDay = (day: WeekDay, nextDay: ScheduleDay) => {
    onChange(schedule.map((entry) => (entry.day === day ? nextDay : entry)));
  };

  const copyMonday = (targetDays: WeekDay[]) => {
    const monday = schedule[0];
    onChange(
      schedule.map((entry) =>
        targetDays.includes(entry.day)
          ? { ...cloneSchedule([monday])[0], day: entry.day }
          : entry,
      ),
    );
  };

  return (
    <div className="overflow-hidden rounded-md border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
        <p className="text-sm font-medium">Horario semanal</p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={disabled}
            onClick={() => copyMonday(["tuesday", "wednesday", "thursday", "friday"])}
            size="sm"
            type="button"
            variant="outline"
          >
            <Copy className="h-4 w-4" />
            Lunes a laborales
          </Button>
          <Button
            disabled={disabled}
            onClick={() => copyMonday(weekDays.slice(1))}
            size="sm"
            type="button"
            variant="outline"
          >
            <Copy className="h-4 w-4" />
            Lunes a toda la semana
          </Button>
        </div>
      </div>

      <div className="divide-y">
        {schedule.map((entry) => {
          const enabled = entry.allDay || entry.slots.length > 0;
          const outsideGlobal = globalSchedule
            ? entry.allDay
              ? !isSlotCoveredBySchedule(entry.day, null, globalSchedule)
              : entry.slots.some(
                  (slot) => !isSlotCoveredBySchedule(entry.day, slot, globalSchedule),
                )
            : false;

          return (
            <section className="grid gap-3 px-3 py-3" key={entry.day}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    checked={enabled}
                    disabled={disabled}
                    onChange={(event) =>
                      replaceDay(entry.day, event.target.checked
                        ? { ...entry, allDay: false, slots: [{ ...defaultSlot }] }
                        : { ...entry, allDay: false, slots: [] })
                    }
                    type="checkbox"
                  />
                  {weekDayLabels[entry.day]}
                </label>
                <div className="flex items-center gap-2">
                  {outsideGlobal ? <Badge variant="warning">Fuera del horario global</Badge> : null}
                  {enabled ? (
                    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <input
                        checked={entry.allDay}
                        disabled={disabled}
                        onChange={(event) =>
                          replaceDay(entry.day, {
                            ...entry,
                            allDay: event.target.checked,
                            slots: event.target.checked
                              ? []
                              : entry.slots.length
                                ? entry.slots
                                : [{ ...defaultSlot }],
                          })
                        }
                        type="checkbox"
                      />
                      24 horas
                    </label>
                  ) : null}
                </div>
              </div>

              {enabled && !entry.allDay ? (
                <div className="grid gap-2 sm:pl-6">
                  {entry.slots.map((slot, slotIndex) => (
                    <div
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2"
                      key={`${entry.day}-${slotIndex}`}
                    >
                      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Inicio
                        <Input
                          disabled={disabled}
                          onChange={(event) => {
                            const slots = entry.slots.map((current, index) =>
                              index === slotIndex
                                ? { ...current, startTime: event.target.value }
                                : current,
                            );
                            replaceDay(entry.day, { ...entry, slots });
                          }}
                          step={900}
                          type="time"
                          value={slot.startTime}
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Fin
                        <Input
                          disabled={disabled}
                          onChange={(event) => {
                            const slots = entry.slots.map((current, index) =>
                              index === slotIndex
                                ? { ...current, endTime: event.target.value }
                                : current,
                            );
                            replaceDay(entry.day, { ...entry, slots });
                          }}
                          step={900}
                          type="time"
                          value={slot.endTime}
                        />
                      </label>
                      <Button
                        aria-label={`Eliminar bloque de ${weekDayLabels[entry.day]}`}
                        disabled={disabled}
                        onClick={() =>
                          replaceDay(entry.day, {
                            ...entry,
                            slots: entry.slots.filter((_, index) => index !== slotIndex),
                          })
                        }
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    className="justify-self-start"
                    disabled={disabled}
                    onClick={() =>
                      replaceDay(entry.day, {
                        ...entry,
                        slots: [...entry.slots, { ...defaultSlot }],
                      })
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar bloque
                  </Button>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
};
