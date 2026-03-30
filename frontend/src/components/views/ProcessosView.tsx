import { useState, useEffect, useCallback } from "react";
import {
  Scale, Plus, Search, Filter, X, ChevronRight,
  CalendarClock, AlertCircle, Clock, CheckCircle, Pause, Archive, MapPin, Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUnidade } from "@/context/UnidadeContext";
import { useAuth } from "@/context/AuthContext";
import { processosApi } from "@/services/api";
import { NovoProcessoModal } from "@/components/modals/NovoProcessoModal";
import { EditarProcessoModal } from "@/components/modals/EditarProcessoModal";
import type { Processo, StatusProcesso, TipoProcesso } from "@/types";

const statusConfig: Record<StatusProcesso, { label: string; class: string; icon: React.ElementType }> = {
  "EM_ANDAMENTO": { label: "Em andamento", class: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: Clock },
  "AGUARDANDO":   { label: "Aguardando",   class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", icon: Clock },
  "URGENTE":      { label: "Urgente",       class: "bg-red-500/15 text-red-400 border-red-500/20", icon: AlertCircle },
  "CONCLUIDO":    { label: "Concluído",     class: "bg-primary/15 text-primary border-primary/20", icon: CheckCircle },
  "SUSPENSO":     { label: "Suspenso",      class: "bg-orange-500/15 text-orange-400 border-orange-500/20", icon: Pause },
  "ARQUIVADO":    { label: "Arquivado",     class: "bg-muted text-muted-foreground border-border", icon: Archive },
};

const tiposProcesso: TipoProcesso[] = [
  "CIVEL", "TRABALHISTA", "CRIMINAL", "FAMILIA",
  "TRIBUTARIO", "EMPRESARIAL", "PREVIDENCIARIO", "ADMINISTRATIVO"
];

// ─── Drawer de Detalhes ───────────────────────────────────────────────────────

function ProcessoDrawer({
  processo, onClose, onEditar
}: {
  processo: Processo;
  onClose: () => void;
  onEditar: () => void;
}) {
  const status = statusConfig[processo.status] ?? statusConfig.EM_ANDAMENTO;
  const StatusIcon = status.icon;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-card border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <Scale className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">{processo.numero}</p>
              <p className="text-sm font-semibold text-foreground">{processo.clienteNome}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs gap-1", status.class)}>
              <StatusIcon className="h-3 w-3" />{status.label}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            <h3 className="font-heading text-base font-semibold text-foreground">Dados do Processo</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Tipo", value: processo.tipo },
                { label: "Tribunal", value: processo.tribunal || "—" },
                { label: "Vara / Juízo", value: processo.vara || "—" },
                { label: "Distribuição", value: processo.dataDistribuicao
                    ? new Date(processo.dataDistribuicao + "T00:00:00").toLocaleDateString("pt-BR") : "—" },
                { label: "Advogado", value: processo.advogadoNome },
                { label: "Valor da Causa", value: processo.valorCausa
                    ? `R$ ${parseFloat(processo.valorCausa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-muted/40 px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-sm text-foreground font-medium mt-0.5 leading-tight">{value}</p>
                </div>
              ))}
            </div>

            {processo.descricao && (
              <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Descrição</p>
                <p className="text-sm text-foreground">{processo.descricao}</p>
              </div>
            )}

            {processo.proximoPrazo && (
              <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                <CalendarClock className="h-4 w-4 text-destructive shrink-0" />
                <div>
                  <p className="text-xs text-destructive font-semibold">Próximo Prazo</p>
                  <p className="text-sm text-foreground">
                    {new Date(processo.proximoPrazo + "T00:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {processo.movimentacoes && processo.movimentacoes.length > 0 && (
            <div className="px-6 pb-6">
              <h3 className="font-heading text-base font-semibold text-foreground mb-3">Movimentações</h3>
              <div className="relative space-y-0">
                {processo.movimentacoes.map((mov, i) => (
                  <div key={mov.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 shrink-0" />
                      {i < (processo.movimentacoes?.length ?? 0) - 1 && (
                        <div className="w-px flex-1 bg-border min-h-[24px] my-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(mov.data + "T00:00:00").toLocaleDateString("pt-BR")} · {mov.tipo}
                      </p>
                      <p className="text-sm text-foreground mt-0.5">{mov.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button className="flex-1 gap-2" onClick={onEditar}>
            <Pencil className="h-4 w-4" /> Editar / Gerenciar
          </Button>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}

// ─── View Principal ───────────────────────────────────────────────────────────

export const ProcessosView = () => {
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusProcesso | "Todos">("Todos");
  const [filtroTipo, setFiltroTipo] = useState<TipoProcesso | "Todos">("Todos");
  const [processoSelecionado, setProcessoSelecionado] = useState<Processo | null>(null);
  const [editando, setEditando] = useState(false);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const { unidadeSelecionada } = useUnidade();

  const isSecretaria = user?.papel?.toUpperCase() === "SECRETARIA";

  const carregarProcessos = useCallback(() => {
    setLoading(true);
    processosApi.listar({
      // Filtragem por unidade feita SOMENTE no servidor — sem double-filter
      unidadeId: unidadeSelecionada !== "todas" ? unidadeSelecionada : undefined,
      busca: busca || undefined,
    })
      .then((data) => {
        const items = data.content ?? data;
        setProcessos(Array.isArray(items) ? items : []);
      })
      .catch(() => setProcessos([]))
      .finally(() => setLoading(false));
  }, [busca, unidadeSelecionada]);

  useEffect(() => { carregarProcessos(); }, [carregarProcessos]);

  const todoStatus: Array<StatusProcesso | "Todos"> = [
    "Todos", "EM_ANDAMENTO", "URGENTE", "AGUARDANDO", "SUSPENSO", "CONCLUIDO", "ARQUIVADO"
  ];

  // Só filtragem local de status/tipo (não duplica filtro de unidade nem busca)
  const processosFiltrados = processos.filter(p => {
    const matchStatus = filtroStatus === "Todos" || p.status === filtroStatus;
    const matchTipo = filtroTipo === "Todos" || p.tipo === filtroTipo;
    return matchStatus && matchTipo;
  });

  const handleClickProcesso = async (p: Processo) => {
    // Buscar detalhes completos (com movimentações)
    try {
      const completo = await processosApi.buscar(p.id);
      setProcessoSelecionado(completo);
    } catch {
      setProcessoSelecionado(p);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Topo */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou cliente..."
            className="pl-9 bg-secondary border-none"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value as StatusProcesso | "Todos")}
          className="h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none cursor-pointer"
        >
          {todoStatus.map(s => (
            <option key={s} value={s}>
              {s === "Todos" ? "Todos os status" : (statusConfig[s as StatusProcesso]?.label || s)}
            </option>
          ))}
        </select>

        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value as TipoProcesso | "Todos")}
          className="h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none cursor-pointer"
        >
          <option value="Todos">Todos os tipos</option>
          {tiposProcesso.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Apenas admin e advogado podem criar processos */}
        {!isSecretaria && (
          <Button className="gap-2 ml-auto" onClick={() => setModalAberto(true)}>
            <Plus className="h-4 w-4" /> Novo Processo
          </Button>
        )}
      </div>

      {/* Chips de status */}
      <div className="flex gap-2 flex-wrap">
        {todoStatus.slice(0, 5).map(s => {
          const count = s === "Todos" ? processos.length : processos.filter(p => p.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                filtroStatus === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {s === "Todos" ? s : (statusConfig[s as StatusProcesso]?.label || s)}{" "}
              <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Tabela */}
      {!loading && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {processosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Filter className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhum processo encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide">Nº do Processo</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide">Cliente</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide hidden md:table-cell">Tipo</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide hidden lg:table-cell">Advogado</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {processosFiltrados.map(p => {
                  const conf = statusConfig[p.status] ?? { class: "bg-muted text-foreground border-border", icon: AlertCircle, label: p.status };
                  const Icon = conf.icon;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleClickProcesso(p)}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs text-primary">{p.numero.length > 16 ? p.numero.slice(0, 16) + "…" : p.numero}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />{p.unidadeNome ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {p.clienteNome.split(" ").slice(0, 2).map(n => n[0]).join("")}
                          </div>
                          <span className="font-medium text-foreground">{p.clienteNome}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">{p.tipo}</td>
                      <td className="px-5 py-4 text-muted-foreground hidden lg:table-cell text-sm">{p.advogadoNome}</td>
                      <td className="px-5 py-4">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", conf.class)}>
                          <Icon className="h-3 w-3" />{conf.label}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && (
        <p className="text-xs text-muted-foreground text-right">
          {processosFiltrados.length} de {processos.length} processos
        </p>
      )}

      {/* Drawer de detalhes */}
      {processoSelecionado && !editando && (
        <ProcessoDrawer
          processo={processoSelecionado}
          onClose={() => setProcessoSelecionado(null)}
          onEditar={() => setEditando(true)}
        />
      )}

      {/* Modal de edição */}
      {processoSelecionado && editando && (
        <EditarProcessoModal
          processo={processoSelecionado}
          onClose={() => { setEditando(false); setProcessoSelecionado(null); }}
          onSaved={() => { setEditando(false); setProcessoSelecionado(null); carregarProcessos(); }}
        />
      )}

      {/* Modal novo processo */}
      {modalAberto && (
        <NovoProcessoModal onClose={() => setModalAberto(false)} onSaved={carregarProcessos} />
      )}
    </div>
  );
};
