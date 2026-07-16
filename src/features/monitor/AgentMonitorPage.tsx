import { useMemo } from "react";
import { Activity, Loader2, MapPin, RefreshCw, Route, Users } from "lucide-react";
import { MapPanel, type MapPoint } from "@/components/MapPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetAgentMonitorQuery } from "@/lib/api";
import type { AgentMonitor, AgentMonitorOrder } from "@/lib/types";
import { formatDate, formatPersonName, getServiceLabel } from "@/lib/utils";

const getMarkerColor = (agent: AgentMonitor) => {
  if (agent.blocked) {
    return "#71717a";
  }

  if (agent.isBusy) {
    return "#ea580c";
  }

  return agent.locationStatus === "current" ? "#16a34a" : "#a1a1aa";
};

const getLocationLabel = (agent: AgentMonitor) => {
  if (agent.locationStatus === "current") {
    return { label: "Activo", variant: "success" as const };
  }

  if (agent.locationStatus === "stale") {
    return { label: "Inactivo", variant: "warning" as const };
  }

  return { label: "Sin ubicacion", variant: "neutral" as const };
};

const getWorkStatus = (agent: AgentMonitor) => {
  if (agent.blocked) {
    return { label: "Bloqueado", variant: "danger" as const };
  }

  return agent.isBusy
    ? { label: "Ocupado", variant: "warning" as const }
    : { label: "Disponible", variant: "success" as const };
};

const getOrderLabel = (order?: AgentMonitorOrder | null) => {
  if (!order) {
    return "Sin orden asignada";
  }

  return `Orden #${order.documentId || order.id} · ${getServiceLabel(order.service)}`;
};

const getSortWeight = (agent: AgentMonitor) => {
  if (agent.isBusy && agent.locationStatus === "current") {
    return 0;
  }

  if (agent.locationStatus === "current") {
    return 1;
  }

  if (agent.isBusy) {
    return 2;
  }

  return 3;
};

export const AgentMonitorPage = () => {
  const { data, error, isFetching, isLoading, refetch } = useGetAgentMonitorQuery(
    undefined,
    { pollingInterval: 15000 },
  );
  const agents = data?.data ?? [];
  const orderedAgents = useMemo(
    () => [...agents].sort((left, right) =>
      getSortWeight(left) - getSortWeight(right) ||
      formatPersonName(left).localeCompare(formatPersonName(right), "es"),
    ),
    [agents],
  );
  const mapPoints = useMemo<MapPoint[]>(() =>
    orderedAgents.flatMap((agent, index) => {
      if (!agent.agentLocation) {
        return [];
      }

      return [{
        id: String(agent.id),
        label: `${formatPersonName(agent)} · ${getOrderLabel(agent.activeOrder)}`,
        latitude: agent.agentLocation.latitude,
        longitude: agent.agentLocation.longitude,
        markerColor: getMarkerColor(agent),
        markerLabel: String(index + 1),
      }];
    }),
    [orderedAgents],
  );
  const activeAgents = agents.filter((agent) => agent.locationStatus === "current").length;
  const busyAgents = agents.filter((agent) => agent.isBusy).length;
  const queuedOrders = agents.reduce(
    (total, agent) => total + agent.queuedOrders.length,
    0,
  );

  return (
    <section className="relative h-full overflow-hidden bg-zinc-100">
      <MapPanel
        className="h-full min-h-0 rounded-none border-0"
        connectPoints={false}
        fullscreenControl
        points={mapPoints}
      />

      <div className="absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-3">
        <div className="border bg-white/95 px-4 py-3 shadow-soft backdrop-blur">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h1 className="text-base font-semibold">Mapa de agentes</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeAgents} activos con ubicacion de {agents.length} agentes
          </p>
        </div>
        <Button onClick={() => refetch()} size="sm" variant="outline">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualizar
        </Button>
      </div>

      <div className="absolute left-3 right-3 top-24 z-10 grid grid-cols-3 divide-x border bg-white/95 shadow-soft backdrop-blur md:left-3 md:right-auto md:top-24 md:w-72">
        <div className="p-3">
          <p className="text-xs text-muted-foreground">Activos</p>
          <p className="mt-1 text-lg font-semibold">{activeAgents}</p>
        </div>
        <div className="p-3">
          <p className="text-xs text-muted-foreground">Ocupados</p>
          <p className="mt-1 text-lg font-semibold">{busyAgents}</p>
        </div>
        <div className="p-3">
          <p className="text-xs text-muted-foreground">En cola</p>
          <p className="mt-1 text-lg font-semibold">{queuedOrders}</p>
        </div>
      </div>

      <aside className="absolute bottom-3 left-3 right-3 z-10 max-h-[42%] overflow-y-auto border bg-white/95 shadow-soft backdrop-blur md:bottom-3 md:left-auto md:right-3 md:top-3 md:max-h-none md:w-[22rem]">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Agentes</h2>
          </div>
          <span className="text-xs text-muted-foreground">{agents.length}</span>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando ubicaciones...
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-destructive">
            No se pudo cargar el monitoreo de agentes.
          </div>
        ) : orderedAgents.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            No hay agentes registrados.
          </div>
        ) : (
          <div className="divide-y">
            {orderedAgents.map((agent, index) => {
              const location = getLocationLabel(agent);
              const work = getWorkStatus(agent);
              const currentOrNextOrder = agent.activeOrder || agent.queuedOrders[0];

              return (
                <article className="grid gap-2 px-4 py-3" key={agent.id}>
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: getMarkerColor(agent) }}
                      >
                        {agent.agentLocation ? index + 1 : "-"}
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">{formatPersonName(agent)}</h3>
                        <p className="truncate text-xs text-muted-foreground">{agent.email || "Sin correo"}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Badge variant={location.variant}>{location.label}</Badge>
                      <Badge variant={work.variant}>{work.label}</Badge>
                    </div>
                  </div>

                  <div className="grid gap-1 pl-8 text-xs text-muted-foreground">
                    <p className="flex min-w-0 items-center gap-1.5">
                      <Route className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{getOrderLabel(currentOrNextOrder)}</span>
                    </p>
                    {agent.activeOrder ? (
                      <p>Atendiendo ahora</p>
                    ) : agent.queuedOrders.length > 0 ? (
                      <p>Siguiente en cola · {agent.queuedOrders.length} pendiente(s)</p>
                    ) : null}
                    {agent.agentLocation?.updatedAt ? (
                      <p className="flex min-w-0 items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{formatDate(agent.agentLocation.updatedAt)}</span>
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </aside>
    </section>
  );
};
