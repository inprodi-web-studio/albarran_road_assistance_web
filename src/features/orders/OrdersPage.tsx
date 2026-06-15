import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MapPin,
  RefreshCw,
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
import { useGetOrderQuery, useGetOrdersQuery } from "@/lib/api";
import type { AdminOrder, OrderStage } from "@/lib/types";
import {
  formatDate,
  formatPersonName,
  getServiceLabel,
  parseCoordinates,
} from "@/lib/utils";

const pageSize = 12;

const stageOptions: { label: string; value: OrderStage }[] = [
  { label: "Abiertas", value: "opened" },
  { label: "Completadas", value: "completed" },
  { label: "Canceladas", value: "cancelled" },
  { label: "Todas", value: "all" },
];

const LocationBadge = ({ order }: { order: AdminOrder }) => {
  if (!order.agentLocation) {
    return <Badge variant="neutral">Sin ubicacion</Badge>;
  }

  if (order.agentLocation.stale) {
    return <Badge variant="warning">Ubicacion antigua</Badge>;
  }

  return <Badge variant="success">En vivo</Badge>;
};

const Summary = ({ orders }: { orders: AdminOrder[] }) => {
  const activeLocations = orders.filter(
    (order) => order.agentLocation && !order.agentLocation.stale,
  ).length;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="admin-panel p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Ordenes
        </p>
        <p className="mt-2 text-2xl font-semibold">{orders.length}</p>
      </div>
      <div className="admin-panel p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Agentes ubicados
        </p>
        <p className="mt-2 text-2xl font-semibold">{activeLocations}</p>
      </div>
      <div className="admin-panel p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Sin ubicacion
        </p>
        <p className="mt-2 text-2xl font-semibold">
          {orders.length - activeLocations}
        </p>
      </div>
    </div>
  );
};

export const OrdersPage = () => {
  const [stage, setStage] = useState<OrderStage>("opened");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data, isFetching, isLoading, refetch } = useGetOrdersQuery(
    {
      stage,
      page,
      pageSize,
    },
    {
      pollingInterval: 15000,
    },
  );
  const { data: selectedOrder, isFetching: isFetchingDetail } =
    useGetOrderQuery(selectedId ?? 0, {
      pollingInterval: 15000,
      skip: selectedId == null,
    });

  const orders = data?.data ?? [];
  const pagination = data?.meta.pagination;

  const mapPoints = useMemo(() => {
    if (!selectedOrder) {
      return [];
    }

    const customerCoordinates = parseCoordinates(selectedOrder.location);
    const points = [];

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

  const onStageChange = (value: OrderStage) => {
    setStage(value);
    setPage(1);
  };

  return (
    <>
      <section className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Ordenes</h1>
            <p className="text-sm text-muted-foreground">
              Monitoreo de auxilios activos y asignacion de agentes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              onChange={(event) =>
                onStageChange(event.target.value as OrderStage)
              }
              value={stage}
            >
              {stageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button onClick={() => refetch()} variant="outline">
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Actualizar
            </Button>
          </div>
        </div>
      </section>

      <Summary orders={orders} />

      <section className="admin-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] border-collapse">
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
                <tr>
                  <td className="table-cell text-muted-foreground" colSpan={7}>
                    Cargando ordenes...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td className="table-cell text-muted-foreground" colSpan={7}>
                    No hay ordenes para este filtro.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr className="border-t" key={order.id}>
                    <td className="table-cell font-medium">#{order.id}</td>
                    <td className="table-cell">
                      <div className="font-medium">
                        {order.customer?.name || "Sin cliente"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.customer?.phone || "Sin telefono"}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="font-medium">
                        {formatPersonName(order.agent)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.agent?.email || "Sin correo"}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>{getServiceLabel(order.service)}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.subService || "Sin subtipo"}
                      </div>
                    </td>
                    <td className="table-cell">
                      <StatusBadge kind="order" value={order.stage} />
                    </td>
                    <td className="table-cell">
                      <LocationBadge order={order} />
                    </td>
                    <td className="table-cell">
                      <div className="flex justify-end">
                        <Button
                          onClick={() => setSelectedId(order.id)}
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {pagination?.total ?? 0} ordenes
          </p>
          <div className="flex items-center gap-2">
            <Button
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              size="sm"
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Badge>{page}</Badge>
            <Button
              disabled={pagination ? page >= pagination.pageCount : true}
              onClick={() => setPage((current) => current + 1)}
              size="sm"
              variant="outline"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <Dialog onOpenChange={(open) => !open && setSelectedId(null)} open={selectedId != null}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Orden #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              {isFetchingDetail
                ? "Cargando detalle..."
                : `${selectedOrder?.customer?.name || "Sin cliente"} - ${formatPersonName(selectedOrder?.agent)}`}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
              <div className="grid content-start gap-3">
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge kind="order" value={selectedOrder.stage} />
                    <LocationBadge order={selectedOrder} />
                  </div>
                  <dl className="grid gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Cliente</dt>
                      <dd className="font-medium">
                        {selectedOrder.customer?.name || "Sin cliente"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Agente</dt>
                      <dd className="font-medium">
                        {formatPersonName(selectedOrder.agent)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Servicio</dt>
                      <dd className="font-medium">
                        {getServiceLabel(selectedOrder.service)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">ETA</dt>
                      <dd className="font-medium">
                        {selectedOrder.agentLocation?.estimatedTime ||
                          "Sin estimacion"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        Ultima ubicacion
                      </dt>
                      <dd className="font-medium">
                        {selectedOrder.agentLocation?.updatedAt
                          ? formatDate(selectedOrder.agentLocation.updatedAt)
                          : "Sin registro"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Auto</dt>
                      <dd className="whitespace-pre-wrap font-medium">
                        {selectedOrder.autoInfo || "Sin informacion"}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-lg border p-4 text-sm">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 text-primary" />
                    Coordenadas
                  </div>
                  <div className="grid gap-1 text-muted-foreground">
                    <span>
                      Cliente:{" "}
                      {parseCoordinates(selectedOrder.location)
                        ? `${parseCoordinates(selectedOrder.location)?.latitude.toFixed(6)}, ${parseCoordinates(selectedOrder.location)?.longitude.toFixed(6)}`
                        : "Sin coordenadas"}
                    </span>
                    <span>
                      Agente:{" "}
                      {selectedOrder.agentLocation
                        ? `${selectedOrder.agentLocation.latitude.toFixed(6)}, ${selectedOrder.agentLocation.longitude.toFixed(6)}`
                        : "Sin coordenadas"}
                    </span>
                  </div>
                </div>
              </div>
              <MapPanel points={mapPoints} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
