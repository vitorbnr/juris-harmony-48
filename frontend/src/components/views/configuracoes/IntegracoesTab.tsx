import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Save,
  ShieldCheck,
  ShieldOff,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  integracoesApi,
  processosApi,
  usuariosApi,
  type IntegracaoDatajudResponse,
  type IntegracaoDomicilioResponse,
} from "@/services/api";
import type { Usuario } from "@/types";

const AMBIENTE_VALUE = "__AMBIENTE__";

const formatarDataHora = (valor?: string | null) => {
  if (!valor) return "Nao informado";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString("pt-BR");
};

const traduzirOrigem = (origem?: string | null) => {
  if (origem === "OPERADOR_INSTITUCIONAL") return "Operador institucional";
  if (origem === "AMBIENTE") return "Variavel de ambiente";
  return "Nao definido";
};

const traduzirStatus = (status?: string | null) => {
  if (!status) return "Sem historico";
  if (status === "SUCESSO") return "Sucesso";
  if (status === "ERRO") return "Erro";
  if (status === "PENDENTE") return "Pendente";
  return status;
};

export function IntegracoesTab() {
  const [config, setConfig] = useState<IntegracaoDomicilioResponse | null>(null);
  const [datajud, setDatajud] = useState<IntegracaoDatajudResponse | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [valorOperador, setValorOperador] = useState<string>(AMBIENTE_VALUE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingDatajudLote, setSyncingDatajudLote] = useState(false);
  const [reprocessandoProcessoId, setReprocessandoProcessoId] = useState<string | null>(null);

  const operadoresElegiveis = useMemo(
    () =>
      usuarios.filter(
        (usuario) =>
          usuario.ativo !== false &&
          usuario.habilitadoDomicilio === true &&
          Boolean(usuario.cpf),
      ),
    [usuarios],
  );

  const pendencias = useMemo(() => {
    if (!config) return [];
    return config.pendencias ?? [];
  }, [config]);

  const carregar = async () => {
    setLoading(true);
    try {
      const [datajudConfig, configuracao, usuariosData] = await Promise.all([
        integracoesApi.buscarDatajud(),
        integracoesApi.buscarDomicilio(),
        usuariosApi.listar(),
      ]);

      const items = (usuariosData as { content?: Usuario[] }).content ?? usuariosData;
      const listaUsuarios = Array.isArray(items) ? (items as Usuario[]) : [];

      setDatajud(datajudConfig);
      setUsuarios(listaUsuarios);
      setConfig(configuracao);
      setValorOperador(configuracao.operadorInstitucional?.id ?? AMBIENTE_VALUE);
    } catch (error) {
      console.error("Erro ao carregar configuracoes de integracao:", error);
      toast.error("Nao foi possivel carregar as configuracoes de integracao.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const salvarOperador = async () => {
    setSaving(true);
    try {
      const atualizada = await integracoesApi.atualizarDomicilio({
        usuarioOperadorId: valorOperador === AMBIENTE_VALUE ? null : valorOperador,
      });
      setConfig(atualizada);
      setValorOperador(atualizada.operadorInstitucional?.id ?? AMBIENTE_VALUE);
      toast.success("Configuracao institucional do Domicilio atualizada.");
    } catch (error) {
      console.error("Erro ao salvar operador do Domicilio:", error);
      toast.error("Nao foi possivel salvar a configuracao do Domicilio.");
    } finally {
      setSaving(false);
    }
  };

  const testarConexao = async () => {
    setTesting(true);
    try {
      const resultado = await integracoesApi.testarDomicilio();
      toast.success(
        `Teste read-only concluido: ${resultado.comunicacoesEncontradas} comunicacao(oes) retornada(s).`,
      );
      await carregar();
    } catch (error) {
      console.error("Erro ao testar conexao do Domicilio:", error);
      toast.error("Nao foi possivel validar a conexao read-only do Domicilio.");
    } finally {
      setTesting(false);
    }
  };

  const sincronizarDatajudEmLote = async () => {
    setSyncingDatajudLote(true);
    try {
      const resumo = await processosApi.sincronizarDatajudEmLote();
      toast.success(
        `Datajud reprocessado: ${resumo.movimentacoesNovas} movimentacao(oes) nova(s), ${resumo.falhas} falha(s).`,
      );
      await carregar();
    } catch (error) {
      console.error("Erro ao reprocessar Datajud em lote:", error);
      toast.error("Nao foi possivel reprocessar o Datajud agora.");
    } finally {
      setSyncingDatajudLote(false);
    }
  };

  const reprocessarProcessoDatajud = async (processoId?: string | null) => {
    if (!processoId) return;

    setReprocessandoProcessoId(processoId);
    try {
      const resultado = await processosApi.sincronizarDatajud(processoId);
      toast.success(
        `Processo reprocessado no Datajud. ${resultado.movimentacoesNovas} movimentacao(oes) nova(s).`,
      );
      await carregar();
    } catch (error) {
      console.error("Erro ao reprocessar processo no Datajud:", error);
      toast.error("Nao foi possivel reprocessar este processo no Datajud.");
    } finally {
      setReprocessandoProcessoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config || !datajud) {
    return (
      <Alert className="border-destructive/30 bg-destructive/5">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Falha ao carregar integracoes</AlertTitle>
        <AlertDescription>
          Nao foi possivel carregar o diagnostico das integracoes. Tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  const pronto = config.prontaParaConsumo;
  const datajudPronto = datajud.prontaParaConsumo;

  return (
    <div className="space-y-6">
      <Alert className="border-orange-500/30 bg-orange-500/5">
        <AlertTriangle className="h-4 w-4 text-orange-400" />
        <AlertTitle>Operacao somente leitura</AlertTitle>
        <AlertDescription>
          A integracao com o Domicilio foi preparada apenas para coleta e triagem. O sistema nao
          registra ciencia, nao abre comunicacao sensivel e nao executa qualquer acao que possa
          iniciar prazo automaticamente.
        </AlertDescription>
      </Alert>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">Saude do Datajud</h3>
              <Badge
                variant="outline"
                className={cn(
                  datajudPronto
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-400",
                )}
              >
                {datajudPronto ? "Operacional" : "Pendente"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              O Datajud alimenta capa e movimentacoes publicas. Aqui o escritorio acompanha falhas e reprocessa processos sem depender do log do servidor.
            </p>
          </div>

          <Button type="button" variant="outline" className="gap-2" onClick={sincronizarDatajudEmLote} disabled={syncingDatajudLote}>
            {syncingDatajudLote ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Reprocessar Datajud
          </Button>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Processos monitorados</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{datajud.processosMonitorados}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Saudaveis</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{datajud.processosSaudaveis}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Com erro</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{datajud.processosComErro}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pendentes</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{datajud.processosPendentes}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Config tecnica</p>
            <div className="mt-2 space-y-1">
              <p>Base URL: {datajud.baseUrl ?? "Nao configurada"}</p>
              <p>Cron atual: {datajud.cron ?? "Nao informado"}</p>
              <p>Janela de defasagem: {datajud.staleHours ?? 4} hora(s)</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline" className={datajud.baseUrlConfigurada ? "text-emerald-400" : "text-amber-400"}>
                base-url
              </Badge>
              <Badge variant="outline" className={datajud.apiKeyConfigurada ? "text-emerald-400" : "text-amber-400"}>
                api-key
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Ultimo sync do Datajud</p>
            <div className="mt-2 space-y-1">
              <p>Status: {traduzirStatus(datajud.ultimoSync?.status)}</p>
              <p>Ultima execucao: {formatarDataHora(datajud.ultimoSync?.ultimoSyncEm)}</p>
              <p>Ultimo sucesso: {formatarDataHora(datajud.ultimoSync?.ultimoSucessoEm)}</p>
              <p>Proxima tentativa: {formatarDataHora(datajud.ultimoSync?.proximoSyncEm)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-foreground">Falhas recentes do Datajud</h4>
            <span className="text-xs text-muted-foreground">
              {datajud.falhasRecentes.length} item(ns)
            </span>
          </div>

          {datajud.falhasRecentes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhuma falha recente registrada para processos monitorados no Datajud.
            </div>
          ) : (
            <div className="space-y-3">
              {datajud.falhasRecentes.map((falha) => (
                <div key={falha.syncId} className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{falha.processoNumero ?? "Processo nao identificado"}</p>
                      <p className="text-xs text-muted-foreground">{falha.clienteNome ?? "Cliente nao identificado"}</p>
                      <p className="text-xs text-muted-foreground">
                        Ultimo sync: {formatarDataHora(falha.ultimoSyncEm)} • Proxima tentativa: {formatarDataHora(falha.proximoSyncEm)}
                      </p>
                      <p className="text-xs text-amber-400">
                        Tentativas: {falha.tentativas ?? 0}
                      </p>
                      {falha.mensagem && <p className="text-xs text-muted-foreground">{falha.mensagem}</p>}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => reprocessarProcessoDatajud(falha.processoId)}
                      disabled={!falha.processoId || reprocessandoProcessoId === falha.processoId}
                    >
                      {reprocessandoProcessoId === falha.processoId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-4 w-4" />
                      )}
                      Reprocessar processo
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Prontidao</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {pronto ? "Operacional" : "Pendente"}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                pronto
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-400",
              )}
            >
              {config.enabled ? "Habilitada" : "Desabilitada"}
            </Badge>
          </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>Modo: somente leitura</p>
              <p>Origem efetiva do CPF: {traduzirOrigem(config.origemOnBehalfOf)}</p>
              <p>CPF efetivo: {config.onBehalfOfMascarado ?? "Nao resolvido"}</p>
              <p>Origem do tenantId: {config.tenantIdOrigem === "CONFIGURADO" ? "Variavel de ambiente" : "API /eu"}</p>
              <p>Cron atual: {config.cron ?? "Nao informado"}</p>
              <p>Janela de sync: {config.lookbackDays ?? 1} dia(s)</p>
            </div>
          </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ultimo sync</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {traduzirStatus(config.ultimoSync?.status)}
              </p>
            </div>
            <Workflow className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>Ultima execucao: {formatarDataHora(config.ultimoSync?.ultimoSyncEm)}</p>
            <p>Ultimo sucesso: {formatarDataHora(config.ultimoSync?.ultimoSucessoEm)}</p>
            <p>Proxima tentativa: {formatarDataHora(config.ultimoSync?.proximoSyncEm)}</p>
            <p>Tentativas em aberto: {config.ultimoSync?.tentativas ?? 0}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Config tecnica</p>
              <p className="mt-2 text-sm font-medium text-foreground break-all">
                {config.baseUrl ?? "Base URL nao configurada"}
              </p>
            </div>
            {pronto ? (
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            ) : (
              <ShieldOff className="h-5 w-5 text-amber-400" />
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className={config.baseUrlConfigurada ? "text-emerald-400" : "text-amber-400"}>
              base-url
            </Badge>
            <Badge variant="outline" className={config.tokenUrlConfigurada ? "text-emerald-400" : "text-amber-400"}>
              token-url
            </Badge>
            <Badge variant="outline" className={config.clientIdConfigurado ? "text-emerald-400" : "text-amber-400"}>
              client-id
            </Badge>
            <Badge
              variant="outline"
              className={config.clientSecretConfigurado ? "text-emerald-400" : "text-amber-400"}
            >
              client-secret
            </Badge>
            <Badge variant="outline" className={config.tenantIdConfigurado ? "text-emerald-400" : "text-muted-foreground"}>
              tenant-id
            </Badge>
            <Badge
              variant="outline"
              className={config.fallbackOnBehalfOfConfigurado ? "text-blue-400" : "text-muted-foreground"}
            >
              cpf ambiente
            </Badge>
          </div>
        </div>
      </div>

      {pendencias.length > 0 && (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <AlertTitle>Pontos pendentes para operacao</AlertTitle>
          <AlertDescription>
            <div className="space-y-1">
              {pendencias.map((pendencia) => (
                <p key={pendencia}>{pendencia}</p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {config.checklistAtivacao && config.checklistAtivacao.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">Checklist de ativacao</h3>
            <p className="text-sm text-muted-foreground">
              Este e o roteiro objetivo para segunda-feira, quando as credenciais reais do escritorio estiverem em maos.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {config.checklistAtivacao.map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-[11px] font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">Operador institucional</h3>
          <p className="text-sm text-muted-foreground">
            Selecione o usuario interno que representa o header <code>On-behalf-Of</code> nas
            chamadas oficiais. Se nada for selecionado, o sistema usa o CPF configurado no ambiente.
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="operador-domicilio">Usuario operador</Label>
            <Select value={valorOperador} onValueChange={setValorOperador}>
              <SelectTrigger id="operador-domicilio">
                <SelectValue placeholder="Selecione o operador institucional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AMBIENTE_VALUE}>Usar CPF institucional do ambiente</SelectItem>
                {operadoresElegiveis.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    {usuario.nome} {usuario.cpf ? `(${usuario.cpf})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="button" className="gap-2" onClick={salvarOperador} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>

          <Button type="button" variant="outline" className="gap-2" onClick={testarConexao} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Testar leitura
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/60 p-4 text-sm">
            <p className="font-medium text-foreground">Operador salvo</p>
            <p className="mt-2 text-muted-foreground">
              {config.operadorInstitucional
                ? `${config.operadorInstitucional.nome} • ${config.operadorInstitucional.cpfMascarado ?? "CPF nao informado"}`
                : "Nenhum operador institucional salvo. O sistema depende do CPF do ambiente."}
            </p>
            {!config.operadorInstitucionalValido && config.mensagemOperador && (
              <p className="mt-2 text-amber-400">{config.mensagemOperador}</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-background/60 p-4 text-sm">
            <p className="font-medium text-foreground">Guardrails permanentes</p>
            <div className="mt-2 space-y-1 text-muted-foreground">
              <p>1. Sem abertura automatica de inteiro teor.</p>
              <p>2. Sem registro de ciencia.</p>
              <p>3. Sem aceite automatico de comunicacao.</p>
            </div>
          </div>
        </div>
      </div>

      {config.ultimoSync?.mensagem && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Ultima mensagem da integracao</p>
              <p className="text-sm text-muted-foreground">{config.ultimoSync.mensagem}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
