import { BarChart3, Scale, Users } from "lucide-react";

import { IndicadoresEquipeTab } from "@/components/views/indicadores/IndicadoresEquipeTab";

const contextCards = [
  {
    icon: Users,
    title: "Leitura por responsavel",
    description: "Identifica distribuicao de carga, gargalos e quem precisa de redistribuicao imediata.",
  },
  {
    icon: Scale,
    title: "Foco operacional",
    description: "Conecta produtividade da equipe com volume de processos e cumprimento de prazos do escritorio.",
  },
];

export const IndicadoresView = () => (
  <div className="space-y-6 p-6 md:p-8">
    <section className="rounded-lg border border-border bg-card p-6 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)] md:p-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            Inteligencia operacional
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Indicadores de equipe
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Visao consolidada da produtividade do escritorio para acompanhar carga por
              responsavel, cumprimento de prazos e ritmo semanal de entrega sem perder legibilidade
              no modo claro.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {contextCards.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-lg border border-border bg-background px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <IndicadoresEquipeTab />
  </div>
);
