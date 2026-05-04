import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCcw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { publicacoesApi, usuariosApi } from "@/services/api";
import type { Usuario } from "@/types";
import type {
  PublicacaoCapturaExecucao,
  PublicacaoDjenSync,
  PublicacaoDiarioOficial,
  PublicacaoFonteMonitorada,
  PublicacaoMonitoramento,
  TipoFontePublicacaoMonitorada,
} from "@/types/publicacoes";

const LIMITE_PESQUISAS = 10;

const tipoFonteLabels: Record<TipoFontePublicacaoMonitorada, string> = {
  NOME: "Nome",
  OAB: "OAB",
  CPF: "CPF",
  CNPJ: "CNPJ",
};

const tiposFontePublicacao: TipoFontePublicacaoMonitorada[] = ["NOME", "OAB", "CPF", "CNPJ"];

const ufLabels: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AM: "Amazonas",
  AP: "Amapa",
  BA: "Bahia",
  CE: "Ceara",
  DF: "Distrito Federal",
  ES: "Espirito Santo",
  GO: "Goias",
  MA: "Maranhao",
  MG: "Minas Gerais",
  MS: "Mato Grosso do Sul",
  MT: "Mato Grosso",
  PA: "Para",
  PB: "Paraiba",
  PE: "Pernambuco",
  PI: "Piaui",
  PR: "Parana",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RO: "Rondonia",
  RR: "Roraima",
  RS: "Rio Grande do Sul",
  SC: "Santa Catarina",
  SE: "Sergipe",
  SP: "Sao Paulo",
  TO: "Tocantins",
};

const ufsFederativas = Object.keys(ufLabels);

function formatarDataInput(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function dataInicialBackfillPadrao() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return formatarDataInput(date);
}

function aguardar(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function fonteTipoTabela(tipo: TipoFontePublicacaoMonitorada) {
  return tipo === "NOME" ? "PE" : tipo;
}

function formatarNomePesquisa(fonte: PublicacaoFonteMonitorada) {
  if (fonte.tipo === "NOME") {
    return fonte.valorMonitorado || fonte.nomeExibicao;
  }

  if (fonte.tipo === "OAB") {
    return `${fonte.nomeExibicao} - OAB ${fonte.uf ? `${fonte.uf} ` : ""}${fonte.valorMonitorado}`;
  }

  return `${fonte.nomeExibicao} - ${tipoFonteLabels[fonte.tipo]} ${fonte.valorMonitorado}`;
}

function isDiarioMonitoravel(diario: PublicacaoDiarioOficial) {
  if (!diario.ativo || diario.status === "NAO_SUPORTADO") {
    return false;
  }
  return diario.grupo !== "DATAJUD" && diario.grupo !== "DOMICILIO";
}

function isDiarioColetavelAgora(diario: PublicacaoDiarioOficial) {
  return diario.coletavelAgora === true;
}

function statusCapturaConfig(diario: PublicacaoDiarioOficial) {
  if (diario.coletavelAgora) {
    return {
      label: "Captura automatica",
      className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
    };
  }

  if (diario.statusCaptura === "PREPARADO_PARA_CONECTOR") {
    return {
      label: "Proximo conector",
      className: "border-blue-500/25 bg-blue-500/10 text-blue-400",
    };
  }

  return {
    label: "Catalogo",
    className: "border-border bg-muted text-muted-foreground",
  };
}

function statusFonteClassName(status?: string | null) {
  if (status === "SAUDAVEL" || status === "PREPARADO") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  }
  if (status === "COM_ERROS") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-400";
  }
  if (status === "SEM_FONTES" || status === "NAO_CONFIGURADA") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-400";
  }
  return "border-border bg-muted text-muted-foreground";
}

function formatarStatusFonte(status?: string | null) {
  const labels: Record<string, string> = {
    AGUARDANDO: "Aguardando",
    COM_ERROS: "Com erros",
    NAO_CONFIGURADA: "Nao configurada",
    PREPARADO: "Preparado",
    SAUDAVEL: "Saudavel",
    SEM_FONTES: "Sem fontes",
  };

  return status ? labels[status] ?? status.replaceAll("_", " ") : "Nao verificado";
}

function formatarStatusExecucao(status?: string | null) {
  const labels: Record<string, string> = {
    ERRO: "Erro",
    IGNORADO: "Ignorado",
    PENDENTE: "Pendente",
    SUCESSO: "Sucesso",
  };

  return status ? labels[status] ?? status : "Nao informado";
}

function statusExecucaoClassName(status?: string | null) {
  if (status === "SUCESSO") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  }
  if (status === "ERRO") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-400";
  }
  if (status === "IGNORADO") {
    return "border-border bg-muted text-muted-foreground";
  }
  return "border-amber-500/25 bg-amber-500/10 text-amber-400";
}

function formatarStatusSla(status?: string | null) {
  const labels: Record<string, string> = {
    AGUARDANDO_PRIMEIRA_EXECUCAO: "Aguardando primeira execucao",
    ATRASADO: "Atrasado",
    COM_ERROS: "Com erros",
    ERRO: "Erro",
    NUNCA_EXECUTADO: "Nunca executado",
    PARCIAL: "Parcial",
    SAUDAVEL: "Saudavel",
    SEM_CADERNO: "Sem caderno",
    SEM_COLETORES: "Sem coletores",
    SEM_MATCH: "Sem match",
  };

  return status ? labels[status] ?? status.replaceAll("_", " ") : "Nao verificado";
}

function statusSlaClassName(status?: string | null) {
  if (status === "SAUDAVEL" || status === "SEM_CADERNO" || status === "SEM_MATCH") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  }
  if (status === "COM_ERROS" || status === "ERRO") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-400";
  }
  if (status === "ATRASADO" || status === "NUNCA_EXECUTADO" || status === "PARCIAL" || status === "AGUARDANDO_PRIMEIRA_EXECUCAO") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-400";
  }
  return "border-border bg-muted text-muted-foreground";
}

function pesoStatusSla(status?: string | null) {
  const pesos: Record<string, number> = {
    ERRO: 0,
    ATRASADO: 1,
    NUNCA_EXECUTADO: 2,
    SEM_CADERNO: 3,
    SEM_MATCH: 4,
    SAUDAVEL: 5,
  };

  return status ? pesos[status] ?? 9 : 9;
}

function formatarStatusHistoricoDjen(status?: string | null) {
  const labels: Record<string, string> = {
    COM_CAPTURA: "Com publicacao",
    COM_ERROS: "Com erros",
    EXECUTADO: "Executado",
    PENDENTE: "Pendente",
    SEM_EXECUCAO: "Sem execucao",
  };

  return status ? labels[status] ?? status.replaceAll("_", " ") : "Nao verificado";
}

function statusHistoricoDjenClassName(status?: string | null) {
  if (status === "COM_CAPTURA") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  }
  if (status === "EXECUTADO") {
    return "border-blue-500/25 bg-blue-500/10 text-blue-400";
  }
  if (status === "COM_ERROS") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-400";
  }
  if (status === "PENDENTE") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-400";
  }
  return "border-border bg-muted text-muted-foreground";
}

function formatarDataHora(value?: string | null) {
  if (!value) return "Sem data";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sem data";
  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDataCurta(value?: string | null) {
  if (!value) return null;
  const [ano, mes, dia] = value.split("-");
  if (!ano || !mes || !dia) return value;
  return `${dia}/${mes}/${ano}`;
}

function formatarPeriodoBackfill(dataInicio?: string | null, dataFim?: string | null) {
  const inicio = formatarDataCurta(dataInicio);
  const fim = formatarDataCurta(dataFim);
  if (inicio && fim) return `${inicio} a ${fim}`;
  return inicio ?? fim ?? "Periodo nao informado";
}

function ordenarDiarios(diarios: PublicacaoDiarioOficial[]) {
  return [...diarios].sort((a, b) => {
    const grupoA = a.uf ?? "ZZ";
    const grupoB = b.uf ?? "ZZ";
    if (grupoA !== grupoB) return grupoA.localeCompare(grupoB);
    return a.codigo.localeCompare(b.codigo);
  });
}

function formatarResumoDiarios(diarios?: PublicacaoDiarioOficial[]) {
  const lista = (diarios ?? []).filter(isDiarioMonitoravel);
  if (lista.length === 0) {
    return "Nenhum diario vinculado";
  }

  const ufs = new Set(lista.map((diario) => diario.uf).filter(Boolean));
  const possuiSuperiores = lista.some((diario) => !diario.uf);
  const possuiTodasUfs = ufsFederativas.every((uf) => ufs.has(uf));

  if (possuiTodasUfs && possuiSuperiores) {
    return "Todos os estados, Superiores";
  }

  if (ufs.size === 1 && possuiSuperiores) {
    return `${Array.from(ufs)[0]}, Superiores`;
  }

  if (ufs.size === 1) {
    return `${Array.from(ufs)[0]}`;
  }

  if (possuiSuperiores && ufs.size === 0) {
    return "Superiores";
  }

  return `${lista.length} diarios monitorados`;
}

function agruparDiarios(diarios: PublicacaoDiarioOficial[]) {
  return ordenarDiarios(diarios.filter(isDiarioMonitoravel)).reduce<Record<string, PublicacaoDiarioOficial[]>>(
    (grupos, diario) => {
      const key = diario.uf ? ufLabels[diario.uf] ?? diario.uf : "Tribunal superior";
      grupos[key] = [...(grupos[key] ?? []), diario];
      return grupos;
    },
    {},
  );
}

function contarColetaveis(diarios: PublicacaoDiarioOficial[]) {
  return diarios.filter(isDiarioMonitoravel).filter(isDiarioColetavelAgora).length;
}

function permiteBackfillInicial(fonte: PublicacaoFonteMonitorada) {
  if (!fonte.ativo) return false;
  if (fonte.tipo === "OAB") {
    return (fonte.valorMonitorado ?? "").replace(/\D/g, "").length >= 4;
  }
  if (fonte.tipo === "NOME") {
    return (fonte.valorMonitorado ?? "").trim().length >= 5;
  }
  return false;
}

function DiariosMonitoradosDialog({
  open,
  onOpenChange,
  fonte,
  diariosFallback,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fonte: PublicacaoFonteMonitorada | null;
  diariosFallback: PublicacaoDiarioOficial[];
}) {
  const diarios = fonte?.diariosMonitorados?.length ? fonte.diariosMonitorados : diariosFallback;
  const grupos = agruparDiarios(diarios);
  const total = Object.values(grupos).reduce((acc, items) => acc + items.length, 0);
  const totalColetavelAgora = contarColetaveis(diarios);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Diarios oficiais monitorados</DialogTitle>
          <DialogDescription>
            Lista configurada para monitorar o nome pesquisado e enviar achados ao responsavel definido.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            {fonte?.nomeExibicao ?? "Catalogo do escritorio"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {total} diario(s) vinculados a esta pesquisa. {totalColetavelAgora} com captura automatica ativa agora.
          </p>
        </div>

        <ScrollArea className="h-[520px] rounded-xl border border-border">
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {Object.entries(grupos).map(([grupo, items]) => (
              <div key={grupo} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{grupo}</p>
                  <Badge variant="outline" className="rounded-full">
                    {items.length}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {items.map((diario) => (
                    <div key={diario.id} className="flex items-center gap-1">
                      <Badge variant="outline" className="rounded-full bg-background font-mono">
                        {diario.codigo}
                      </Badge>
                      <Badge variant="outline" className={cn("rounded-full text-[10px]", statusCapturaConfig(diario).className)}>
                        {statusCapturaConfig(diario).label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function PublicacoesAdminTab() {
  const [fontes, setFontes] = useState<PublicacaoFonteMonitorada[]>([]);
  const [diariosOficiais, setDiariosOficiais] = useState<PublicacaoDiarioOficial[]>([]);
  const [monitoramento, setMonitoramento] = useState<PublicacaoMonitoramento | null>(null);
  const [capturasRecentes, setCapturasRecentes] = useState<PublicacaoCapturaExecucao[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [coletandoDjen, setColetandoDjen] = useState(false);
  const [coletandoReplayDjen, setColetandoReplayDjen] = useState(false);
  const [coletandoBackfillDjen, setColetandoBackfillDjen] = useState(false);
  const [backfillFonteId, setBackfillFonteId] = useState<string | null>(null);
  const [reprocessandoCapturaId, setReprocessandoCapturaId] = useState<string | null>(null);
  const [alterandoId, setAlterandoId] = useState<string | null>(null);
  const [fonteEdicaoId, setFonteEdicaoId] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busca, setBusca] = useState("");
  const [subtab, setSubtab] = useState<"PUBLICACOES" | "INTIMACOES">("PUBLICACOES");
  const [diariosDialogFonte, setDiariosDialogFonte] = useState<PublicacaoFonteMonitorada | null>(null);
  const [mostrarCatalogoDialog, setMostrarCatalogoDialog] = useState(false);
  const [ultimoResultadoDjen, setUltimoResultadoDjen] = useState<PublicacaoDjenSync | null>(null);
  const [replayTribunal, setReplayTribunal] = useState("");
  const [replayData, setReplayData] = useState(formatarDataInput());
  const [backfillDataInicio, setBackfillDataInicio] = useState(dataInicialBackfillPadrao);
  const [backfillDataFim, setBackfillDataFim] = useState(formatarDataInput());

  const [tipo, setTipo] = useState<TipoFontePublicacaoMonitorada>("NOME");
  const [nomeExibicao, setNomeExibicao] = useState("");
  const [valorMonitorado, setValorMonitorado] = useState("");
  const [uf, setUf] = useState("");
  const [destinatariosIds, setDestinatariosIds] = useState<string[]>([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [fontesData, diariosData, usuariosData, monitoramentoData, capturasData] = await Promise.all([
        publicacoesApi.listarFontesMonitoradas(),
        publicacoesApi.listarDiariosOficiais({ apenasSemScraping: false }),
        usuariosApi.listar(),
        publicacoesApi.monitoramento(),
        publicacoesApi.capturasRecentes({ size: 8 }),
      ]);
      const usuariosItems = usuariosData?.content ?? usuariosData;

      setFontes(Array.isArray(fontesData) ? fontesData : []);
      setDiariosOficiais(Array.isArray(diariosData) ? diariosData : []);
      setMonitoramento(monitoramentoData ?? null);
      setCapturasRecentes(Array.isArray(capturasData) ? capturasData : []);
      setUsuarios(
        Array.isArray(usuariosItems)
          ? usuariosItems.filter((usuario: Usuario) =>
            usuario.ativo && ["ADMINISTRADOR", "ADVOGADO"].includes(String(usuario.papel)),
          )
          : [],
      );
    } catch (error) {
      console.error("Erro ao carregar configuracoes de publicacoes:", error);
      setFontes([]);
      setDiariosOficiais([]);
      setMonitoramento(null);
      setCapturasRecentes([]);
      setUsuarios([]);
      toast.error("Nao foi possivel carregar as configuracoes de publicacoes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const diariosMonitoraveis = diariosOficiais.filter(isDiarioMonitoravel);
  const diariosColetaveisAgora = diariosMonitoraveis.filter(isDiarioColetavelAgora);
  const diariosCodigosPadrao = diariosMonitoraveis.map((diario) => diario.codigo);
  const fontesFiltradas = fontes.filter((fonte) => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;

    return [
      fonte.nomeExibicao,
      fonte.valorMonitorado,
      fonte.uf,
      fonte.destinatarios?.map((destinatario) => destinatario.nome).join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(termo);
  });
  const fontesAtivas = fontes.filter((fonte) => fonte.ativo).length;
  const vagasRestantes = Math.max(0, LIMITE_PESQUISAS - fontesAtivas);
  const djenStatus = monitoramento?.djen?.status;
  const djenSla = monitoramento?.djenSla;
  const djenDiariosSla = [...(monitoramento?.djenDiarios ?? [])].sort((a, b) => {
    const peso = pesoStatusSla(a.status) - pesoStatusSla(b.status);
    if (peso !== 0) return peso;
    return a.codigo.localeCompare(b.codigo);
  });
  const djenHistorico = monitoramento?.djenHistorico ?? [];
  const capturasResumo = {
    total: capturasRecentes.length,
    sucesso: capturasRecentes.filter((captura) => captura.status === "SUCESSO").length,
    falhas: capturasRecentes.filter((captura) => captura.status === "ERRO").length,
    semCaderno: capturasRecentes.filter((captura) =>
      (captura.mensagem ?? "").toLowerCase().includes("sem caderno"),
    ).length,
    semMatch: capturasRecentes.filter((captura) =>
      (captura.mensagem ?? "").toLowerCase().includes("nenhuma publicacao bateu"),
    ).length,
  };

  useEffect(() => {
    if (!replayTribunal && diariosColetaveisAgora.length > 0) {
      setReplayTribunal(diariosColetaveisAgora[0].codigo);
    }
  }, [diariosColetaveisAgora, replayTribunal]);

  const limparFormulario = () => {
    setFonteEdicaoId(null);
    setTipo("NOME");
    setNomeExibicao("");
    setValorMonitorado("");
    setUf("");
    setDestinatariosIds([]);
    setMostrarFormulario(false);
  };

  const iniciarNovaPesquisa = () => {
    setFonteEdicaoId(null);
    setTipo("NOME");
    setNomeExibicao("");
    setValorMonitorado("");
    setUf("");
    setDestinatariosIds([]);
    setMostrarFormulario(true);
  };

  const iniciarEdicao = (fonte: PublicacaoFonteMonitorada) => {
    setFonteEdicaoId(fonte.id);
    setTipo(fonte.tipo);
    setNomeExibicao(fonte.nomeExibicao ?? "");
    setValorMonitorado(fonte.valorMonitorado ?? "");
    setUf(fonte.uf ?? "");
    setDestinatariosIds(fonte.destinatarios?.map((destinatario) => destinatario.id) ?? []);
    setMostrarFormulario(true);
  };

  const alternarDestinatario = (usuarioId: string, checked: boolean) => {
    setDestinatariosIds((atuais) => {
      if (checked) {
        return Array.from(new Set([...atuais, usuarioId]));
      }
      return atuais.filter((id) => id !== usuarioId);
    });
  };

  const executarBackfillFonte = async (
    fonte: PublicacaoFonteMonitorada,
    options?: { dataInicio?: string; dataFim?: string; automatico?: boolean },
  ) => {
    if (!permiteBackfillInicial(fonte)) {
      if (!options?.automatico) {
        toast.info("Backfill inicial por fonte esta disponivel apenas para pesquisas por nome ou OAB.");
      }
      return;
    }

    const dataInicio = options?.dataInicio ?? dataInicialBackfillPadrao();
    const dataFim = options?.dataFim ?? formatarDataInput();
    setBackfillFonteId(fonte.id);
    try {
      const execucao = await publicacoesApi.agendarBackfillFonte(fonte.id, { dataInicio, dataFim });
      toast.success(
        options?.automatico
          ? "Pesquisa cadastrada. Backfill inicial foi agendado."
          : "Backfill da pesquisa foi agendado.",
      );
      await carregar();
      void acompanharBackfillFonte(fonte.id, execucao.id, options?.automatico === true);
    } catch (error) {
      console.error("Erro ao executar backfill da fonte:", error);
      toast.error(
        options?.automatico
          ? "Pesquisa cadastrada, mas o backfill inicial nao foi agendado."
          : "Nao foi possivel agendar o backfill da pesquisa.",
      );
      setBackfillFonteId(null);
    }
  };

  const acompanharBackfillFonte = async (fonteId: string, execucaoId: string, automatico: boolean) => {
    try {
      for (let tentativa = 0; tentativa < 40; tentativa += 1) {
        await aguardar(3000);
        const fontesAtualizadas = await publicacoesApi.listarFontesMonitoradas();
        if (Array.isArray(fontesAtualizadas)) {
          setFontes(fontesAtualizadas);
        }
        const fonteAtualizada = Array.isArray(fontesAtualizadas)
          ? fontesAtualizadas.find((item) => item.id === fonteId)
          : null;
        const execucaoAtual = fonteAtualizada?.ultimoBackfillDjen;
        if (!execucaoAtual || execucaoAtual.id !== execucaoId || execucaoAtual.status === "PENDENTE") {
          continue;
        }

        if (execucaoAtual.status === "ERRO") {
          toast.warning(execucaoAtual.mensagem ?? "Backfill da pesquisa finalizado com falhas.");
        } else if (execucaoAtual.status === "IGNORADO") {
          toast.info(execucaoAtual.mensagem ?? "Backfill da pesquisa foi ignorado.");
        } else {
          toast.success(
            automatico
              ? "Backfill inicial da pesquisa finalizado."
              : "Backfill da pesquisa finalizado.",
          );
        }
        await carregar();
        return;
      }
      toast.info("Backfill continua em execucao. Acompanhe o status na tabela.");
      await carregar();
    } catch (error) {
      console.error("Erro ao acompanhar backfill da fonte:", error);
      toast.error("Nao foi possivel acompanhar o progresso do backfill.");
    } finally {
      setBackfillFonteId(null);
    }
  };

  const salvarFonte = async () => {
    const valor = valorMonitorado.trim();
    const nome = nomeExibicao.trim() || valor;
    const ufNormalizada = uf.trim().toUpperCase();

    if (!valor) {
      toast.error("Informe o nome, OAB, CPF ou CNPJ que sera pesquisado.");
      return;
    }
    if (tipo === "OAB" && ufNormalizada.length !== 2) {
      toast.error("Para OAB, informe a UF com 2 letras.");
      return;
    }
    if (destinatariosIds.length === 0) {
      toast.error("Selecione quem recebe as publicacoes encontradas.");
      return;
    }
    if (diariosCodigosPadrao.length === 0) {
      toast.error("Nenhum diario oficial monitoravel foi encontrado no catalogo.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        tipo,
        nomeExibicao: nome,
        valorMonitorado: valor,
        uf: ufNormalizada || null,
        observacao: null,
        destinatariosIds,
        diariosCodigos: diariosCodigosPadrao,
      };

      if (fonteEdicaoId) {
        await publicacoesApi.atualizarFonteMonitorada(fonteEdicaoId, payload);
        toast.success("Pesquisa monitorada atualizada.");
      } else {
        const fonteCriada = await publicacoesApi.criarFonteMonitorada(payload);
        toast.success("Pesquisa monitorada cadastrada.");
        void executarBackfillFonte(fonteCriada, { automatico: true });
      }

      limparFormulario();
      await carregar();
    } catch (error) {
      console.error("Erro ao salvar fonte monitorada:", error);
      toast.error("Nao foi possivel salvar a pesquisa monitorada.");
    } finally {
      setSalvando(false);
    }
  };

  const alternarFonte = async (fonte: PublicacaoFonteMonitorada, ativo: boolean) => {
    setAlterandoId(fonte.id);
    try {
      const atualizada = await publicacoesApi.alterarAtivoFonteMonitorada(fonte.id, ativo);
      setFontes((atuais) => atuais.map((item) => (item.id === atualizada.id ? atualizada : item)));
      await carregar();
    } catch (error) {
      console.error("Erro ao alterar fonte monitorada:", error);
      toast.error("Nao foi possivel alterar a pesquisa monitorada.");
    } finally {
      setAlterandoId(null);
    }
  };

  const coletarDjen = async (params?: { tribunal?: string; data?: string; dataInicio?: string; dataFim?: string }) => {
    const isReplay = Boolean(params?.tribunal || params?.data);
    const isBackfill = Boolean(params?.dataInicio || params?.dataFim);
    if (isReplay && isBackfill) {
      toast.error("Use replay por tribunal/data ou backfill por periodo, nao ambos.");
      return;
    }
    if (isReplay && (!params?.tribunal || !params?.data)) {
      toast.error("Informe tribunal e data para reprocessar o caderno DJEN.");
      return;
    }
    if (isBackfill && (!params?.dataInicio || !params?.dataFim)) {
      toast.error("Informe data inicial e final para o backfill DJEN.");
      return;
    }
    if (params?.dataInicio && params?.dataFim && params.dataInicio > params.dataFim) {
      toast.error("A data inicial do backfill nao pode ser maior que a data final.");
      return;
    }

    if (isBackfill) {
      setColetandoBackfillDjen(true);
    } else if (isReplay) {
      setColetandoReplayDjen(true);
    } else {
      setColetandoDjen(true);
    }

    try {
      const resultado = await publicacoesApi.coletarDjen(params);
      setUltimoResultadoDjen(resultado);
      if (resultado.emExecucao) {
        toast.info(resultado.mensagem ?? "Ja existe outra captura DJEN em andamento.");
      } else if ((resultado.falhas ?? 0) > 0) {
        toast.warning(resultado.mensagem ?? "Captura DJEN finalizada com falhas.");
      } else {
        toast.success(`${resultado.publicacoesImportadas ?? 0} publicacao(oes) importada(s) pelo DJEN.`);
      }
      await carregar();
    } catch (error) {
      console.error("Erro ao executar captura DJEN:", error);
      toast.error("Nao foi possivel executar a captura DJEN.");
    } finally {
      if (isBackfill) {
        setColetandoBackfillDjen(false);
      } else if (isReplay) {
        setColetandoReplayDjen(false);
      } else {
        setColetandoDjen(false);
      }
    }
  };

  const reprocessarCaptura = async (captura: PublicacaoCapturaExecucao) => {
    if (!captura.id) return;
    setReprocessandoCapturaId(captura.id);
    try {
      const resultado = await publicacoesApi.reprocessarCaptura(captura.id);
      setUltimoResultadoDjen(resultado);
      if (resultado.emExecucao) {
        toast.info(resultado.mensagem ?? "Ja existe outra captura DJEN em andamento.");
      } else if ((resultado.falhas ?? 0) > 0) {
        toast.warning(resultado.mensagem ?? "Reprocessamento DJEN finalizado com falhas.");
      } else {
        toast.success(`${resultado.publicacoesImportadas ?? 0} publicacao(oes) importada(s) no reprocessamento.`);
      }
      await carregar();
    } catch (error) {
      console.error("Erro ao reprocessar captura DJEN:", error);
      toast.error("Nao foi possivel reprocessar a captura DJEN.");
    } finally {
      setReprocessandoCapturaId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-11 w-80" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Publicacoes</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Configure os nomes pesquisados nos diarios oficiais e quem recebe cada publicacao encontrada.
        </p>
      </div>

      <div className="rounded-xl bg-muted p-1">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSubtab("PUBLICACOES")}
            className={cn(
              "border-b-2 px-4 py-2 text-sm transition-colors",
              subtab === "PUBLICACOES"
                ? "border-primary bg-background text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Publicacoes Astrea
          </button>
          <button
            type="button"
            onClick={() => setSubtab("INTIMACOES")}
            className={cn(
              "border-b-2 px-4 py-2 text-sm transition-colors",
              subtab === "INTIMACOES"
                ? "border-primary bg-background text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Intimacoes eletronicas
          </button>
        </div>
      </div>

      {subtab === "INTIMACOES" ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-foreground">Intimacoes eletronicas ficam fora desta configuracao.</p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Esta aba fica reservada para uma etapa futura de integracao direta. Por enquanto, publicacoes por diario
            oficial sao configuradas na aba Publicacoes Astrea.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-semibold text-foreground">Captura automatizada</h3>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Executa a varredura dos diarios com coletor ativo agora. O catalogo completo continua vinculado as
                  pesquisas, mas o job so processa fontes oficiais com conector implementado.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline" className={cn("rounded-full", statusFonteClassName(djenStatus))}>
                    DJEN: {formatarStatusFonte(djenStatus)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {fontesAtivas} pesquisa(s) ativa(s)
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {diariosColetaveisAgora.length} diario(s) com coletor
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {monitoramento?.publicacoesPendentes ?? 0} pendente(s)
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 xl:min-w-[380px]">
                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => void coletarDjen()}
                  disabled={coletandoDjen || coletandoReplayDjen || coletandoBackfillDjen || Boolean(backfillFonteId) || fontesAtivas === 0 || diariosColetaveisAgora.length === 0}
                >
                  {coletandoDjen ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  Capturar DJEN
                </Button>
                <div className="rounded-xl border border-border bg-primary/5 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Descobrir carteira</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Busca publicacoes por OAB/nome no periodo e joga CNJs sem cadastro na fila sem vinculo.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Input
                      type="date"
                      value={backfillDataInicio}
                      onChange={(event) => setBackfillDataInicio(event.target.value)}
                    />
                    <Input
                      type="date"
                      value={backfillDataFim}
                      onChange={(event) => setBackfillDataFim(event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2 w-full gap-2"
                    onClick={() => void coletarDjen({ dataInicio: backfillDataInicio, dataFim: backfillDataFim })}
                    disabled={coletandoDjen || coletandoReplayDjen || coletandoBackfillDjen || Boolean(backfillFonteId) || fontesAtivas === 0 || !backfillDataInicio || !backfillDataFim}
                  >
                    {coletandoBackfillDjen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Rodar backfill do periodo
                  </Button>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Replay operacional</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_150px]">
                    <Select value={replayTribunal} onValueChange={setReplayTribunal}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tribunal" />
                      </SelectTrigger>
                      <SelectContent>
                        {diariosColetaveisAgora.map((diario) => (
                          <SelectItem key={diario.codigo} value={diario.codigo}>
                            {diario.codigo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={replayData}
                      onChange={(event) => setReplayData(event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 w-full gap-2"
                    onClick={() => void coletarDjen({ tribunal: replayTribunal, data: replayData })}
                    disabled={coletandoDjen || coletandoReplayDjen || coletandoBackfillDjen || Boolean(backfillFonteId) || fontesAtivas === 0 || !replayTribunal || !replayData}
                  >
                    {coletandoReplayDjen ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                    Reprocessar tribunal/data
                  </Button>
                </div>
              </div>
            </div>

            {ultimoResultadoDjen ? (
              <div className="mt-5 rounded-xl border border-border bg-background/60 p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full">Ultima captura: DJEN</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Fontes</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {ultimoResultadoDjen.tribunais?.length ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Cadernos</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {ultimoResultadoDjen.cadernosBaixados ?? 0}/{ultimoResultadoDjen.cadernosConsultados ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Publicacoes lidas</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{ultimoResultadoDjen.publicacoesLidas ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Importadas</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{ultimoResultadoDjen.publicacoesImportadas ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Falhas</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{ultimoResultadoDjen.falhas ?? 0}</p>
                  </div>
                </div>
                {ultimoResultadoDjen.mensagem ? (
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">{ultimoResultadoDjen.mensagem}</p>
                ) : null}
              </div>
            ) : null}

            {capturasResumo.total > 0 ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-border bg-background/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Ultimas execucoes</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{capturasResumo.total}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-400">Sucesso</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{capturasResumo.sucesso}</p>
                </div>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <p className="text-xs uppercase tracking-wide text-rose-400">Falhas</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{capturasResumo.falhas}</p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs uppercase tracking-wide text-amber-400">Sem caderno</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{capturasResumo.semCaderno}</p>
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                  <p className="text-xs uppercase tracking-wide text-blue-400">Sem match</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{capturasResumo.semMatch}</p>
                </div>
              </div>
            ) : null}

            {djenSla ? (
              <div className="mt-5 rounded-xl border border-border bg-background/60">
                <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">SLA por diario DJEN</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Considera atraso quando um coletor ativo fica mais de {djenSla.slaHoras} hora(s) sem execucao registrada.
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("w-fit rounded-full", statusSlaClassName(djenSla.status))}>
                    {formatarStatusSla(djenSla.status)}
                  </Badge>
                </div>

                <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-6">
                  <div className="rounded-xl border border-border bg-card/60 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Coletores</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{djenSla.total}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-emerald-400">Saudaveis</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{djenSla.saudaveis}</p>
                  </div>
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-rose-400">Com erro</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{djenSla.comErro}</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-amber-400">Atrasados</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{djenSla.atrasados}</p>
                  </div>
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-blue-400">Sem match</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{djenSla.semMatch}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card/60 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Nunca rodou</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{djenSla.nuncaExecutados}</p>
                  </div>
                </div>

                {djenDiariosSla.length > 0 ? (
                  <div className="divide-y divide-border/70">
                    {djenDiariosSla.slice(0, 12).map((diario) => (
                      <div key={diario.codigo} className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[110px_120px_120px_1fr_140px] lg:items-center">
                        <div>
                          <p className="font-mono text-xs font-semibold text-foreground">{diario.codigo}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{diario.uf ?? "Superior"}</p>
                        </div>
                        <Badge variant="outline" className={cn("w-fit rounded-full", statusSlaClassName(diario.status))}>
                          {formatarStatusSla(diario.status)}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {diario.horasDesdeUltimaExecucao != null
                            ? `${diario.horasDesdeUltimaExecucao}h sem nova execucao`
                            : "Sem execucao"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">{diario.nome}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {diario.mensagem ?? "Sem mensagem operacional."}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {diario.publicacoesImportadas ?? 0} importada(s) de {diario.publicacoesLidas ?? 0}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">
                    Nenhum diario DJEN com coletor ativo foi encontrado no catalogo.
                  </p>
                )}
              </div>
            ) : null}

            {djenHistorico.length > 0 ? (
              <div className="mt-5 rounded-xl border border-border bg-background/60">
                <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Historico diario DJEN</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Visao agregada por data de referencia para identificar dias sem execucao, falhas e volume importado.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit rounded-full">
                    {djenHistorico.length} dia(s)
                  </Badge>
                </div>

                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-7">
                  {djenHistorico.map((dia) => (
                    <div key={dia.data} className="rounded-xl border border-border bg-card/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-xs font-semibold text-foreground">
                          {dia.data ? dia.data.slice(5).split("-").reverse().join("/") : "S/D"}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn("rounded-full px-2 py-0 text-[10px]", statusHistoricoDjenClassName(dia.status))}
                        >
                          {formatarStatusHistoricoDjen(dia.status)}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Exec.</p>
                          <p className="font-semibold text-foreground">{dia.totalExecucoes}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Erros</p>
                          <p className="font-semibold text-foreground">{dia.erros}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Lidas</p>
                          <p className="font-semibold text-foreground">{dia.publicacoesLidas}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Import.</p>
                          <p className="font-semibold text-foreground">{dia.publicacoesImportadas}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {capturasRecentes.length > 0 ? (
              <div className="mt-5 rounded-xl border border-border bg-background/60">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Ultimas capturas</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Historico por diario e data, usado para auditoria e replay operacional.
                  </p>
                </div>
                <div className="divide-y divide-border/70">
                  {capturasRecentes.map((captura) => {
                    const podeReprocessar = captura.fonte === "DJEN" && captura.status === "ERRO";
                    const reprocessando = reprocessandoCapturaId === captura.id;

                    return (
                    <div key={captura.id} className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[110px_130px_1fr_120px_170px] lg:items-center">
                      <div>
                        <p className="font-mono text-xs font-semibold text-foreground">{captura.diarioCodigo ?? "N/A"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{captura.fonte ?? "Fonte"}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {captura.dataReferencia ?? "Sem data"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs text-muted-foreground">
                          {captura.mensagem ?? "Execucao registrada sem mensagem."}
                        </p>
                        {(captura.erroTipo || captura.erroCodigoHttp) ? (
                          <p className="mt-1 text-xs text-rose-400">
                            {captura.erroTipo ?? "Erro"}
                            {captura.erroCodigoHttp ? ` HTTP ${captura.erroCodigoHttp}` : ""}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatarDataHora(captura.iniciadoEm)}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {captura.publicacoesImportadas ?? 0} importada(s) de {captura.publicacoesLidas ?? 0} lida(s)
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn("w-fit rounded-full", statusExecucaoClassName(captura.status))}>
                          {formatarStatusExecucao(captura.status)}
                        </Badge>
                        {podeReprocessar ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void reprocessarCaptura(captura)}
                            disabled={Boolean(reprocessandoCapturaId)}
                          >
                            {reprocessando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                            Reprocessar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative max-w-xl flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  className="pl-9"
                  placeholder="Buscar por nome, OAB ou responsavel"
                />
              </div>
              <Button type="button" variant="outline" onClick={() => void carregar()}>
                <RefreshCcw className="h-4 w-4" />
                Atualizar
              </Button>
            </div>

            <Button type="button" onClick={iniciarNovaPesquisa}>
              <Plus className="h-4 w-4" />
              Nova pesquisa
            </Button>
          </div>

          {mostrarFormulario ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {fonteEdicaoId ? "Editar pesquisa monitorada" : "Cadastrar pesquisa monitorada"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    O catalogo de diarios do plano sera vinculado automaticamente a esta pesquisa.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={limparFormulario}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)_110px]">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={(value) => setTipo(value as TipoFontePublicacaoMonitorada)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposFontePublicacao.map((item) => (
                        <SelectItem key={item} value={item}>
                          {tipoFonteLabels[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>{tipo === "NOME" ? "Nome pesquisado" : "Valor pesquisado"}</Label>
                  <Input
                    value={valorMonitorado}
                    onChange={(event) => setValorMonitorado(event.target.value)}
                    placeholder={tipo === "NOME" ? "Nome do dono do escritorio" : "OAB, CPF ou CNPJ"}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Nome na tabela</Label>
                  <Input
                    value={nomeExibicao}
                    onChange={(event) => setNomeExibicao(event.target.value)}
                    placeholder="Opcional; usa o valor pesquisado se ficar vazio"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>UF</Label>
                  <Input
                    value={uf}
                    onChange={(event) => setUf(event.target.value.toUpperCase().slice(0, 2))}
                    placeholder="BA"
                    disabled={tipo !== "OAB"}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Quem recebe</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Selecione um ou mais responsaveis para receber as publicacoes encontradas.
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full">
                      {destinatariosIds.length} selecionado(s)
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {usuarios.map((usuario) => {
                      const checked = destinatariosIds.includes(usuario.id);
                      return (
                        <label
                          key={usuario.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-colors",
                            checked
                              ? "border-primary/40 bg-primary/10 text-foreground"
                              : "border-border bg-card hover:border-primary/25",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => alternarDestinatario(usuario.id, value === true)}
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{usuario.nome}</span>
                            {usuario.oab ? (
                              <span className="block text-xs text-muted-foreground">OAB {usuario.oab}</span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="text-sm font-medium text-foreground">Diarios oficiais monitorados</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatarResumoDiarios(diariosMonitoraveis)}.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {diariosColetaveisAgora.length} diario(s) possuem captura automatica ativa agora. Os demais ficam no
                    catalogo para evolucao de conectores.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => setMostrarCatalogoDialog(true)}
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar lista
                  </Button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={limparFormulario} disabled={salvando}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => void salvarFonte()} disabled={salvando}>
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {fonteEdicaoId ? "Salvar alteracoes" : "Cadastrar pesquisa"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1240px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-4">Tipo</th>
                    <th className="px-5 py-4">Nome</th>
                    <th className="px-5 py-4">Diario de justica</th>
                    <th className="px-5 py-4">Quem recebe</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Captura automatica</th>
                    <th className="px-5 py-4">Ultimo backfill</th>
                    <th className="px-5 py-4">Diarios oficiais monitorados</th>
                    <th className="px-5 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {fontesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">
                        Nenhuma pesquisa monitorada encontrada.
                      </td>
                    </tr>
                  ) : (
                    fontesFiltradas.map((fonte) => {
                      const ultimaCaptura = fonte.ultimaCapturaDjen;
                      const ultimoBackfill = fonte.ultimoBackfillDjen;

                      return (
                        <tr key={fonte.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                          <td className="px-5 py-4 align-top">
                            <span className="font-medium text-foreground">{fonteTipoTabela(fonte.tipo)}</span>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <p className="font-medium text-foreground">{formatarNomePesquisa(fonte)}</p>
                            {fonte.nomeExibicao && fonte.nomeExibicao !== fonte.valorMonitorado ? (
                              <p className="mt-1 text-xs text-muted-foreground">{fonte.nomeExibicao}</p>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 align-top text-foreground/90">
                            <p>{formatarResumoDiarios(fonte.diariosMonitorados)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {contarColetaveis(fonte.diariosMonitorados ?? [])} com captura automatica
                            </p>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="max-w-[240px] text-foreground/90">
                              {fonte.destinatarios?.length
                                ? fonte.destinatarios.map((destinatario) => destinatario.nome).join(", ")
                                : "Sem responsavel"}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full",
                                fonte.ativo
                                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                                  : "border-border bg-muted text-muted-foreground",
                              )}
                            >
                              {fonte.ativo ? "Ativo" : "Pausado"}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 align-top">
                            {ultimaCaptura ? (
                              <div className="space-y-1.5">
                                <Badge
                                  variant="outline"
                                  className={cn("w-fit rounded-full", statusExecucaoClassName(ultimaCaptura.status))}
                                >
                                  {formatarStatusExecucao(ultimaCaptura.status)}
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                  {formatarPeriodoBackfill(ultimaCaptura.dataInicio, ultimaCaptura.dataFim)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {ultimaCaptura.publicacoesImportadas ?? 0} importada(s) de{" "}
                                  {ultimaCaptura.publicacoesLidas ?? 0} lida(s)
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Ultima: {formatarDataHora(ultimaCaptura.finalizadoEm ?? ultimaCaptura.iniciadoEm)}
                                </p>
                                {ultimaCaptura.proximaExecucaoEm ? (
                                  <p className="text-xs text-muted-foreground">
                                    Proxima: {formatarDataHora(ultimaCaptura.proximaExecucaoEm)}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <Badge variant="outline" className="w-fit rounded-full border-border bg-muted text-muted-foreground">
                                  Aguardando
                                </Badge>
                                <p className="text-xs text-muted-foreground">Sem captura recorrente registrada.</p>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 align-top">
                            {ultimoBackfill ? (
                              <div className="space-y-1.5">
                                <Badge
                                  variant="outline"
                                  className={cn("w-fit rounded-full", statusExecucaoClassName(ultimoBackfill.status))}
                                >
                                  {formatarStatusExecucao(ultimoBackfill.status)}
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                  {formatarPeriodoBackfill(ultimoBackfill.dataInicio, ultimoBackfill.dataFim)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {ultimoBackfill.publicacoesImportadas ?? 0} importada(s) de{" "}
                                  {ultimoBackfill.publicacoesLidas ?? 0} lida(s)
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatarDataHora(ultimoBackfill.finalizadoEm ?? ultimoBackfill.iniciadoEm)}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <Badge variant="outline" className="w-fit rounded-full border-border bg-muted text-muted-foreground">
                                  Nunca executado
                                </Badge>
                                <p className="text-xs text-muted-foreground">Backfill inicial ainda nao registrado.</p>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 align-top">
                            <button
                              type="button"
                              className="text-left text-primary hover:underline"
                              onClick={() => setDiariosDialogFonte(fonte)}
                            >
                              Visualizar lista de diarios monitorados
                            </button>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => void executarBackfillFonte(fonte)}
                                disabled={
                                  Boolean(backfillFonteId)
                                  || coletandoDjen
                                  || coletandoReplayDjen
                                  || coletandoBackfillDjen
                                  || !permiteBackfillInicial(fonte)
                                }
                                title="Rodar backfill inicial desta pesquisa"
                              >
                                {backfillFonteId === fonte.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Search className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => iniciarEdicao(fonte)}
                                disabled={alterandoId === fonte.id}
                                title="Editar pesquisa"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {alterandoId === fonte.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : null}
                              <Switch
                                checked={fonte.ativo}
                                disabled={alterandoId === fonte.id}
                                onCheckedChange={(checked) => void alternarFonte(fonte, checked)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border px-5 py-4 text-center text-sm text-primary">
              Voce possui {vagasRestantes} vaga(s) para pesquisas em diarios oficiais.
            </div>
          </div>
        </>
      )}

      <DiariosMonitoradosDialog
        open={Boolean(diariosDialogFonte)}
        onOpenChange={(open) => {
          if (!open) setDiariosDialogFonte(null);
        }}
        fonte={diariosDialogFonte}
        diariosFallback={diariosMonitoraveis}
      />

      <DiariosMonitoradosDialog
        open={mostrarCatalogoDialog}
        onOpenChange={setMostrarCatalogoDialog}
        fonte={null}
        diariosFallback={diariosMonitoraveis}
      />
    </div>
  );
}

export function PublicacoesAdminSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-border bg-card/50 p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
