import { useEffect, useState } from "react";
import { Plus, UserPlus, X } from "lucide-react";

import { EtiquetasEditor } from "@/components/EtiquetasEditor";
import { PartesProcessoEditor, mapProcessoPartesToForm, sanitizeProcessoPartesForApi } from "@/components/PartesProcessoEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskCurrency, parseCurrency } from "@/lib/masks";
import { processosApi, usuariosApi } from "@/services/api";
import type { Processo, ProcessoParteFormValue } from "@/types";
import { toast } from "sonner";

const statusOpcoes = [
  { value: "EM_ANDAMENTO", label: "Em Andamento" },
  { value: "AGUARDANDO", label: "Aguardando" },
  { value: "URGENTE", label: "Urgente" },
  { value: "CONCLUIDO", label: "Concluido" },
  { value: "SUSPENSO", label: "Suspenso" },
  { value: "ARQUIVADO", label: "Arquivado" },
];

const tiposMovimentacao = [
  { value: "DESPACHO", label: "Despacho" },
  { value: "SENTENCA", label: "Sentenca" },
  { value: "AUDIENCIA", label: "Audiencia" },
  { value: "PETICAO", label: "Peticao" },
  { value: "PUBLICACAO", label: "Publicacao" },
  { value: "OUTRO", label: "Outro" },
];

interface Props {
  processo: Processo;
  onClose: () => void;
  onSaved: () => void;
}

type Tab = "dados" | "status" | "movimentacao";

export function EditarProcessoModal({ processo, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>("dados");
  const [loading, setLoading] = useState(false);
  const [todosAdvogados, setTodosAdvogados] = useState<{ id: string; nome: string }[]>([]);
  const [advogadosError, setAdvogadosError] = useState("");
  const [etiquetas, setEtiquetas] = useState<string[]>(processo.etiquetas ?? []);
  const [partes, setPartes] = useState<ProcessoParteFormValue[]>(() => mapProcessoPartesToForm(processo.partes));

  const [form, setForm] = useState({
    vara: processo.vara ?? "",
    tribunal: processo.tribunal ?? "",
    valorCausa: processo.valorCausa ? maskCurrency(Number(processo.valorCausa).toFixed(2).replace(".", "")) : "",
    descricao: processo.descricao ?? "",
    status: processo.status,
  });

  const [advogadosSelecionados, setAdvogadosSelecionados] = useState<{ id: string; nome: string }[]>(
    processo.advogados ?? (processo.advogadoId ? [{ id: processo.advogadoId, nome: processo.advogadoNome ?? "" }] : []),
  );
  const [advogadoSelecionarId, setAdvogadoSelecionarId] = useState("");

  const [mov, setMov] = useState({
    data: new Date().toISOString().split("T")[0],
    descricao: "",
    tipo: "DESPACHO",
  });

  useEffect(() => {
    usuariosApi.listar().then((data: { id: string; nome: string; papel: string }[]) => {
      setTodosAdvogados(data.filter(u => u.papel === "ADVOGADO" || u.papel === "ADMINISTRADOR"));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setEtiquetas(processo.etiquetas ?? []);
    setPartes(mapProcessoPartesToForm(processo.partes));
    setForm({
      vara: processo.vara ?? "",
      tribunal: processo.tribunal ?? "",
      valorCausa: processo.valorCausa ? maskCurrency(Number(processo.valorCausa).toFixed(2).replace(".", "")) : "",
      descricao: processo.descricao ?? "",
      status: processo.status,
    });
    setAdvogadosSelecionados(
      processo.advogados ?? (processo.advogadoId ? [{ id: processo.advogadoId, nome: processo.advogadoNome ?? "" }] : []),
    );
  }, [processo]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const adicionarAdvogado = () => {
    if (!advogadoSelecionarId) return;
    const adv = todosAdvogados.find(a => a.id === advogadoSelecionarId);
    if (!adv || advogadosSelecionados.some(a => a.id === adv.id)) return;

    setAdvogadosSelecionados(prev => [...prev, adv]);
    setAdvogadosError("");
    setAdvogadoSelecionarId("");
  };

  const removerAdvogado = (id: string) => {
    setAdvogadosSelecionados(prev => prev.filter(a => a.id !== id));
  };

  const advogadosDisponiveis = todosAdvogados.filter(a => !advogadosSelecionados.some(s => s.id === a.id));

  const salvarDados = async () => {
    if (advogadosSelecionados.length === 0) {
      const message = "Selecione ao menos um advogado responsável.";
      setAdvogadosError(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    try {
      await processosApi.atualizar(processo.id, {
        vara: form.vara || null,
        tribunal: form.tribunal || null,
        valorCausa: form.valorCausa ? parseCurrency(form.valorCausa) : null,
        descricao: form.descricao || null,
        advogadoIds: advogadosSelecionados.map(a => a.id),
        etiquetas,
        partes: sanitizeProcessoPartesForApi(partes),
      });
      toast.success("Processo atualizado!");
      onSaved();
      onClose();
    } catch {
      toast.error("Erro ao salvar alteracoes");
    } finally {
      setLoading(false);
    }
  };

  const salvarStatus = async () => {
    setLoading(true);
    try {
      await processosApi.alterarStatus(processo.id, form.status);
      toast.success("Status atualizado!");
      onSaved();
      onClose();
    } catch {
      toast.error("Erro ao alterar status");
    } finally {
      setLoading(false);
    }
  };

  const salvarMovimentacao = async () => {
    if (!mov.descricao.trim()) {
      toast.error("Descricao e obrigatoria");
      return;
    }

    setLoading(true);
    try {
      await processosApi.adicionarMovimentacao(processo.id, mov);
      toast.success("Movimentacao registrada!");
      onSaved();
      onClose();
    } catch {
      toast.error("Erro ao registrar movimentacao");
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "dados", label: "Editar Dados" },
    { id: "status", label: "Alterar Status" },
    { id: "movimentacao", label: "+ Movimentacao" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Gerenciar Processo</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{processo.numero}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex border-b border-border px-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === "dados" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Vara</Label>
                  <Input value={form.vara} onChange={e => set("vara", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tribunal</Label>
                  <Input value={form.tribunal} onChange={e => set("tribunal", e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Valor da Causa</Label>
                <Input
                  type="text"
                  placeholder="R$ 0,00"
                  value={form.valorCausa}
                  onChange={e => set("valorCausa", maskCurrency(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Advogados Responsaveis *</Label>

                {advogadosSelecionados.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {advogadosSelecionados.map(a => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium border border-primary/25"
                      >
                        {a.nome}
                        <button
                          type="button"
                          onClick={() => removerAdvogado(a.id)}
                          className="hover:text-destructive transition-colors ml-0.5"
                          aria-label={`Remover ${a.nome}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs ${advogadosError ? "text-destructive" : "text-muted-foreground"}`}>
                    {advogadosError || "Selecione ao menos um advogado responsável."}
                  </p>
                )}

                {advogadosDisponiveis.length > 0 && (
                  <div className="flex gap-2">
                    <select
                      value={advogadoSelecionarId}
                      onChange={e => setAdvogadoSelecionarId(e.target.value)}
                      className="flex-1 h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
                    >
                      <option value="">- Adicionar advogado -</option>
                      {advogadosDisponiveis.map(a => (
                        <option key={a.id} value={a.id}>{a.nome}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={adicionarAdvogado}
                      disabled={!advogadoSelecionarId}
                      className="h-10 w-10 shrink-0"
                      aria-label="Adicionar advogado"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Descricao</Label>
                <textarea
                  className="w-full px-3 py-2 rounded-md bg-secondary text-foreground text-sm resize-none border-none outline-none"
                  rows={3}
                  value={form.descricao}
                  onChange={e => set("descricao", e.target.value)}
                />
              </div>

              <EtiquetasEditor value={etiquetas} onChange={setEtiquetas} />

              <PartesProcessoEditor
                value={partes}
                onChange={setPartes}
                advogadosInternos={advogadosSelecionados}
              />
            </>
          )}

          {tab === "status" && (
            <div className="space-y-3">
              <Label>Selecione o novo status</Label>
              <div className="grid grid-cols-2 gap-2">
                {statusOpcoes.map(s => (
                  <button
                    key={s.value}
                    onClick={() => set("status", s.value)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium border transition-all text-left ${
                      form.status === s.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {s.label}
                    {processo.status === s.value && (
                      <span className="block text-[10px] opacity-60 mt-0.5">Status atual</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "movimentacao" && (
            <>
              <div className="space-y-1.5">
                <Label>Tipo de Movimentacao</Label>
                <select
                  value={mov.tipo}
                  onChange={e => setMov(m => ({ ...m, tipo: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md bg-secondary text-foreground text-sm border-none outline-none"
                >
                  {tiposMovimentacao.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input type="date" value={mov.data} onChange={e => setMov(m => ({ ...m, data: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Descricao da Movimentacao *</Label>
                <textarea
                  className="w-full px-3 py-2 rounded-md bg-secondary text-foreground text-sm resize-none border-none outline-none"
                  rows={4}
                  placeholder="Descreva a movimentacao processual..."
                  value={mov.descricao}
                  onChange={e => setMov(m => ({ ...m, descricao: e.target.value }))}
                />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button
            className="flex-1"
            disabled={loading}
            onClick={
              tab === "dados" ? salvarDados
                : tab === "status" ? salvarStatus
                  : salvarMovimentacao
            }
          >
            {loading ? "Salvando..." : tab === "movimentacao" ? (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Registrar Movimentacao
              </>
            ) : "Salvar Alteracoes"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}
