import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { MapPanel } from "@/components/MapPanel";
import { StatusBadge } from "@/components/StatusBadge";
import {
  getErrorMessage,
  useCancelOrderMutation,
  useGetAssignmentCandidatesQuery,
  useGetOrderQuery,
  useGetOrdersQuery,
  useReassignOrderMutation,
} from "@/lib/api";
import type { AdminOrder, OrderEventType, OrderStage } from "@/lib/types";
import {
  formatDate,
  formatPersonName,
  getServiceLabel,
  parseCoordinates,
} from "@/lib/utils";

const pageSize = 12;

const stageOptions: { label: string; value: OrderStage }[] = [
  { label: "Abiertas", value: "opened" },
  { label: "En espera", value: "queued" },
  { label: "Completadas", value: "completed" },
  { label: "Canceladas", value: "cancelled" },
  { label: "Todas", value: "all" },
];

const eventLabels: Record<OrderEventType, string> = {
  assigned: "Agente asignado",
  queued: "Orden enviada a cola",
  activated: "Orden activada",
  reassigned: "Orden reasignada",
  completed: "Orden finalizada",
  cancelled: "Orden cancelada",
};

const LocationBadge = ({ order }: { order: AdminOrder }) => {
  if (!order.agentLocation) {
    return <Badge variant="neutral">Sin ubicacion</Badge>;
  }

  if (order.agentLocation.stale) {
    return <Badge variant="warning">Ubicacion antigua</Badge>;
  }

  return <Badge variant="success">En vivo</Badge>;
};

const formatMeters = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Sin registro";
  }

  return value >= 1000 ? `${(value / 1000).toFixed(2)} km` : `${Math.round(value)} m`;
};

const formatBoolean = (value?: boolean | null) => {
  if (value == null) {
    return "Sin registro";
  }

  return value ? "Si" : "No";
};

const Summary = ({ orders }: { orders: AdminOrder[] }) => {
  const activeLocations = orders.filter(
    (order) => order.agentLocation && !order.agentLocation.stale,
  ).length;
  const queued = orders.filter((order) => order.stage === "queued").length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="admin-panel p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">Ordenes</p>
        <p className="mt-2 text-2xl font-semibold">{orders.length}</p>
      </div>
      <div className="admin-panel p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">En espera</p>
        <p className="mt-2 text-2xl font-semibold">{queued}</p>
      </div>
      <div className="admin-panel p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">Agentes ubicados</p>
        <p className="mt-2 text-2xl font-semibold">{activeLocations}</p>
      </div>
      <div className="admin-panel p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">Sin ubicacion</p>
        <p className="mt-2 text-2xl font-semibold">{orders.length - activeLocations}</p>
      </div>
    </div>
  );
};

export const OrdersPage = () => {
  const [stage, setStage] = useState<OrderStage>("opened");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [action, setAction] = useState<"reassign" | "cancel" | null>(null);
  const [assignmentMode, setAssignmentMode] = useState<"automatic" | "manual">("automatic");
  const [agentId, setAgentId] = useState("");
  const [comment, setComment] = useState("");
  const { data, isFetching, isLoading, refetch } = useGetOrdersQuery(
    { stage, page, pageSize },
    { pollingInterval: 15000 },
  );
  const { data: selectedOrder, isFetching: isFetchingDetail } = useGetOrderQuery(
    selectedId ?? 0,
    { pollingInterval: 15000, skip: selectedId == null },
  );
  const { data: candidatesResponse, isFetching: isFetchingCandidates } =
    useGetAssignmentCandidatesQuery(selectedId ?? 0, {
      skip: selectedId == null || action !== "reassign",
    });
  const [reassignOrder, { isLoading: isReassigning }] = useReassignOrderMutation();
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();
  const [actionError, setActionError] = useState<string | null>(null);

  const orders = data?.data ?? [];
  const pagination = data?.meta.pagination;
  const canManageOrder = selectedOrder?.stage === "opened" || selectedOrder?.stage === "queued";
  const candidates = candidatesResponse?.data ?? [];

  const mapPoints = useMemo(() => {
    if (!selectedOrder) {
      return [];
    }

    const customerCoordinates = parseCoordinates(selectedOrder.location);
    const points: { label: string; latitude: number; longitude: number }[] = [];

    if (selectedOrder.agentLocation) {
      points.push({
        label: "Agente",
        latitude: selectedOrder.agentLocation.latitude,
        longitude: selectedOrder.agentLocation.longitude,
      });
    }

    if (customerCoordinates) {
      points.push({
        label: "Cliente",
        latitude: customerCoordinates.latitude,
        longitude: customerCoordinates.longitude,
      });
    }

    return points;
  }, [selectedOrder]);

  const resetAction = () => {
    setAction(null);
    setComment("");
    setAgentId("");
    setAssignmentMode("automatic");
    setActionError(null);
  };

  const onStageChange = (value: OrderStage) => {
    setStage(value);
    setPage(1);
  };

  const handleReassign = async () => {
    if (!selectedOrder) {
      return;
    }

    setActionError(null);
    try {
      await reassignOrder({
        id: selectedOrder.id,
        comment,
        ...(assignmentMode === "automatic"
          ? { automatic: true }
          : { agentId: Number(agentId) }),
      }).unwrap();
      resetAction();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const handleCancel = async () => {
    if (!selectedOrder) {
      return;
    }

    setActionError(null);
    try {
      await cancelOrder({ id: selectedOrder.id, comment }).unwrap();
      resetAction();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  return (
    <>
      <section className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Ordenes</h1>
            <p className="text-sm text-muted-foreground">Monitoreo, cola y asignacion de agentes</p>
          </div>
          <div className="flex items-center gap-2">
            <Select onChange={(event) => onStageChange(event.target.value as OrderStage)} value={stage}>
              {stageOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
            <Button onClick={() => refetch()} variant="outline">
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </Button>
          </div>
        </div>
      </section>

      <Summary orders={orders} />

      <section className="admin-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="bg-muted/70 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="table-cell">Orden</th>
                <th className="table-cell">Cliente</th>
                <th className="table-cell">Agente</th>
                <th className="table-cell">Servicio</th>
                <th className="table-cell">Estado</th>
                <th className="table-cell">Ubicacion</th>
                <th className="table-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="table-cell text-muted-foreground" colSpan={7}>Cargando ordenes...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td className="table-cell text-muted-foreground" colSpan={7}>No hay ordenes para este filtro.</td></tr>
              ) : orders.map((order) => (
                <tr className="border-t" key={order.id}>
                  <td className="table-cell font-medium">#{order.id}</td>
                  <td className="table-cell">
                    <div className="font-medium">{order.customer?.name || "Sin cliente"}</div>
                    <div className="text-xs text-muted-foreground">{order.customer?.phone || "Sin telefono"}</div>
                  </td>
                  <td className="table-cell">
                    <div className="font-medium">{formatPersonName(order.agent)}</div>
                    <div className="text-xs text-muted-foreground">
                      {order.stage === "queued" && order.queuePosition ? `Turno ${order.queuePosition}` : order.agent?.email || "Sin correo"}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div>{getServiceLabel(order.service)}</div>
                    <div className="text-xs text-muted-foreground">{order.subService || "Sin subtipo"}</div>
                  </td>
                  <td className="table-cell"><StatusBadge kind="order" value={order.stage} /></td>
                  <td className="table-cell"><LocationBadge order={order} /></td>
                  <td className="table-cell">
                    <div className="flex justify-end">
                      <Button onClick={() => setSelectedId(order.id)} size="sm" variant="outline">
                        <Eye className="h-4 w-4" /> Ver
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">{pagination?.total ?? 0} ordenes</p>
          <div className="flex items-center gap-2">
            <Button disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} size="sm" variant="outline">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Badge>{page}</Badge>
            <Button disabled={pagination ? page >= pagination.pageCount : true} onClick={() => setPage((current) => current + 1)} size="sm" variant="outline">
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <Dialog onOpenChange={(open) => !open && (setSelectedId(null), resetAction())} open={selectedId != null}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Orden #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              {isFetchingDetail ? "Cargando detalle..." : `${selectedOrder?.customer?.name || "Sin cliente"} - ${formatPersonName(selectedOrder?.agent)}`}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder ? (
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="grid content-start gap-3">
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge kind="order" value={selectedOrder.stage} />
                    <LocationBadge order={selectedOrder} />
                  </div>
                  <dl className="grid gap-3 text-sm">
                    <div><dt className="text-muted-foreground">Cliente</dt><dd className="font-medium">{selectedOrder.customer?.name || "Sin cliente"}</dd></div>
                    <div><dt className="text-muted-foreground">Agente</dt><dd className="font-medium">{formatPersonName(selectedOrder.agent)}</dd></div>
                    {selectedOrder.stage === "queued" ? <div><dt className="text-muted-foreground">Posicion en cola</dt><dd className="font-medium">Turno {selectedOrder.queuePosition || "Sin registro"}</dd></div> : null}
                    <div><dt className="text-muted-foreground">Servicio</dt><dd className="font-medium">{getServiceLabel(selectedOrder.service)}</dd></div>
                    <div><dt className="text-muted-foreground">ETA</dt><dd className="font-medium">{selectedOrder.agentLocation?.estimatedTime || "Sin estimacion"}</dd></div>
                    <div><dt className="text-muted-foreground">Ultima ubicacion</dt><dd className="font-medium">{selectedOrder.agentLocation?.updatedAt ? formatDate(selectedOrder.agentLocation.updatedAt) : "Sin registro"}</dd></div>
                    <div><dt className="text-muted-foreground">Auto</dt><dd className="whitespace-pre-wrap font-medium">{selectedOrder.autoInfo || "Sin informacion"}</dd></div>
                  </dl>
                </div>

                {canManageOrder && !action ? (
                  <div className="flex flex-wrap gap-2 rounded-lg border p-3">
                    <Button onClick={() => setAction("reassign")} variant="outline">
                      <RotateCcw className="h-4 w-4" /> Reasignar
                    </Button>
                    <Button onClick={() => setAction("cancel")} variant="destructive">
                      <XCircle className="h-4 w-4" /> Cancelar
                    </Button>
                  </div>
                ) : null}

                {action === "reassign" ? (
                  <div className="grid gap-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="font-medium">Reasignar orden</p><p className="text-sm text-muted-foreground">Elige automaticamente o selecciona al agente.</p></div>
                      <Button onClick={resetAction} size="sm" variant="ghost">Cerrar</Button>
                    </div>
                    <Select onChange={(event) => setAssignmentMode(event.target.value as "automatic" | "manual")} value={assignmentMode}>
                      <option value="automatic">Asignar automaticamente al mas cercano</option>
                      <option value="manual">Elegir agente manualmente</option>
                    </Select>
                    {assignmentMode === "manual" ? (
                      <Select disabled={isFetchingCandidates} onChange={(event) => setAgentId(event.target.value)} value={agentId}>
                        <option value="">{isFetchingCandidates ? "Buscando agentes..." : "Selecciona un agente"}</option>
                        {candidates.map((candidate) => (
                          <option disabled={!candidate.canAssign} key={candidate.agent.id} value={candidate.agent.id}>
                            {formatPersonName(candidate.agent)} - {formatMeters(candidate.distanceMeters)} - {candidate.queuedCount}/3 en espera{candidate.canAssign ? "" : " (No disponible)"}
                          </option>
                        ))}
                      </Select>
                    ) : null}
                    <textarea className="min-h-24 rounded-md border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" onChange={(event) => setComment(event.target.value)} placeholder="Motivo de la reasignacion" value={comment} />
                    {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
                    <Button disabled={!comment.trim() || (assignmentMode === "manual" && !agentId) || isReassigning} onClick={handleReassign}>
                      {isReassigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Confirmar reasignacion
                    </Button>
                  </div>
                ) : null}

                {action === "cancel" ? (
                  <div className="grid gap-3 rounded-lg border border-destructive/40 p-4">
                    <div className="flex items-center justify-between gap-3"><div><p className="font-medium">Cancelar orden</p><p className="text-sm text-muted-foreground">Esta accion libera al agente y conserva el historial.</p></div><Button onClick={resetAction} size="sm" variant="ghost">Cerrar</Button></div>
                    <textarea className="min-h-24 rounded-md border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" onChange={(event) => setComment(event.target.value)} placeholder="Motivo de la cancelacion" value={comment} />
                    {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
                    <Button disabled={!comment.trim() || isCancelling} onClick={handleCancel} variant="destructive">
                      {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Confirmar cancelacion
                    </Button>
                  </div>
                ) : null}

                {selectedOrder.stage === "completed" || selectedOrder.completedAt || selectedOrder.completionLocation ? (
                  <div className="rounded-lg border p-4 text-sm">
                    <div className="mb-2 font-medium">Finalizacion</div>
                    <dl className="grid gap-2 text-muted-foreground">
                      <div><dt>Fecha/hora finalizada</dt><dd className="font-medium text-foreground">{selectedOrder.completedAt ? formatDate(selectedOrder.completedAt) : "Sin registro"}</dd></div>
                      <div><dt>Coordenadas de finalizacion</dt><dd className="font-medium text-foreground">{parseCoordinates(selectedOrder.completionLocation) ? `${parseCoordinates(selectedOrder.completionLocation)?.latitude.toFixed(6)}, ${parseCoordinates(selectedOrder.completionLocation)?.longitude.toFixed(6)}` : "Sin coordenadas"}</dd></div>
                      <div><dt>Distancia al cliente</dt><dd className="font-medium text-foreground">{formatMeters(selectedOrder.completionDistanceMeters)}</dd></div>
                      <div><dt>Llego dentro del rango</dt><dd className="font-medium text-foreground">{formatBoolean(selectedOrder.completionWithinRadius)}</dd></div>
                    </dl>
                  </div>
                ) : null}

                {selectedOrder.stage === "cancelled" ? (
                  <div className="rounded-lg border border-destructive/40 p-4 text-sm"><p className="font-medium">Cancelacion</p><p className="mt-1 text-muted-foreground">{selectedOrder.cancellationComment || "Sin comentario"}</p><p className="mt-2 text-muted-foreground">Por {formatPersonName(selectedOrder.cancelledBy)} {selectedOrder.cancelledAt ? `el ${formatDate(selectedOrder.cancelledAt)}` : ""}</p></div>
                ) : null}
              </div>

              <div className="grid content-start gap-3">
                <MapPanel points={mapPoints} />
                <div className="rounded-lg border p-4">
                  <h2 className="mb-3 font-medium">Linea del tiempo</h2>
                  {selectedOrder.events?.length ? (
                    <ol className="grid gap-3 border-l pl-4">
                      {selectedOrder.events.map((event) => (
                        <li className="relative grid gap-1 text-sm" key={event.id}>
                          <span className="absolute -left-[1.33rem] top-1.5 h-2 w-2 rounded-full bg-primary" />
                          <div className="flex flex-wrap items-center justify-between gap-1"><span className="font-medium">{eventLabels[event.type]}</span><span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span></div>
                          {event.previousAgent || event.nextAgent ? <p className="text-muted-foreground">{event.previousAgent ? `${formatPersonName(event.previousAgent)} -> ` : ""}{event.nextAgent ? formatPersonName(event.nextAgent) : "Sin agente"}</p> : null}
                          {event.actor ? <p className="text-xs text-muted-foreground">Por {formatPersonName(event.actor)}</p> : null}
                          {event.comment ? <p className="whitespace-pre-wrap text-muted-foreground">{event.comment}</p> : null}
                        </li>
                      ))}
                    </ol>
                  ) : <p className="text-sm text-muted-foreground">No hay eventos registrados para esta orden.</p>}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
