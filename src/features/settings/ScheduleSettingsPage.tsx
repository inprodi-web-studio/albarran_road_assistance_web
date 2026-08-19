import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock3, Loader2, RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WeeklyScheduleEditor } from "@/components/WeeklyScheduleEditor";
import {
  getErrorMessage,
  useGetScheduleSettingsQuery,
  useUpdateScheduleSettingsMutation,
} from "@/lib/api";
import { cloneSchedule, ensureFullSchedule, getScheduleError } from "@/lib/schedule";
import type { ScheduleDay } from "@/lib/types";

const formatTransition = (value?: string | null) => {
  if (!value) {
    return "Sin cambio programado";
  }

  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
};

export const ScheduleSettingsPage = () => {
  const { data, isFetching, isLoading, refetch } = useGetScheduleSettingsQuery();
  const [updateSchedule, { isLoading: isSaving }] = useUpdateScheduleSettingsMutation();
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmClosed, setConfirmClosed] = useState(false);

  useEffect(() => {
    if (data?.schedule) {
      setSchedule(cloneSchedule(ensureFullSchedule(data.schedule)));
      setConfirmClosed(false);
    }
  }, [data]);

  const scheduleError = useMemo(() => getScheduleError(schedule), [schedule]);
  const isClosed = useMemo(
    () => ensureFullSchedule(schedule).every((entry) => !entry.allDay && entry.slots.length === 0),
    [schedule],
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (scheduleError) {
      setError(scheduleError);
      return;
    }

    if (isClosed && !confirmClosed) {
      setError("Confirma que deseas cerrar completamente el servicio.");
      return;
    }

    try {
      await updateSchedule({ schedule }).unwrap();
      setSuccess("Horario global actualizado.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  if (isLoading) {
    return (
      <div className="admin-panel flex min-h-52 items-center justify-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando configuracion...
      </div>
    );
  }

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Configuracion</h1>
          <p className="text-sm text-muted-foreground">Horario global de servicio</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualizar
        </Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="admin-panel p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Estado actual</p>
          <div className="mt-2">
            <Badge variant={data?.isOpen ? "success" : "danger"}>
              {data?.isOpen ? "Servicio abierto" : "Servicio cerrado"}
            </Badge>
          </div>
        </div>
        <div className="admin-panel p-4 sm:col-span-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Proxima transicion</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium">
            <Clock3 className="h-4 w-4 text-primary" />
            {formatTransition(data?.nextTransitionAt)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">America/Mexico_City</p>
        </div>
      </section>

      <form className="admin-panel grid gap-4 p-4" onSubmit={onSubmit}>
        <div>
          <h2 className="text-base font-semibold">Disponibilidad semanal</h2>
          <p className="text-sm text-muted-foreground">
            Este horario limita todas las asignaciones automaticas.
          </p>
        </div>

        <WeeklyScheduleEditor
          disabled={isSaving}
          onChange={(nextSchedule) => {
            setSchedule(nextSchedule);
            setError(null);
            setSuccess(null);
            setConfirmClosed(false);
          }}
          value={schedule}
        />

        {isClosed ? (
          <label className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <input
              checked={confirmClosed}
              className="mt-0.5"
              onChange={(event) => setConfirmClosed(event.target.checked)}
              type="checkbox"
            />
            Confirmo que el servicio global debe quedar cerrado y sin asignaciones automaticas.
          </label>
        ) : null}

        {scheduleError || error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {scheduleError || error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <div className="flex justify-end border-t pt-4">
          <Button disabled={isSaving || Boolean(scheduleError)} type="submit">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar horario
          </Button>
        </div>
      </form>
    </>
  );
};
