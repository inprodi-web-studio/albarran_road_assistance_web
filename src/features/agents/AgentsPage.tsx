import { FormEvent, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  UserRoundPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getErrorMessage,
  useCreateAgentMutation,
  useDeleteAgentMutation,
  useGetAgentsQuery,
  useUpdateAgentMutation,
} from "@/lib/api";
import type {
  Agent,
  AgentStatus,
  CreateAgentPayload,
  UpdateAgentPayload,
} from "@/lib/types";
import { formatDate, formatPersonName } from "@/lib/utils";

const pageSize = 12;

const statusOptions: { label: string; value: AgentStatus }[] = [
  { label: "Todos", value: "all" },
  { label: "Disponibles", value: "available" },
  { label: "Ocupados", value: "busy" },
  { label: "Bloqueados", value: "blocked" },
];

const emptyForm: CreateAgentPayload = {
  name: "",
  middleName: "",
  lastName: "",
  phone: "",
  email: "",
  password: "",
};

const toEditForm = (agent: Agent): UpdateAgentPayload => ({
  name: agent.name ?? "",
  middleName: agent.middleName ?? "",
  lastName: agent.lastName ?? "",
  phone: agent.phone ?? "",
  email: agent.email ?? "",
});

const AgentStatusBadge = ({ agent }: { agent: Agent }) => {
  if (agent.blocked || agent.status === "blocked") {
    return <Badge variant="danger">Bloqueado</Badge>;
  }

  if (agent.isBusy || agent.status === "busy") {
    return <Badge variant="warning">Ocupado</Badge>;
  }

  return <Badge variant="success">Disponible</Badge>;
};

const Summary = ({ agents }: { agents: Agent[] }) => {
  const totals = useMemo(
    () => ({
      available: agents.filter((agent) => !agent.blocked && !agent.isBusy).length,
      busy: agents.filter((agent) => !agent.blocked && agent.isBusy).length,
      blocked: agents.filter((agent) => agent.blocked).length,
    }),
    [agents],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="admin-panel p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Disponibles
        </p>
        <p className="mt-2 text-2xl font-semibold">{totals.available}</p>
      </div>
      <div className="admin-panel p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Ocupados
        </p>
        <p className="mt-2 text-2xl font-semibold">{totals.busy}</p>
      </div>
      <div className="admin-panel p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Bloqueados
        </p>
        <p className="mt-2 text-2xl font-semibold">{totals.blocked}</p>
      </div>
    </div>
  );
};

export const AgentsPage = () => {
  const [status, setStatus] = useState<AgentStatus>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CreateAgentPayload>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editForm, setEditForm] = useState<UpdateAgentPayload>(emptyForm);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [createAgent, { isLoading: isCreating }] = useCreateAgentMutation();
  const [updateAgent, { isLoading: isUpdating }] = useUpdateAgentMutation();
  const [deleteAgent, { isLoading: isDeleting }] = useDeleteAgentMutation();
  const { data, isFetching, isLoading, refetch } = useGetAgentsQuery({
    status,
    page,
    pageSize,
    search: search.trim() || undefined,
  });

  const agents = data?.data ?? [];
  const pagination = data?.meta.pagination;

  const onStatusChange = (value: AgentStatus) => {
    setStatus(value);
    setPage(1);
  };

  const updateForm = (key: keyof CreateAgentPayload, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const openEditor = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditForm(toEditForm(agent));
    setEditError(null);
    setDeleteConfirmation(false);
  };

  const closeEditor = () => {
    setSelectedAgent(null);
    setEditError(null);
    setDeleteConfirmation(false);
  };

  const updateEditForm = (key: keyof UpdateAgentPayload, value: string) => {
    setEditForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      await createAgent({
        name: form.name.trim(),
        middleName: form.middleName?.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone?.trim() || undefined,
        email: form.email.trim().toLowerCase(),
        password: form.password,
      }).unwrap();
      setForm(emptyForm);
      setFormSuccess("Agente dado de alta correctamente.");
      setPage(1);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const onEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedAgent) {
      return;
    }

    setEditError(null);

    try {
      await updateAgent({
        id: selectedAgent.id,
        body: {
          name: editForm.name.trim(),
          middleName: editForm.middleName?.trim() || undefined,
          lastName: editForm.lastName.trim(),
          phone: editForm.phone?.trim() || undefined,
          email: editForm.email.trim().toLowerCase(),
        },
      }).unwrap();
      closeEditor();
    } catch (error) {
      setEditError(getErrorMessage(error));
    }
  };

  const onDelete = async () => {
    if (!selectedAgent) {
      return;
    }

    setEditError(null);

    try {
      await deleteAgent(selectedAgent.id).unwrap();
      closeEditor();
    } catch (error) {
      setEditError(getErrorMessage(error));
    }
  };

  return (
    <>
      <section className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Agentes</h1>
            <p className="text-sm text-muted-foreground">
              Alta y monitoreo operativo de agentes de auxilio
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualizar
          </Button>
        </div>
      </section>

      <Summary agents={agents} />

      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form className="admin-panel grid gap-4 p-4" onSubmit={onSubmit}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <UserRoundPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Nuevo agente</h2>
              <p className="text-xs text-muted-foreground">
                Se creara con estado disponible
              </p>
            </div>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            Nombre
            <Input
              onChange={(event) => updateForm("name", event.target.value)}
              required
              value={form.name}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Segundo nombre
            <Input
              onChange={(event) =>
                updateForm("middleName", event.target.value)
              }
              value={form.middleName}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Apellido
            <Input
              onChange={(event) => updateForm("lastName", event.target.value)}
              required
              value={form.lastName}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Correo
            <Input
              autoComplete="email"
              onChange={(event) => updateForm("email", event.target.value)}
              required
              type="email"
              value={form.email}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Telefono
            <Input
              autoComplete="tel"
              onChange={(event) => updateForm("phone", event.target.value)}
              type="tel"
              value={form.phone}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Contrasena
            <Input
              autoComplete="new-password"
              minLength={6}
              onChange={(event) => updateForm("password", event.target.value)}
              required
              type="password"
              value={form.password}
            />
          </label>

          {formError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}
          {formSuccess ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {formSuccess}
            </div>
          ) : null}

          <Button disabled={isCreating} type="submit">
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserRoundPlus className="h-4 w-4" />
            )}
            Dar de alta
          </Button>
        </form>

        <section className="admin-panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar agente"
                value={search}
              />
            </div>
            <Select
              onChange={(event) =>
                onStatusChange(event.target.value as AgentStatus)
              }
              value={status}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead className="bg-muted/70 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="table-cell">Agente</th>
                  <th className="table-cell">Correo</th>
                  <th className="table-cell">Telefono</th>
                  <th className="table-cell">Firebase</th>
                  <th className="table-cell">Estado</th>
                  <th className="table-cell">Alta</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="table-cell text-muted-foreground" colSpan={6}>
                      Cargando agentes...
                    </td>
                  </tr>
                ) : agents.length === 0 ? (
                  <tr>
                    <td className="table-cell text-muted-foreground" colSpan={6}>
                      No hay agentes para este filtro.
                    </td>
                  </tr>
                ) : (
                  agents.map((agent) => (
                    <tr
                      className="cursor-pointer border-t transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      key={agent.id}
                      onClick={() => openEditor(agent)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openEditor(agent);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="table-cell">
                        <div className="font-medium">
                          {formatPersonName(agent)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          #{agent.id}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>{agent.email || "Sin correo"}</div>
                        <div className="text-xs text-muted-foreground">
                          {agent.confirmed ? "Confirmado" : "Sin confirmar"}
                        </div>
                      </td>
                      <td className="table-cell text-sm">
                        {agent.phone || "Sin telefono"}
                      </td>
                      <td className="table-cell">
                        <div className="max-w-[180px] truncate text-xs text-muted-foreground">
                          {agent.firebaseUid || "Sin UID"}
                        </div>
                      </td>
                      <td className="table-cell">
                        <AgentStatusBadge agent={agent} />
                      </td>
                      <td className="table-cell text-sm text-muted-foreground">
                        {formatDate(agent.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {pagination?.total ?? 0} agentes
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
              <span className="text-sm text-muted-foreground">
                Pagina {pagination?.page ?? page} de {pagination?.pageCount || 1}
              </span>
              <Button
                disabled={!pagination || page >= pagination.pageCount}
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
      </section>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            closeEditor();
          }
        }}
        open={Boolean(selectedAgent)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar agente</DialogTitle>
            <DialogDescription>
              Actualiza la informacion de contacto y perfil operativo de {" "}
              {selectedAgent ? formatPersonName(selectedAgent) : "este agente"}.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={onEditSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Nombre
                <Input
                  onChange={(event) => updateEditForm("name", event.target.value)}
                  required
                  value={editForm.name}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Segundo nombre
                <Input
                  onChange={(event) =>
                    updateEditForm("middleName", event.target.value)
                  }
                  value={editForm.middleName}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Apellido
                <Input
                  onChange={(event) =>
                    updateEditForm("lastName", event.target.value)
                  }
                  required
                  value={editForm.lastName}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Telefono
                <Input
                  autoComplete="tel"
                  onChange={(event) => updateEditForm("phone", event.target.value)}
                  type="tel"
                  value={editForm.phone}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Correo
              <Input
                autoComplete="email"
                onChange={(event) => updateEditForm("email", event.target.value)}
                required
                type="email"
                value={editForm.email}
              />
            </label>

            {editError ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {editError}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button onClick={closeEditor} type="button" variant="outline">
                Cerrar
              </Button>
              <Button disabled={isUpdating || isDeleting} type="submit">
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar cambios
              </Button>
            </div>
          </form>

          <section className="border-t pt-4">
            <h3 className="text-sm font-semibold text-destructive">Eliminar agente</h3>
            {selectedAgent?.isBusy ? (
              <p className="mt-1 text-sm text-muted-foreground">
                No puede eliminarse mientras tenga una orden activa o en cola.
              </p>
            ) : deleteConfirmation ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm text-rose-800">
                  Esta accion eliminara el agente y su acceso. No se puede deshacer.
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={isDeleting}
                    onClick={() => setDeleteConfirmation(false)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                  <Button
                    disabled={isDeleting}
                    onClick={onDelete}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Eliminar definitivamente
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="mt-3"
                disabled={isUpdating || isDeleting}
                onClick={() => setDeleteConfirmation(true)}
                type="button"
                variant="destructive"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar agente
              </Button>
            )}
          </section>
        </DialogContent>
      </Dialog>
    </>
  );
};
