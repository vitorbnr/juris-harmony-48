import { BarChart3, Users } from "lucide-react";

import { IndicadoresEquipeTab } from "@/components/views/indicadores/IndicadoresEquipeTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const IndicadoresView = () => (
  <div className="space-y-6 p-6 md:p-8">
    <section className="overflow-hidden rounded-[2rem] border border-white/5 bg-[radial-gradient(circle_at_top_left,rgba(122,171,138,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(0,0,0,0.08))] px-6 py-7 shadow-[0_30px_70px_-50px_rgba(0,0,0,0.8)] md:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7aab8a]/25 bg-[#7aab8a]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[#b7d3bd]">
            <BarChart3 className="h-3.5 w-3.5" />
            BI juridico
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Indicadores de equipe
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Painel de dark mode com foco em recursos humanos e produtividade para acompanhar
              carga, cumprimento de prazos e ritmo individual dentro do escritorio.
            </p>
          </div>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-[#7aab8a]/20 bg-[#7aab8a]/10 text-[#b7d3bd]">
          <Users className="h-6 w-6" />
        </div>
      </div>
    </section>

    <Tabs defaultValue="equipe" className="space-y-6">
      <TabsList className="bg-card/70">
        <TabsTrigger value="equipe" className="gap-2">
          <Users className="h-4 w-4" />
          Equipe
        </TabsTrigger>
      </TabsList>

      <TabsContent value="equipe" className="mt-0">
        <IndicadoresEquipeTab />
      </TabsContent>
    </Tabs>
  </div>
);
