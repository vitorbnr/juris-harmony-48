import { useMemo, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseExtraHolidayInput, parseSuspensionPeriodsInput } from "@/lib/prazo-date-utils";
import { prazosApi, type CalcularPrazoResponse } from "@/services/api";
import { toast } from "sonner";

function formatDateBr(value?: string | null) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

interface Props {
  dataInicial: string;
  onAplicarData: (data: string) => void;
}

export function PrazoDateCalculator({ dataInicial, onAplicarData }: Props) {
  const [diasUteis, setDiasUteis] = useState("5");
  const [contarDiaInicial, setContarDiaInicial] = useState(false);
  const [feriadosExtras, setFeriadosExtras] = useState("");
  const [feriadosLocais, setFeriadosLocais] = useState("");
  const [suspensoes, setSuspensoes] = useState("");
  const [calculandoData, setCalculandoData] = useState(false);
  const [resultado, setResultado] = useState<CalcularPrazoResponse | null>(null);

  const descricaoFeriados = useMemo(() => {
    if (!resultado) return null;

    const itens = [
      ...resultado.feriadosNacionaisConsiderados.map((item) => formatDateBr(item)),
      ...resultado.feriadosExtrasConsiderados.map((item) => formatDateBr(item)),
      ...resultado.feriadosLocaisConsiderados.map((item) => `${formatDateBr(item)} (local)`),
    ];

    if (itens.length === 0) {
      return "Nenhum feriado considerado no intervalo.";
    }

    return itens.join(", ");
  }, [resultado]);

  const calcular = async () => {
    const quantidadeDiasUteis = Number(diasUteis);
    if (!dataInicial || Number.isNaN(quantidadeDiasUteis) || quantidadeDiasUteis <= 0) {
      toast.error("Informe uma data inicial e uma quantidade valida de dias uteis.");
      return;
    }

    setCalculandoData(true);
    try {
      const { dates, invalid } = parseExtraHolidayInput(feriadosExtras);
      const locais = parseExtraHolidayInput(feriadosLocais);
      const suspensoesParse = parseSuspensionPeriodsInput(suspensoes);
      if (invalid.length > 0 || locais.invalid.length > 0 || suspensoesParse.invalid.length > 0) {
        const erros = [
          invalid.length > 0 ? `feriados extras: ${invalid.join(", ")}` : null,
          locais.invalid.length > 0 ? `feriados locais: ${locais.invalid.join(", ")}` : null,
          suspensoesParse.invalid.length > 0 ? `suspensoes: ${suspensoesParse.invalid.join(", ")}` : null,
        ].filter(Boolean);
        toast.error(`Campos invalidos: ${erros.join(" | ")}.`);
        return;
      }

      const response = await prazosApi.calcularData({
        dataInicial,
        quantidadeDiasUteis,
        contarDiaInicial,
        feriadosExtras: dates,
        feriadosLocais: locais.dates,
        suspensoes: suspensoesParse.periods,
      });

      setResultado(response);
      toast.success("Data sugerida calculada.");
    } catch (error) {
      console.error("Erro ao calcular data sugerida:", error);
      toast.error("Nao foi possivel calcular a data sugerida.");
    } finally {
      setCalculandoData(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Calculadora assistida de prazo</p>
        <p className="text-xs text-muted-foreground">
          Informe quantos dias uteis voce tem para cumprir a providencia. O sistema sugere a data-limite estimada; ele nao substitui a revisao juridica.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-1.5">
          <Label>Dias uteis</Label>
          <Input value={diasUteis} onChange={(event) => setDiasUteis(event.target.value)} inputMode="numeric" />
        </div>
        <div className="space-y-1.5">
          <Label>Feriados extras</Label>
          <Input
            value={feriadosExtras}
            onChange={(event) => setFeriadosExtras(event.target.value)}
            placeholder="21/04/2026, 24/06/2026"
          />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" className="w-full gap-2" onClick={calcular} disabled={calculandoData}>
            {calculandoData ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
            Calcular
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Feriados locais</Label>
          <Input
            value={feriadosLocais}
            onChange={(event) => setFeriadosLocais(event.target.value)}
            placeholder="24/06/2026; 02/07/2026"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Suspensoes forenses</Label>
          <Input
            value={suspensoes}
            onChange={(event) => setSuspensoes(event.target.value)}
            placeholder="20/12/2026 a 20/01/2027; 07/09/2026 a 09/09/2026"
          />
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={contarDiaInicial}
          onChange={(event) => setContarDiaInicial(event.target.checked)}
        />
        Contar o dia inicial no calculo
      </label>

      <p className="mt-2 text-xs text-muted-foreground">
        Feriados devem ser informados em <span className="font-medium text-foreground">dd/mm/aaaa</span>. Suspensoes podem ser informadas como <span className="font-medium text-foreground">dd/mm/aaaa a dd/mm/aaaa</span>. O calculo continua assistido e exige revisao juridica final.
      </p>

      {resultado && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Data inicial</p>
              <p className="text-sm font-medium text-foreground">{formatDateBr(dataInicial)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Data sugerida</p>
              <p className="text-sm font-medium text-foreground">{formatDateBr(resultado.dataSugerida)}</p>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Feriados considerados</p>
            <p className="text-sm text-foreground">{descricaoFeriados}</p>
          </div>

          {resultado.suspensoesConsideradas.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Suspensoes consideradas</p>
              <p className="text-sm text-foreground">
                {resultado.suspensoesConsideradas
                  .map((item) => {
                    const [inicio, fim] = item.split(" a ");
                    return `${formatDateBr(inicio)} a ${formatDateBr(fim)}`;
                  })
                  .join(", ")}
              </p>
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">{resultado.observacao}</p>

          <div className="mt-4 flex justify-end">
            <Button type="button" className="gap-2" onClick={() => onAplicarData(resultado.dataSugerida)}>
              <CalendarClock className="h-4 w-4" />
              Usar data sugerida
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
