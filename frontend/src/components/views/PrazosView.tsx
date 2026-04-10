import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle,
  Clock,
  ListChecks,
  MoveLeft,
  MoveRight,
  Pencil,
  Plus,
  Scale,
  SquareKanban,
  X,
} from "lucide-react";

import { CalendarioPrazos } from "@/components/prazos/CalendarioPrazos";
import { EditarPrazoModal } from "@/components/modals/EditarPrazoModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { prazosApi, processosApi } from "@/services/api";
import { toast } from "sonner";
import type { EtapaPrazo, Prazo, PrioridadePrazo, TipoPrazo } from "@/types";

function AdicionarPrazoModal({
  dataInicial,
  onClose,
  onSaved,
}: {
  dataInicial?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
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
    processosApi
      .listar({ size: 1000 })
      .then((res) => {
        const items = res.content ?? res;
        setProcessosLista(Array.isArray(items) ? items : []);
      })
      .catch(() => {});
  }, []);

  const handleSalvar = async () => {
    if (!titulo.trim() || !data) {
      toast.error("Titulo e data sao obrigatorios.");
      return;
    }

    setSaving(true);
    try {
      await prazosApi.criar({
        titulo: titulo.trim(),
        data,
        hora: hora || null,
        tipo,
        prioridade,
        processoId: processoId || null,
        descricao: descricao || null,
        advogadoId: user?.id,
        unidadeId: user?.unidadeId,
        etapa: tipo === "tarefa_interna" ? "A_FAZER" : null,
      });
      toast.success("Prazo cadastrado com sucesso.");
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { mensagem?: string } } };
      toast.error(axiosErr.response?.data?.mensagem || "Erro ao cadastrar prazo.");
    } finally {
      setSaving(false);
    }
  };

  const tipoLabels: Record<TipoPrazo, string> = {
    prazo_processual: "Prazo processual",
    audiencia: "Audiencia",
    tarefa_interna: "Tarefa interna",
    reuniao: "Reuniao",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="text-lg font-semibold text-foreground">Novo prazo / tarefa</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label>Titulo *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hora</Label>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(tipoLabels) as TipoPrazo[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTipo(item)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-all",
                    tipo === item
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {tipoLabels[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <div className="flex gap-2">
              {(["alta", "media", "baixa"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPrioridade(item)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm transition-all",
                    prioridade === item
                      ? item === "alta"
                        ? "border-red-500/50 bg-red-500/10 text-red-400"
                        : item === "media"
                        ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
                        : "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {item === "alta" ? "Alta" : item === "media" ? "Media" : "Baixa"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Processo vinculado</Label>
            <select
              value={processoId}
              onChange={(e) => setProcessoId(e.target.value)}
              className="h-10 w-full rounded-md bg-secondary px-3 text-sm text-foreground outline-none"
            >
              <option value="">Nenhum processo</option>
              {processosLista.map((processo) => (
                <option key={processo.id} value={processo.id}>
                  {processo.numero} - {processo.clienteNome}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Descricao</Label>
            <textarea
              className="min-h-[120px] w-full rounded-md bg-secondary px-3 py-2 text-sm text-foreground outline-none"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4">
          <Button className="flex-1" onClick={handleSalvar} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

const tipoCor: Record<string, string> = {
  prazo_processual: "bg-red-500/10 text-red-400",
  audiencia: "bg-blue-500/10 text-blue-400",
  tarefa_interna: "bg-primary/10 text-primary",
  reuniao: "bg-purple-500/10 text-purple-400",
};

const tipoLabel: Record<string, string> = {
  prazo_processual: "Prazo processual",
  audiencia: "Audiencia",
  tarefa_interna: "Tarefa interna",
  reuniao: "Reuniao",
};

const etapaLabel: Record<EtapaPrazo, string> = {
  a_fazer: "A Fazer",
  em_andamento: "Em andamento",
  concluido: "Concluido",
};

function PrazoCard({ prazo, onAtualizar }: { prazo: Prazo; onAtualizar: () => void }) {
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(false);

  const handleConcluir = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await prazosApi.concluir(prazo.id);
      toast.success(prazo.concluido ? "Prazo reaberto." : "Prazo concluido.");
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
      await prazosApi.excluir(prazo.id);
      toast.success("Prazo excluido com sucesso.");
      onAtualizar();
    } catch {
      toast.error("Nao foi possivel excluir este item.");
    } finally {
      setLoading(false);
    }
  };

  const icon = prazo.prioridade === "alta" ? AlertCircle : prazo.concluido ? CheckCircle : Clock;
  const Icon = icon;
  const hoje = new Date().toISOString().slice(0, 10);
  const atrasado = !prazo.concluido && prazo.data < hoje;

  return (
    <>
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border p-4 transition-all hover:border-primary/30",
          prazo.concluido
            ? "border-border/50 bg-muted/20 opacity-60"
            : atrasado
            ? "border-red-600/50 bg-red-600/5"
            : prazo.prioridade === "alta"
            ? "border-red-500/30 bg-red-500/5"
            : "border-border bg-card",
        )}
      >
        <div
          className={cn(
            "mt-0.5 rounded-lg p-2",
            prazo.concluido
              ? "bg-muted"
              : prazo.prioridade === "alta"
              ? "bg-red-500/15"
              : "bg-accent",
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              prazo.concluido
                ? "text-muted-foreground"
                : prazo.prioridade === "alta"
                ? "text-red-400"
                : "text-primary",
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-sm font-medium", prazo.concluido ? "text-muted-foreground line-through" : "text-foreground")}>
              {prazo.titulo}
            </p>
            <div className="flex items-center gap-1.5">
              {prazo.etapa && prazo.tipo === "tarefa_interna" && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                  {etapaLabel[prazo.etapa]}
                </span>
              )}
              <span className={cn("hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-flex", tipoCor[prazo.tipo])}>
                {tipoLabel[prazo.tipo]}
              </span>
            </div>
          </div>

          {prazo.processoNumero && (
            <div className="mt-1 flex items-center gap-1">
              <Scale className="h-3 w-3 text-muted-foreground" />
              <p className="font-mono text-xs text-muted-foreground">{prazo.processoNumero.slice(0, 20)}</p>
            </div>
          )}

          {prazo.clienteNome && !prazo.processoNumero && (
            <p className="mt-1 text-xs text-muted-foreground">{prazo.clienteNome}</p>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {new Date(`${prazo.data}T00:00:00`).toLocaleDateString("pt-BR")}
              {prazo.hora ? ` - ${prazo.hora}` : ""}
            </span>
            <div className="flex items-center gap-2">
              {!prazo.concluido && (
                <Button size="sm" variant="ghost" onClick={handleConcluir} disabled={loading} className="h-7 gap-1.5 px-2.5 text-xs text-green-500 hover:bg-green-500/10 hover:text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Concluir
                </Button>
              )}
              {prazo.concluido && (
                <Button size="sm" variant="ghost" onClick={handleConcluir} disabled={loading} className="h-7 px-2.5 text-xs text-muted-foreground">
                  Reabrir
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setEditando(true)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleExcluir} disabled={loading} className="h-7 w-7 p-0 text-red-500/60 hover:bg-red-500/10 hover:text-red-600">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {editando && (
        <EditarPrazoModal
          prazo={prazo}
          onClose={() => setEditando(false)}
          onSaved={() => {
            setEditando(false);
            onAtualizar();
          }}
        />
      )}
    </>
  );
}

function TarefaKanbanCard({ prazo, onAtualizar }: { prazo: Prazo; onAtualizar: () => void }) {
  const [loading, setLoading] = useState(false);
  const etapaAtual = prazo.etapa ?? (prazo.concluido ? "concluido" : "a_fazer");

  const mover = async (etapa: EtapaPrazo) => {
    setLoading(true);
    try {
      await prazosApi.atualizarEtapa(prazo.id, etapa.toUpperCase());
      onAtualizar();
    } catch {
      toast.error("Nao foi possivel mover a tarefa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{prazo.titulo}</p>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            {etapaLabel[etapaAtual]}
          </span>
        </div>

        {prazo.processoNumero && (
          <p className="font-mono text-[11px] text-muted-foreground">{prazo.processoNumero}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {new Date(`${prazo.data}T00:00:00`).toLocaleDateString("pt-BR")}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          {etapaAtual !== "a_fazer" && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => mover("a_fazer")} disabled={loading}>
              <MoveLeft className="h-3.5 w-3.5" />
              Voltar
            </Button>
          )}
          {etapaAtual === "a_fazer" && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => mover("em_andamento")} disabled={loading}>
              <MoveRight className="h-3.5 w-3.5" />
              Iniciar
            </Button>
          )}
          {etapaAtual === "em_andamento" && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => mover("concluido")} disabled={loading}>
              <CheckCircle className="h-3.5 w-3.5" />
              Concluir
            </Button>
          )}
          {etapaAtual === "concluido" && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => mover("em_andamento")} disabled={loading}>
              <MoveLeft className="h-3.5 w-3.5" />
              Reabrir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type Filtro = "todos" | "pendentes" | "urgentes" | "concluidos";
type ModoVisualizacao = "lista" | "kanban";

export const PrazosView = () => {
  const [filtro, setFiltro] = useState<Filtro>("pendentes");
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>("lista");
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [dataInicial, setDataInicial] = useState<string | undefined>();
  const [prazos, setPrazos] = useState<Prazo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarPrazos = useCallback(() => {
    setLoading(true);
    prazosApi
      .listar({ size: 1000 })
      .then((data) => {
        const items = data.content ?? data;
        setPrazos(Array.isArray(items) ? items : []);
      })
      .catch(() => setPrazos([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregarPrazos();
  }, [carregarPrazos]);

  const prazosFiltrados = prazos
    .filter((prazo) => {
      if (dataSelecionada) return prazo.data === dataSelecionada;
      if (filtro === "pendentes") return !prazo.concluido;
      if (filtro === "urgentes") return !prazo.concluido && prazo.prioridade === "alta";
      if (filtro === "concluidos") return prazo.concluido;
      return true;
    })
    .sort((a, b) => a.data.localeCompare(b.data));

  const tarefasKanban = prazos
    .filter((prazo) => prazo.tipo === "tarefa_interna")
    .sort((a, b) => a.data.localeCompare(b.data));

  const tarefasPorEtapa: Record<EtapaPrazo, Prazo[]> = {
    a_fazer: tarefasKanban.filter((prazo) => (prazo.etapa ?? (prazo.concluido ? "concluido" : "a_fazer")) === "a_fazer"),
    em_andamento: tarefasKanban.filter((prazo) => (prazo.etapa ?? (prazo.concluido ? "concluido" : "a_fazer")) === "em_andamento"),
    concluido: tarefasKanban.filter((prazo) => (prazo.etapa ?? (prazo.concluido ? "concluido" : "a_fazer")) === "concluido"),
  };

  const filtros: Array<{ id: Filtro; label: string; count: number }> = [
    { id: "todos", label: "Todos", count: prazos.length },
    { id: "pendentes", label: "Pendentes", count: prazos.filter((prazo) => !prazo.concluido).length },
    { id: "urgentes", label: "Urgentes", count: prazos.filter((prazo) => !prazo.concluido && prazo.prioridade === "alta").length },
    { id: "concluidos", label: "Concluidos", count: prazos.filter((prazo) => prazo.concluido).length },
  ];

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <CalendarioPrazos prazos={prazos} onClickDia={(data) => setDataSelecionada((current) => (current === data ? null : data))} onAdicionar={() => setModalAberto(true)} />
          {dataSelecionada && (
            <div className="mt-3 flex items-center justify-between px-1">
              <p className="text-sm text-muted-foreground">
                Filtrando:{" "}
                <span className="font-medium text-foreground">
                  {new Date(`${dataSelecionada}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                </span>
              </p>
              <button type="button" onClick={() => setDataSelecionada(null)} className="text-xs text-primary hover:underline">
                Limpar filtro
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={modoVisualizacao === "lista" ? "default" : "outline"} className="gap-1.5" onClick={() => setModoVisualizacao("lista")}>
              <ListChecks className="h-3.5 w-3.5" />
              Lista
            </Button>
            <Button size="sm" variant={modoVisualizacao === "kanban" ? "default" : "outline"} className="gap-1.5" onClick={() => setModoVisualizacao("kanban")}>
              <SquareKanban className="h-3.5 w-3.5" />
              Kanban de tarefas
            </Button>
            <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={() => { setDataInicial(undefined); setModalAberto(true); }}>
              <Plus className="h-3.5 w-3.5" />
              Novo
            </Button>
          </div>

          {modoVisualizacao === "lista" && !dataSelecionada && (
            <div className="flex flex-wrap gap-2">
              {filtros.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFiltro(item.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    filtro === item.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {item.label} <span className="opacity-70">({item.count})</span>
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : modoVisualizacao === "kanban" ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                Tarefas internas podem ser criadas automaticamente a partir da Inbox Juridica. O quadro abaixo organiza a execucao da equipe sem transformar automaticamente qualquer comunicacao em prazo fatal.
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                {(Object.keys(tarefasPorEtapa) as EtapaPrazo[]).map((etapa) => (
                  <div key={etapa} className="rounded-2xl border border-border bg-background/60 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{etapaLabel[etapa]}</h3>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {tarefasPorEtapa[etapa].length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {tarefasPorEtapa[etapa].length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                          Nenhuma tarefa nesta etapa.
                        </div>
                      ) : (
                        tarefasPorEtapa[etapa].map((prazo) => (
                          <TarefaKanbanCard key={prazo.id} prazo={prazo} onAtualizar={carregarPrazos} />
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : prazosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <CalendarClock className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhum prazo encontrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prazosFiltrados.map((prazo) => (
                <PrazoCard key={prazo.id} prazo={prazo} onAtualizar={carregarPrazos} />
              ))}
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
