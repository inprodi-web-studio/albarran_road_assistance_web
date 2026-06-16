import { useMemo } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  CarFront,
  Clock3,
  Loader2,
  MapPinned,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPanel } from "@/components/MapPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { useGetPublicOrderQuery } from "@/lib/api";
import type { PublicOrder, PublicOrderAgent } from "@/lib/types";
import {
  formatDate,
  getServiceLabel,
  googleMapsUrl,
  parseCoordinates,
} from "@/lib/utils";

const formatAgentName = (agent?: PublicOrderAgent | null) => {
  const fullName = [agent?.name, agent?.lastName].filter(Boolean).join(" ");
  return fullName || "Agente asignado";
};

type MapPoint = {
  label: string;
  latitude: number;
  longitude: number;
};

const getPhoneHref = (phone?: string) => {
  const normalized = phone?.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : null;
};

const LocationBadge = ({ order }: { order: PublicOrder }) => {
  if (!order.agentLocation) {
    return <Badge variant="neutral">Ubicacion pendiente</Badge>;
  }

  if (order.agentLocation.stale) {
    return <Badge variant="warning">Ultima ubicacion antigua</Badge>;
  }

  return <Badge variant="success">Agente en ruta</Badge>;
};

const PageShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-zinc-50">
    <main className="mx-auto grid min-h-screen w-full max-w-2xl content-start gap-4 px-4 py-5 sm:px-6">
      {children}
    </main>
  </div>
);

const StatePanel = ({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) => (
  <PageShell>
    <section className="admin-panel mt-10 grid gap-4 p-5 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="grid gap-2">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </section>
  </PageShell>
);

export const OrderTrackingPage = () => {
  const { uuid } = useParams();
  const {
    data: order,
    error,
    isFetching,
    isLoading,
    refetch,
  } = useGetPublicOrderQuery(uuid ?? "", {
    pollingInterval: 15000,
    skip: !uuid,
  });

  const customerCoordinates = parseCoordinates(order?.location);
  const phoneHref = getPhoneHref(order?.agent?.phone);

  const mapPoints = useMemo(() => {
    const points: MapPoint[] = [];

    if (order?.agentLocation) {
      points.push({
        label: "Agente",
        latitude: order.agentLocation.latitude,
        longitude: order.agentLocation.longitude,
      });
    }

    if (customerCoordinates) {
      points.push({
        label: "Tu ubicacion",
        latitude: customerCoordinates.latitude,
        longitude: customerCoordinates.longitude,
      });
    }

    return points;
  }, [customerCoordinates, order?.agentLocation]);

  if (isLoading) {
    return (
      <StatePanel
        description="Estamos consultando el estado de tu auxilio."
        icon={<Loader2 className="h-6 w-6 animate-spin" />}
        title="Cargando orden"
      />
    );
  }

  if (!uuid || error || !order) {
    return (
      <StatePanel
        description="La orden no existe o ya no se encuentra abierta."
        icon={<AlertTriangle className="h-6 w-6" />}
        title="Orden no disponible"
      />
    );
  }

  return (
    <PageShell>
      <header className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              alt="Albarran"
              className="h-10 w-28 shrink-0 object-contain sm:w-32"
              src="/albarran-logo.png"
            />
            <div>
              <p className="text-sm font-semibold">Auxilio Vial</p>
              <p className="text-xs text-muted-foreground">
                Orden #{order.id}
              </p>
            </div>
          </div>
          <Button
            aria-label="Actualizar"
            onClick={() => refetch()}
            size="icon"
            variant="outline"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        <section className="admin-panel grid gap-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="order" value={order.stage} />
            <LocationBadge order={order} />
          </div>
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">Tu agente</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <UserRound className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-semibold leading-tight">
                    {formatAgentName(order.agent)}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {order.agentLocation?.estimatedTime || "ETA pendiente"}
                  </p>
                </div>
              </div>
              {phoneHref ? (
                <Button asChild>
                  <a href={phoneHref}>
                    <Phone className="h-4 w-4" />
                    Llamar
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </header>

      <section className="grid gap-3">
        <MapPanel points={mapPoints} />
        {customerCoordinates ? (
          <Button asChild variant="outline">
            <a
              href={googleMapsUrl(
                customerCoordinates.latitude,
                customerCoordinates.longitude,
              )}
              rel="noreferrer"
              target="_blank"
            >
              <MapPinned className="h-4 w-4" />
              Abrir mi ubicacion
            </a>
          </Button>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="admin-panel grid gap-2 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock3 className="h-4 w-4 text-primary" />
            Llegada estimada
          </div>
          <p className="text-2xl font-semibold">
            {order.agentLocation?.estimatedTime || "Sin estimacion"}
          </p>
          <p className="text-xs text-muted-foreground">
            Actualizado:{" "}
            {order.agentLocation?.updatedAt
              ? formatDate(order.agentLocation.updatedAt)
              : "Sin registro"}
          </p>
        </div>

        <div className="admin-panel grid gap-2 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CarFront className="h-4 w-4 text-primary" />
            Servicio
          </div>
          <p className="text-lg font-semibold">
            {getServiceLabel(order.service)}
          </p>
          <p className="text-sm text-muted-foreground">
            {order.subService || "Sin subtipo"}
          </p>
        </div>
      </section>

      <section className="admin-panel grid gap-3 p-4">
        <h2 className="text-base font-semibold">Detalles de la orden</h2>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Cliente</dt>
            <dd className="font-medium">
              {order.customer?.name || "Sin cliente"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Auto</dt>
            <dd className="whitespace-pre-wrap font-medium">
              {order.autoInfo || "Sin informacion"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Creada</dt>
            <dd className="font-medium">{formatDate(order.createdAt)}</dd>
          </div>
        </dl>
      </section>
    </PageShell>
  );
};
