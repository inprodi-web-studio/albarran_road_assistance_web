import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { AgentAvatar } from "@/components/AgentAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AgentFormDialog } from "@/features/agents/AgentFormDialog";
import { useGetAgentsQuery } from "@/lib/api";
import { getScheduleSummary } from "@/lib/schedule";
import type { Agent, AgentStatus } from "@/lib/types";
import { formatDate, formatPersonName, getServiceLabel } from "@/lib/utils";

const pageSize = 12;

const statusOptions: { label: string; value: AgentStatus }[] = [
  { label: "Todos", value: "all" },
  { label: "Disponibles", value: "available" },
  { label: "Ocupados", value: "busy" },
  { label: "Bloqueados", value: "blocked" },
];

const AgentStatusBadge = ({ agent }: { agent: Agent }) => {
  if (agent.blocked || agent.status === "blocked") return <Badge variant="danger">Bloqueado</Badge>;
  if (agent.isBusy || agent.status === "busy") return <Badge variant="warning">Ocupado</Badge>;
  return <Badge variant="success">Disponible</Badge>;
};

const ShiftBadge = ({ agent }: { agent: Agent }) => {
  if (!agent.scheduleValid) return <Badge variant="danger">Horario invalido</Badge>;
  return agent.isOnShift
    ? <Badge variant="success">En turno</Badge>
    : <Badge variant="neutral">Fuera de turno</Badge>;
};

const Summary = ({ agents }: { agents: Agent[] }) => {
  const totals = useMemo(() => ({
    available: agents.filter((agent) => !agent.blocked && !agent.isBusy).length,
    busy: agents.filter((agent) => !agent.blocked && agent.isBusy).length,
    onShift: agents.filter((agent) => !agent.blocked && agent.isOnShift).length,
  }), [agents]);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="admin-panel p-4"><p className="text-xs font-medium uppercase text-muted-foreground">Disponibles</p><p className="mt-2 text-2xl font-semibold">{totals.available}</p></div>
      <div className="admin-panel p-4"><p className="text-xs font-medium uppercase text-muted-foreground">Ocupados</p><p className="mt-2 text-2xl font-semibold">{totals.busy}</p></div>
      <div className="admin-panel p-4"><p className="text-xs font-medium uppercase text-muted-foreground">En turno</p><p className="mt-2 text-2xl font-semibold">{totals.onShift}</p></div>
    </div>
  );
};

export const AgentsPage = () => {
  const [status, setStatus] = useState<AgentStatus>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const { data, isFetching, isLoading, refetch } = useGetAgentsQuery({
    status,
    page,
    pageSize,
    search: search.trim() || undefined,
  });
  const agents = data?.data ?? [];
  const pagination = data?.meta.pagination;

  const openCreate = () => {
    setSelectedAgent(null);
    setFormOpen(true);
  };

  const openEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormOpen(true);
  };

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agentes</h1>
          <p className="text-sm text-muted-foreground">Perfiles, turnos y servicios habilitados</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar
          </Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo agente</Button>
        </div>
      </section>

      <Summary agents={agents} />

      <section className="admin-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar agente" value={search} />
          </div>
          <Select onChange={(event) => { setStatus(event.target.value as AgentStatus); setPage(1); }} value={status}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead className="bg-muted/70 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="table-cell">Agente</th><th className="table-cell">Contacto</th><th className="table-cell">Estado</th><th className="table-cell">Turno</th><th className="table-cell">Servicios</th><th className="table-cell">Horario</th><th className="table-cell">Alta</th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="table-cell text-muted-foreground" colSpan={7}>Cargando agentes...</td></tr>
              ) : agents.length === 0 ? (
                <tr><td className="table-cell text-muted-foreground" colSpan={7}>No hay agentes para este filtro.</td></tr>
              ) : agents.map((agent) => (
                <tr className="cursor-pointer border-t transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" key={agent.id} onClick={() => openEdit(agent)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openEdit(agent); } }} role="button" tabIndex={0}>
                  <td className="table-cell"><div className="flex items-center gap-3"><AgentAvatar name={formatPersonName(agent)} photo={agent.photo} /><div><div className="font-medium">{formatPersonName(agent)}</div><div className="text-xs text-muted-foreground">#{agent.id}</div></div></div></td>
                  <td className="table-cell text-sm"><div>{agent.email || "Sin correo"}</div><div className="text-xs text-muted-foreground">{agent.phone || "Sin telefono"}</div></td>
                  <td className="table-cell"><AgentStatusBadge agent={agent} /></td>
                  <td className="table-cell"><ShiftBadge agent={agent} /></td>
                  <td className="table-cell text-sm">{agent.services?.length ? agent.services.map(getServiceLabel).join(", ") : <span className="text-muted-foreground">Ninguno</span>}</td>
                  <td className="table-cell text-sm text-muted-foreground">{getScheduleSummary(agent.workSchedule)}</td>
                  <td className="table-cell text-sm text-muted-foreground">{formatDate(agent.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">{pagination?.total ?? 0} agentes</p>
          <div className="flex items-center gap-2">
            <Button disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} size="sm" variant="outline"><ChevronLeft className="h-4 w-4" /> Anterior</Button>
            <span className="text-sm text-muted-foreground">Pagina {pagination?.page ?? page} de {pagination?.pageCount || 1}</span>
            <Button disabled={!pagination || page >= pagination.pageCount} onClick={() => setPage((current) => current + 1)} size="sm" variant="outline">Siguiente <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      <AgentFormDialog agent={selectedAgent} onClose={() => { setFormOpen(false); setSelectedAgent(null); }} open={formOpen} />
    </>
  );
};
