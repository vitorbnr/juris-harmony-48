import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle, Clock, ChevronRight, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { honorarios, custas, lancamentos } from "@/data/mockData";
import { useUnidade } from "@/context/UnidadeContext";
import type { StatusHonorario, TipoHonorario } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

// ─── Config ───────────────────────────────────────────────────────────────────

const statusCfg: Record<StatusHonorario, { label: string; class: string; icon: React.ElementType }> = {
  ativo:      { label: "Ativo",      class: "bg-primary/15 text-primary border-primary/20",        icon: Clock },
  pago:       { label: "Pago",       class: "bg-green-500/15 text-green-400 border-green-500/20",  icon: CheckCircle },
  em_atraso:  { label: "Em Atraso",  class: "bg-red-500/15 text-red-400 border-red-500/20",        icon: AlertCircle },
  pendente:   { label: "Contingência",class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", icon: Clock },
};

const tipoLabel: Record<TipoHonorario, string> = {
  fixo: "Fixo", parcelado: "Parcelado", recorrente: "Recorrente", risco: "Risco (%)  ",
};

const tipoCustasLabel: Record<string, string> = {
  distribuicao: "Distribuição", pericia: "Perícia", diligencia: "Diligência",
  certidao: "Certidão", publicacao: "Publicação", outros: "Outros",
};

const catLancamento: Record<string, string> = {
  honorario: "Honorário", custa: "Custa", reembolso: "Reembolso", salario: "Salário",
  aluguel: "Aluguel", material: "Material", servico: "Serviço", outros: "Outros",
};

// ─── Gráfico mensal ──────────────────────────────────────────────────────────

const dadosMensais = [
  { mes: "Out", entradas: 9200,  saidas: 7800 },
  { mes: "Nov", entradas: 11500, saidas: 8200 },
  { mes: "Dez", entradas: 8800,  saidas: 9100 },
  { mes: "Jan", entradas: 12400, saidas: 8500 },
  { mes: "Fev", entradas: 10200, saidas: 7600 },
  { mes: "Mar", entradas: 10335, saidas: 14640 },
];

// ─── Aba Honorários ──────────────────────────────────────────────────────────

function TabHonorarios({ unidadeId }: { unidadeId: string }) {
  const filtrados = unidadeId === "todas"
    ? honorarios
    : honorarios.filter(h => h.unidadeId === unidadeId);

  const totalReceber = filtrados.filter(h => h.status === "ativo" || h.status === "em_atraso")
    .reduce((s, h) => s + (h.valorParcela ?? h.valorTotal), 0);
  const totalAtraso  = filtrados.filter(h => h.status === "em_atraso").reduce((s, h) => s + (h.valorParcela ?? h.valorTotal), 0);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "A Receber", value: fmt(totalReceber), icon: TrendingUp,  cls: "text-primary bg-primary/10" },
          { label: "Em Atraso", value: fmt(totalAtraso),  icon: AlertCircle, cls: "text-red-400 bg-red-500/10" },
          { label: "Contratos",  value: `${filtrados.length} ativos`, icon: DollarSign, cls: "text-muted-foreground bg-muted" },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", c.cls)}>
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-semibold text-foreground">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs">Cliente</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs hidden md:table-cell">Processo</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs">Tipo</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs hidden lg:table-cell">Parcelas</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs">Valor</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs">Status</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs hidden xl:table-cell">Próx. Vcto</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(h => {
              const conf = statusCfg[h.status];
              const Icon = conf.icon;
              return (
                <tr key={h.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-foreground">{h.clienteNome}</p>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="font-mono text-xs text-muted-foreground">{h.processoNumero ?? "—"}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-foreground">{tipoLabel[h.tipo]}</span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    {h.parcelasTotal > 1 ? (
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          {h.parcelasPagas}/{h.parcelasTotal}
                        </div>
                        <div className="w-24 bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{ width: `${(h.parcelasPagas / h.parcelasTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Único</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-foreground">
                    {h.tipo === "risco"
                      ? `${h.percentual}%`
                      : (h.valorParcela ?? h.valorTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    }
                    {h.parcelasTotal > 1 && <span className="text-xs text-muted-foreground font-normal">/mês</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium", conf.class)}>
                      <Icon className="h-3 w-3" />{conf.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden xl:table-cell text-sm text-muted-foreground">
                    {h.proximoVencimento ? new Date(h.proximoVencimento + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Aba Custas ───────────────────────────────────────────────────────────────

function TabCustas({ unidadeId }: { unidadeId: string }) {
  const filtradas = unidadeId === "todas"
    ? custas
    : custas.filter(c => c.unidadeId === unidadeId);

  const totalPago = filtradas.reduce((s, c) => s + c.valor, 0);
  const aReembolsar = filtradas.filter(c => c.reembolsavel && !c.reembolsado).reduce((s, c) => s + c.valor, 0);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Desembolsado", value: fmt(totalPago), icon: TrendingDown, cls: "text-red-400 bg-red-500/10" },
          { label: "A Reembolsar",       value: fmt(aReembolsar), icon: TrendingUp, cls: "text-primary bg-primary/10" },
          { label: "Lançamentos",        value: `${filtradas.length}`, icon: DollarSign, cls: "text-muted-foreground bg-muted" },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", c.cls)}>
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-semibold text-foreground">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs">Processo / Cliente</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs">Descrição</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs hidden md:table-cell">Tipo</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs">Valor</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs hidden lg:table-cell">Data</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs">Situação</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map(c => (
              <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-foreground">{c.clienteNome}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{c.processoNumero.slice(0, 14)}…</p>
                </td>
                <td className="px-5 py-3.5 text-foreground">{c.descricao}</td>
                <td className="px-5 py-3.5 hidden md:table-cell">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-foreground">{tipoCustasLabel[c.tipo]}</span>
                </td>
                <td className="px-5 py-3.5 font-semibold text-foreground">
                  {c.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td className="px-5 py-3.5 hidden lg:table-cell text-sm text-muted-foreground">
                  {new Date(c.data + "T00:00:00").toLocaleDateString("pt-BR")}
                </td>
                <td className="px-5 py-3.5">
                  {!c.reembolsavel ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Não reembolsável</span>
                  ) : c.reembolsado ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Reembolsado</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">A reembolsar</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Aba Fluxo de Caixa ──────────────────────────────────────────────────────

function TabFluxo({ unidadeId }: { unidadeId: string }) {
  const filtrados = unidadeId === "todas"
    ? lancamentos
    : lancamentos.filter(l => l.unidadeId === unidadeId);

  const entradas = filtrados.filter(l => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
  const saidas   = filtrados.filter(l => l.tipo === "saida").reduce((s, l) => s + l.valor, 0);
  const saldo    = entradas - saidas;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Saldo do Mês",     value: fmt(saldo),    icon: DollarSign,  cls: saldo >= 0 ? "text-primary bg-primary/10" : "text-red-400 bg-red-500/10" },
          { label: "Entradas (Mar)",   value: fmt(entradas), icon: TrendingUp,   cls: "text-primary bg-primary/10" },
          { label: "Saídas (Mar)",     value: fmt(saidas),   icon: TrendingDown, cls: "text-red-400 bg-red-500/10" },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", c.cls)}>
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-semibold text-foreground">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground text-sm mb-4">Entradas × Saídas — Últimos 6 meses</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dadosMensais} barSize={20} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number) => [value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), ""]}
            />
            <Bar dataKey="entradas" name="Entradas" fill="#7aab8a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidas"   name="Saídas"   fill="#e07070" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Últimos lançamentos */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Últimos Lançamentos</h3>
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
            <Plus className="h-3 w-3" /> Lançamento
          </Button>
        </div>
        <div className="divide-y divide-border/50">
          {filtrados.slice(0, 8).map(l => (
            <div key={l.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  l.tipo === "entrada" ? "bg-primary/10" : "bg-red-500/10"
                )}>
                  {l.tipo === "entrada"
                    ? <TrendingUp className="h-4 w-4 text-primary" />
                    : <TrendingDown className="h-4 w-4 text-red-400" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{l.descricao}</p>
                  <p className="text-xs text-muted-foreground">{catLancamento[l.categoria]} · {new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <span className={cn("font-semibold text-sm", l.tipo === "entrada" ? "text-primary" : "text-red-400")}>
                {l.tipo === "entrada" ? "+" : "−"}
                {l.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── View Principal ───────────────────────────────────────────────────────────

type AbaFin = "honorarios" | "custas" | "fluxo";

const abas: { id: AbaFin; label: string }[] = [
  { id: "honorarios", label: "Honorários" },
  { id: "custas",     label: "Custas Processuais" },
  { id: "fluxo",      label: "Fluxo de Caixa" },
];

export const FinanceiroView = () => {
  const [abaAtiva, setAbaAtiva] = useState<AbaFin>("honorarios");
  const { unidadeSelecionada } = useUnidade();

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Abas */}
      <div className="flex gap-1 border-b border-border -mb-6 pb-0">
        {abas.map(aba => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
              abaAtiva === aba.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {aba.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {abaAtiva === "honorarios" && <TabHonorarios unidadeId={unidadeSelecionada} />}
        {abaAtiva === "custas"     && <TabCustas     unidadeId={unidadeSelecionada} />}
        {abaAtiva === "fluxo"      && <TabFluxo      unidadeId={unidadeSelecionada} />}
      </div>
    </div>
  );
};
