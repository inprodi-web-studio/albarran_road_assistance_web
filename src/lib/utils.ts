import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
  Agent,
  Coordinates,
  OrderStage,
  RequestStatus,
  ServiceType,
} from "@/lib/types";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const serviceLabels: Record<ServiceType, string> = {
  tire: "Llanta",
  battery: "Bateria",
  crane: "Grua",
};

export const requestStatusLabels: Record<Exclude<RequestStatus, "all">, string> =
  {
    pending: "Pendiente",
    approved: "Aprobada",
    converted: "Orden creada",
    rejected: "Rechazada",
  };

export const orderStageLabels: Record<Exclude<OrderStage, "all">, string> = {
  opened: "Abierta",
  queued: "En espera",
  cancelled: "Cancelada",
  completed: "Completada",
};

export const getServiceLabel = (service?: ServiceType) =>
  service ? serviceLabels[service] : "Sin servicio";

export const formatDate = (value?: string | null) => {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
};

export const formatPersonName = (person?: Agent | null) => {
  const fullName = [person?.name, person?.lastName].filter(Boolean).join(" ");
  return fullName || person?.email || "Sin asignar";
};

export const parseCoordinates = (location?: Coordinates | null) => {
  if (!location) {
    return null;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

export const googleMapsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
