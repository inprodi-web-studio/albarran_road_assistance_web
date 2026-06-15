import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
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
  useApproveRequestMutation,
  useGetRequestQuery,
  useGetRequestsQuery,
} from "@/lib/api";
import type { AssistanceRequest, RequestStatus } from "@/lib/types";
import {
  formatDate,
  getServiceLabel,
  parseCoordinates,
  requestStatusLabels,
} from "@/lib/utils";

const pageSize = 12;

const statusOptions: { label: string; value: RequestStatus }[] = [
  { label: "Pendientes", value: "pending" },
  { label: "Aprobadas", value: "approved" },
  { label: "Orden creada", value: "converted" },
  { label: "Rechazadas", value: "rejected" },
  { label: "Todas", value: "all" },
];

const Summary = ({ requests }: { requests: AssistanceRequest[] }) => {
  const counts = requests.reduce(
    (acc, request) => {
      acc[request.status] += 1;
      return acc;
    },
    { approved: 0, converted: 0, pending: 0, rejected: 0 },
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(counts).map(([key, value]) => (
        <div className="admin-panel p-4" key={key}>
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {requestStatusLabels[key as keyof typeof counts]}
          </p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
};

export const RequestsPage = () => {
  const [status, setStatus] = useState<RequestStatus>("pending");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const { data, isFetching, isLoading, refetch } = useGetRequestsQuery({
    status,
    page,
    pageSize,
  });
  const { data: selectedRequest, isFetching: isFetchingDetail } =
    useGetRequestQuery(selectedId ?? 0, { skip: selectedId == null });
  const [approveRequest, { isLoading: isReviewing }] =
    useApproveRequestMutation();

  const requests = data?.data ?? [];
  const pagination = data?.meta.pagination;

  const mapPoints = useMemo(() => {
    const coordinates = parseCoordinates(selectedRequest?.location);
    return coordinates
      ? [
          {
            label: "Cliente",
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          },
        ]
      : [];
  }, [selectedRequest]);

  const onStatusChange = (value: RequestStatus) => {
    setStatus(value);
    setPage(1);
  };

  const onApproval = async (approval: boolean) => {
    if (!selectedRequest) {
      return;
    }

    setMutationError(null);

    try {
      await approveRequest({ id: selectedRequest.id, approval }).unwrap();
      setSelectedId(null);
    } catch (error) {
      setMutationError(getErrorMessage(error));
    }
  };

  return (
    <>
      <section className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Solicitudes</h1>
            <p className="text-sm text-muted-foreground">
              Revision y aprobacion de auxilios entrantes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              onChange={(event) =>
                onStatusChange(event.target.value as RequestStatus)
              }
              value={status}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button onClick={() => refetch()} variant="outline">
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Actualizar
            </Button>
          </div>
        </div>
      </section>

      <Summary requests={requests} />

      <section className="admin-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse">
            <thead className="bg-muted/70 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="table-cell">Folio</th>
                <th className="table-cell">Cliente</th>
                <th className="table-cell">Servicio</th>
                <th className="table-cell">Estado</th>
                <th className="table-cell">Fecha</th>
                <th className="table-cell text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="table-cell text-muted-foreground" colSpan={6}>
                    Cargando solicitudes...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td className="table-cell text-muted-foreground" colSpan={6}>
                    No hay solicitudes para este filtro.
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr className="border-t" key={request.id}>
                    <td className="table-cell font-medium">#{request.id}</td>
                    <td className="table-cell">
                      <div className="font-medium">
                        {request.customer?.name || "Sin cliente"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {request.customer?.phone || "Sin telefono"}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>{getServiceLabel(request.service)}</div>
                      <div className="text-xs text-muted-foreground">
                        {request.subService || "Sin subtipo"}
                      </div>
                    </td>
                    <td className="table-cell">
                      <StatusBadge kind="request" value={request.status} />
                    </td>
                    <td className="table-cell">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="table-cell">
                      <div className="flex justify-end">
                        <Button
                          onClick={() => setSelectedId(request.id)}
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
            {pagination?.total ?? 0} solicitudes
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
            <DialogTitle>Solicitud #{selectedRequest?.id}</DialogTitle>
            <DialogDescription>
              {isFetchingDetail
                ? "Cargando detalle..."
                : `${selectedRequest?.customer?.name || "Sin cliente"} - ${getServiceLabel(selectedRequest?.service)}`}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div className="grid content-start gap-3">
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <StatusBadge
                      kind="request"
                      value={selectedRequest.status}
                    />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(selectedRequest.createdAt)}
                    </span>
                  </div>
                  <dl className="grid gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Cliente</dt>
                      <dd className="font-medium">
                        {selectedRequest.customer?.name || "Sin cliente"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Telefono</dt>
                      <dd className="font-medium">
                        {selectedRequest.customer?.phone || "Sin telefono"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Servicio</dt>
                      <dd className="font-medium">
                        {getServiceLabel(selectedRequest.service)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Subservicio</dt>
                      <dd className="font-medium">
                        {selectedRequest.subService || "Sin subtipo"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Auto</dt>
                      <dd className="whitespace-pre-wrap font-medium">
                        {selectedRequest.autoInfo || "Sin informacion"}
                      </dd>
                    </div>
                  </dl>
                </div>
                {mutationError ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {mutationError}
                  </div>
                ) : null}
                {selectedRequest.status === "pending" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={isReviewing}
                      onClick={() => onApproval(true)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aceptar
                    </Button>
                    <Button
                      disabled={isReviewing}
                      onClick={() => onApproval(false)}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4" />
                      Rechazar
                    </Button>
                  </div>
                ) : null}
              </div>
              <MapPanel points={mapPoints} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
