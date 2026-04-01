import { useState, useEffect, useCallback } from "react";
import { CalendarClock, AlertCircle, Clock, CheckCircle, X, Scale, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CalendarioPrazos } from "@/components/prazos/CalendarioPrazos";
import { EditarPrazoModal } from "@/components/modals/EditarPrazoModal";
import { prazosApi, processosApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { Prazo, TipoPrazo, PrioridadePrazo } from "@/types";

// ─── Modal de Adição de Prazo ─────────────────────────────────────────────────

function AdicionarPrazoModal({ dataInicial, onClose, onSaved }: { dataInicial?: string; onClose: () => void; onSaved?: () => void }) {
  const { user } = useAuth();
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState(dataInicial ?? "");
  const [hora, setHora] = useState("");
  const [tipo, setTipo] = useState<TipoPrazo>("prazo_processual");
  const [prioridade, setPrioridade] = useState<PrioridadePrazo>("media");
  const [processoId, setProcessoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const [processosLista, setProcessosLista] = useState<{ id: string; numero: string; clienteNome: string }[]>([]);

  useEffect(() => {
    processosApi.listar({ busca: "" }).then(res => {
      const items = res.content ?? res;
      setProcessosLista(Array.isArray(items) ? items : []);
    }).catch(() => {});
  }, []);

  const handleSalvar = async () => {
    if (!titulo || !data) {
      toast.error("Título e data são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      await prazosApi.criar({
        titulo, data, hora: hora || null, tipo, prioridade,
        processoId: processoId || null, descricao: descricao || null,
        advogadoId: user?.id,
        unidadeId: user?.unidadeId
      });
      toast.success("Prazo cadastrado com sucesso!");
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { mensagem?: string } } };
      toast.error(axiosErr.response?.data?.mensagem || "Erro ao cadastrar prazo");
    } finally {
      setSaving(false);
    }
  };

  const tipoLabels: Record<TipoPrazo, string> = {
    prazo_processual: "Prazo Processual",
    audiencia: "Audiência",
    tarefa_interna: "Tarefa Interna",
    reuniao: "Reunião",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-heading text-lg font-semibold text-foreground">Novo Prazo / Tarefa</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input placeholder="Ex: Contestação — João Santos" value={titulo} onChange={e => setTitulo(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hora</Label>
              <Input type="time" value={hora} onChange={e => setHora(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(tipoLabels) as TipoPrazo[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm border transition-all text-left",
                    tipo === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {tipoLabels[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <div className="flex gap-2">
              {([["alta", "Alta", "border-red-400/60 bg-red-400/10 text-red-400"], ["media", "Média", "border-yellow-400/60 bg-yellow-400/10 text-yellow-400"], ["baixa", "Baixa", "border-primary/60 bg-primary/10 text-primary"]] as const).map(([val, label, activeClass]) => (
                <button
                  key={val}
                  onClick={() => setPrioridade(val)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm border transition-all",
                    prioridade === val ? activeClass : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Processo vinculado (opcional)</Label>
            <select
              value={processoId}
              onChange={e => setProcessoId(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
            >
              <option value="">Nenhum processo</option>
              {processosLista.map(p => <option key={p.id} value={p.id}>{p.numero} - {p.clienteNome?.split(" ")[0]}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <textarea
              className="w-full px-3 py-2 rounded-md bg-secondary text-foreground text-sm resize-none border-none outline-none"
              rows={3}
              placeholder="Detalhes adicionais..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button className="flex-1" onClick={handleSalvar} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Prazo"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de Prazo na Lista ───────────────────────────────────────────────────

const tipoCor: Record<string, string> = {
  prazo_processual: "bg-red-500/10 text-red-400",
  audiencia: "bg-blue-500/10 text-blue-400",
  tarefa_interna: "bg-primary/10 text-primary",
  reuniao: "bg-purple-500/10 text-purple-400",
};
const tipoLabel: Record<string, string> = {
  prazo_processual: "Prazo Processual",
  audiencia: "Audiência",
  tarefa_interna: "Tarefa Interna",
  reuniao: "Reunião",
};

function PrazoCard({ prazo, onAtualizar }: { prazo: Prazo; onAtualizar: () => void }) {
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(false);

  const handleConcluir = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await prazosApi.concluir(prazo.id);
      toast.success(prazo.concluido ? "Prazo reaberto" : "Prazo concluído!");
      onAtualizar();
    } catch {
      toast.error("Erro ao alterar status do prazo.");
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deseja realmente excluir esta tarefa/prazo?")) return;
    setLoading(true);
    try {
      // Assuming prazosApi.excluir exists
      await prazosApi.excluir(prazo.id);
      toast.success("Prazo excluído com sucesso!");
      onAtualizar();
    } catch {
      toast.error("Você não tem permissão para excluir, ou ocorreu um erro.");
    } finally {
      setLoading(false);
    }
  };

  const Icon = prazo.prioridade === "alta" ? AlertCircle : prazo.concluido ? CheckCircle : Clock;
  const hoje = new Date().toISOString().split("T")[0];
  const atrasado = !prazo.concluido && prazo.data < hoje;
  return (
    <>
      <div className={cn(
      "rounded-xl border p-4 flex items-start gap-3 transition-all hover:border-primary/30",
      prazo.concluido ? "border-border/50 bg-muted/20 opacity-60" :
      atrasado ? "border-red-600/50 bg-red-600/5" :
      prazo.prioridade === "alta" ? "border-red-500/30 bg-red-500/5" :
      "border-border bg-card"
    )}>
      <div className={cn(
        "shrink-0 rounded-lg p-2 mt-0.5",
        prazo.concluido ? "bg-muted" :
        prazo.prioridade === "alta" ? "bg-red-500/15" :
        "bg-accent"
      )}>
        <Icon className={cn(
          "h-4 w-4",
          prazo.concluido ? "text-muted-foreground" :
          prazo.prioridade === "alta" ? "text-red-400" :
          "text-primary"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("font-medium text-sm", prazo.concluido ? "line-through text-muted-foreground" : "text-foreground")}>
            {prazo.titulo}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {atrasado && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-600/15 text-red-600 uppercase border border-red-600/30">Atrasado</span>
            )}
            {prazo.prioridade === "alta" && !atrasado && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/10 text-red-500 uppercase">Alta</span>}
            {prazo.prioridade === "media" && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-yellow-500/10 text-yellow-500 uppercase">Média</span>}
            {prazo.prioridade === "baixa" && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-500/10 text-green-500 uppercase">Baixa</span>}
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium hidden sm:inline-flex", tipoCor[prazo.tipo])}>
              {tipoLabel[prazo.tipo]}
            </span>
          </div>
        </div>
        {prazo.processoNumero && (
          <div className="flex items-center gap-1 mt-1">
            <Scale className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-mono">{prazo.processoNumero.slice(0, 16)}…</p>
          </div>
        )}
        {prazo.clienteNome && !prazo.processoNumero && (
          <p className="text-xs text-muted-foreground mt-0.5">{prazo.clienteNome}</p>
        )}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {new Date(prazo.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            {prazo.hora && ` · ${prazo.hora}`}
          </span>
          <div className="flex items-center gap-2">
            {!prazo.concluido && (
              <Button size="sm" variant="ghost" onClick={handleConcluir} disabled={loading} className="h-7 text-xs px-2.5 text-green-500 hover:text-green-600 hover:bg-green-500/10 gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Concluir
              </Button>
            )}
            {prazo.concluido && (
              <Button size="sm" variant="ghost" onClick={handleConcluir} disabled={loading} className="h-7 text-xs px-2.5 text-muted-foreground gap-1.5 opacity-50">
                Reabrir
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setEditando(true); }} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Editar">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleExcluir} disabled={loading} className="h-7 w-7 p-0 text-red-500/50 hover:bg-red-500/10 hover:text-red-600" title="Excluir">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
    {editando && (
      <EditarPrazoModal prazo={prazo} onClose={() => setEditando(false)} onSaved={() => { setEditando(false); onAtualizar(); }} />
    )}
    </>
  );
}

// ─── View Principal ───────────────────────────────────────────────────────────

type Filtro = "todos" | "pendentes" | "urgentes" | "concluidos";

export const PrazosView = () => {
  const [filtro, setFiltro] = useState<Filtro>("pendentes");
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [dataInicial, setDataInicial] = useState<string | undefined>();
  const [prazos, setPrazos] = useState<Prazo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarPrazos = useCallback(() => {
    setLoading(true);
    prazosApi.listar()
      .then((data) => {
        const items = data.content ?? data;
        setPrazos(Array.isArray(items) ? items : []);
      })
      .catch(() => setPrazos([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregarPrazos(); }, [carregarPrazos]);

  const prazosFiltrados = prazos.filter(p => {
    if (dataSelecionada) return p.data === dataSelecionada;
    if (filtro === "pendentes") return !p.concluido;
    if (filtro === "urgentes") return !p.concluido && p.prioridade === "alta";
    if (filtro === "concluidos") return p.concluido;
    return true;
  }).sort((a, b) => a.data.localeCompare(b.data));

  const handleClickDia = (data: string) => {
    setDataSelecionada(prev => prev === data ? null : data);
  };

  const handleAdicionar = (data?: string) => {
    setDataInicial(data);
    setModalAberto(true);
  };

  const filtros: Array<{ id: Filtro; label: string; count: number }> = [
    { id: "todos", label: "Todos", count: prazos.length },
    { id: "pendentes", label: "Pendentes", count: prazos.filter(p => !p.concluido).length },
    { id: "urgentes", label: "Urgentes", count: prazos.filter(p => !p.concluido && p.prioridade === "alta").length },
    { id: "concluidos", label: "Concluídos", count: prazos.filter(p => p.concluido).length },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Layout duas colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-2">
          <CalendarioPrazos
            prazos={prazos}
            onClickDia={handleClickDia}
            onAdicionar={() => handleAdicionar()}
          />
          {dataSelecionada && (
            <div className="mt-3 flex items-center justify-between px-1">
              <p className="text-sm text-muted-foreground">
                Filtrando: <span className="text-foreground font-medium">
                  {new Date(dataSelecionada + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                </span>
              </p>
              <button onClick={() => setDataSelecionada(null)} className="text-xs text-primary hover:underline">
                Limpar filtro
              </button>
            </div>
          )}
        </div>

        {/* Lista de prazos/tarefas */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filtros rápidos */}
          {!dataSelecionada && (
            <div className="flex gap-2 flex-wrap">
              {filtros.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFiltro(f.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    filtro === f.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {f.label} <span className="opacity-70">({f.count})</span>
                </button>
              ))}
              <Button size="sm" variant="outline" className="gap-1.5 ml-auto h-[30px]" onClick={() => handleAdicionar()}>
                <Plus className="h-3.5 w-3.5" /> Novo
              </Button>
            </div>
          )}

          {prazosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <CalendarClock className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhum prazo encontrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prazosFiltrados.map(p => <PrazoCard key={p.id} prazo={p} onAtualizar={carregarPrazos} />)}
            </div>
          )}
        </div>
      </div>

      {modalAberto && (
        <AdicionarPrazoModal
          dataInicial={dataInicial}
          onClose={() => setModalAberto(false)}
          onSaved={carregarPrazos}
        />
      )}
    </div>
  );
};
