import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, ImagePlus, Loader2, Trash2, UserRound } from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { ServiceSelector } from "@/components/ServiceSelector";
import { WeeklyScheduleEditor } from "@/components/WeeklyScheduleEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getErrorMessage,
  useCreateAgentMutation,
  useDeleteAgentMutation,
  useGetScheduleSettingsQuery,
  useUpdateAgentMutation,
} from "@/lib/api";
import { cloneSchedule, ensureFullSchedule, getScheduleError } from "@/lib/schedule";
import type { Agent, AgentPhoto, ScheduleDay, ServiceType } from "@/lib/types";
import { cn, formatPersonName } from "@/lib/utils";

const maxPhotoSizeBytes = 5 * 1024 * 1024;
const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type ProfileForm = {
  name: string;
  middleName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
};

const emptyProfile: ProfileForm = {
  name: "",
  middleName: "",
  lastName: "",
  phone: "",
  email: "",
  password: "",
};

const getPhotoError = (file: File) => {
  if (!allowedPhotoTypes.has(file.type)) {
    return "La foto debe ser JPG, PNG o WEBP.";
  }

  return file.size > maxPhotoSizeBytes
    ? "La foto no puede pesar mas de 5 MB."
    : null;
};

const PhotoField = ({
  currentPhoto,
  disabled,
  name,
  onChange,
  onRemove,
  removed,
  selectedPhoto,
}: {
  currentPhoto?: AgentPhoto | null;
  disabled: boolean;
  name: string;
  onChange: (file: File) => void;
  onRemove: () => void;
  removed: boolean;
  selectedPhoto: File | null;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPhoto) {
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(selectedPhoto);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedPhoto]);

  const visiblePhoto = removed
    ? null
    : previewUrl
      ? { url: previewUrl, alternativeText: `Foto de ${name}` }
      : currentPhoto;

  return (
    <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      <AgentAvatar className="h-20 w-20" name={name} photo={visiblePhoto} />
      <div className="grid min-w-0 gap-2">
        <p className="text-sm font-medium">Foto del agente</p>
        <Input
          accept="image/jpeg,image/png,image/webp"
          aria-label="Foto del agente"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onChange(file);
          }}
          ref={inputRef}
          type="file"
        />
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            size="sm"
            type="button"
            variant="outline"
          >
            <ImagePlus className="h-4 w-4" />
            {visiblePhoto ? "Cambiar foto" : "Seleccionar foto"}
          </Button>
          {selectedPhoto ? (
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {selectedPhoto.name}
            </span>
          ) : null}
          {visiblePhoto ? (
            <Button disabled={disabled} onClick={onRemove} size="sm" type="button" variant="ghost">
              <Trash2 className="h-4 w-4" /> Quitar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const AgentFormDialog = ({
  agent,
  onClose,
  open,
}: {
  agent: Agent | null;
  onClose: () => void;
  open: boolean;
}) => {
  const editing = Boolean(agent);
  const { data: settings, isLoading: isLoadingSettings } = useGetScheduleSettingsQuery();
  const [createAgent, { isLoading: isCreating }] = useCreateAgentMutation();
  const [updateAgent, { isLoading: isUpdating }] = useUpdateAgentMutation();
  const [deleteAgent, { isLoading: isDeleting }] = useDeleteAgentMutation();
  const [tab, setTab] = useState<"profile" | "availability">("profile");
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = isCreating || isUpdating || isDeleting;

  useEffect(() => {
    if (!open || !settings) return;

    setProfile(agent ? {
      name: agent.name ?? "",
      middleName: agent.middleName ?? "",
      lastName: agent.lastName ?? "",
      phone: agent.phone ?? "",
      email: agent.email ?? "",
      password: "",
    } : emptyProfile);
    setSchedule(cloneSchedule(ensureFullSchedule(agent?.workSchedule ?? settings.schedule)));
    setServices(agent?.services ? [...agent.services] : settings.services.map((service) => service.key));
    setPhoto(null);
    setRemovePhoto(false);
    setDeleteConfirmation(false);
    setError(null);
    setTab("profile");
  }, [agent, open, settings]);

  const scheduleError = useMemo(() => getScheduleError(schedule), [schedule]);
  const displayName = [profile.name, profile.lastName].filter(Boolean).join(" ") || "agente";

  const updateProfile = (key: keyof ProfileForm, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (scheduleError) {
      setTab("availability");
      setError(scheduleError);
      return;
    }

    const body = new FormData();
    body.append("name", profile.name.trim());
    body.append("middleName", profile.middleName.trim());
    body.append("lastName", profile.lastName.trim());
    body.append("phone", profile.phone.trim());
    body.append("email", profile.email.trim().toLowerCase());
    if (!editing) body.append("password", profile.password);
    body.append("workSchedule", JSON.stringify(schedule));
    body.append("services", JSON.stringify(services));
    if (photo) body.append("photo", photo);
    if (removePhoto) body.append("removePhoto", "true");

    try {
      if (agent) {
        await updateAgent({ id: agent.id, body }).unwrap();
      } else {
        await createAgent(body).unwrap();
      }
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const onDelete = async () => {
    if (!agent) return;
    setError(null);
    try {
      await deleteAgent(agent.id).unwrap();
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar agente" : "Nuevo agente"}</DialogTitle>
          <DialogDescription>
            {editing
              ? `Actualiza el perfil y la disponibilidad de ${formatPersonName(agent)}.`
              : "Configura el acceso, horario y servicios que puede atender."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 rounded-md bg-muted p-1">
          <Button
            className={cn("h-9", tab === "profile" && "bg-white shadow-sm hover:bg-white")}
            onClick={() => setTab("profile")}
            type="button"
            variant="ghost"
          >
            <UserRound className="h-4 w-4" /> Perfil
          </Button>
          <Button
            className={cn("h-9", tab === "availability" && "bg-white shadow-sm hover:bg-white")}
            onClick={() => setTab("availability")}
            type="button"
            variant="ghost"
          >
            <CalendarClock className="h-4 w-4" /> Disponibilidad
          </Button>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          {isLoadingSettings ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando disponibilidad...
            </div>
          ) : tab === "profile" ? (
            <div className="grid gap-4">
              <PhotoField
                currentPhoto={agent?.photo}
                disabled={busy}
                name={displayName}
                onChange={(file) => {
                  const photoError = getPhotoError(file);
                  if (photoError) {
                    setError(photoError);
                    return;
                  }
                  setError(null);
                  setPhoto(file);
                  setRemovePhoto(false);
                }}
                onRemove={() => {
                  setPhoto(null);
                  setRemovePhoto(Boolean(agent?.photo));
                }}
                removed={removePhoto}
                selectedPhoto={photo}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">Nombre<Input required value={profile.name} onChange={(event) => updateProfile("name", event.target.value)} /></label>
                <label className="grid gap-2 text-sm font-medium">Segundo nombre<Input value={profile.middleName} onChange={(event) => updateProfile("middleName", event.target.value)} /></label>
                <label className="grid gap-2 text-sm font-medium">Apellido<Input required value={profile.lastName} onChange={(event) => updateProfile("lastName", event.target.value)} /></label>
                <label className="grid gap-2 text-sm font-medium">Telefono<Input autoComplete="tel" type="tel" value={profile.phone} onChange={(event) => updateProfile("phone", event.target.value)} /></label>
                <label className="grid gap-2 text-sm font-medium sm:col-span-2">Correo<Input autoComplete="email" required type="email" value={profile.email} onChange={(event) => updateProfile("email", event.target.value)} /></label>
                {!editing ? (
                  <label className="grid gap-2 text-sm font-medium sm:col-span-2">Contrasena<Input autoComplete="new-password" minLength={6} required type="password" value={profile.password} onChange={(event) => updateProfile("password", event.target.value)} /></label>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <ServiceSelector
                disabled={busy}
                onChange={setServices}
                options={settings?.services ?? []}
                value={services}
              />
              <WeeklyScheduleEditor
                disabled={busy}
                globalSchedule={settings?.schedule}
                onChange={setSchedule}
                value={schedule}
              />
              <p className="text-xs text-muted-foreground">
                Las asignaciones automaticas requieren coincidir con el horario global, este horario y los servicios seleccionados.
              </p>
            </div>
          )}

          {error || scheduleError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error || scheduleError}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div>
              {agent ? (
                agent.isBusy ? (
                  <p className="text-xs text-muted-foreground">No puede eliminarse mientras tenga ordenes activas o en cola.</p>
                ) : deleteConfirmation ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-destructive">Esta accion no se puede deshacer.</span>
                    <Button disabled={busy} onClick={onDelete} size="sm" type="button" variant="destructive">
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Eliminar definitivamente
                    </Button>
                    <Button disabled={busy} onClick={() => setDeleteConfirmation(false)} size="sm" type="button" variant="ghost">Cancelar</Button>
                  </div>
                ) : (
                  <Button disabled={busy} onClick={() => setDeleteConfirmation(true)} size="sm" type="button" variant="ghost">
                    <Trash2 className="h-4 w-4 text-destructive" /> Eliminar agente
                  </Button>
                )
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={onClose} type="button" variant="outline">Cerrar</Button>
              <Button disabled={busy || isLoadingSettings || Boolean(scheduleError)} type="submit">
                {isCreating || isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing ? "Guardar cambios" : "Dar de alta"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
