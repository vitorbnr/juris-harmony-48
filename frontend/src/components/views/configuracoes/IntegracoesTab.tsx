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
import { integracoesApi, usuariosApi, type IntegracaoDomicilioResponse } from "@/services/api";
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
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [valorOperador, setValorOperador] = useState<string>(AMBIENTE_VALUE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

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

    const itens: string[] = [];
    if (!config.enabled) itens.push("Integracao desabilitada no ambiente.");
    if (!config.baseUrlConfigurada) itens.push("Base URL do Domicilio nao configurada.");
    if (!config.tokenUrlConfigurada) itens.push("Token URL do Domicilio nao configurada.");
    if (!config.clientIdConfigurado) itens.push("Client ID nao configurado.");
    if (!config.clientSecretConfigurado) itens.push("Client secret nao configurado.");
    if (!config.onBehalfOfMascarado) itens.push("Nenhum CPF operador efetivo foi resolvido.");
    if (!config.operadorInstitucionalValido && config.mensagemOperador) itens.push(config.mensagemOperador);
    return itens;
  }, [config]);

  const carregar = async () => {
    setLoading(true);
    try {
      const [configuracao, usuariosData] = await Promise.all([
        integracoesApi.buscarDomicilio(),
        usuariosApi.listar(),
      ]);

      const items = (usuariosData as { content?: Usuario[] }).content ?? usuariosData;
      const listaUsuarios = Array.isArray(items) ? (items as Usuario[]) : [];

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

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <Alert className="border-destructive/30 bg-destructive/5">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Falha ao carregar integracoes</AlertTitle>
        <AlertDescription>
          Nao foi possivel carregar o diagnostico do Domicilio. Tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  const pronto = config.prontaParaConsumo;

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
            <p>Cron atual: {config.cron ?? "Nao informado"}</p>
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
