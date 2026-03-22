import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usuarioAtual } from "@/data/mockData";

const sectionTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: `Bom dia, Dr. ${usuarioAtual.nome.split(" ")[1]}`, subtitle: "Aqui está o resumo do seu escritório hoje." },
  processos: { title: "Processos", subtitle: "Gerencie todos os processos do escritório." },
  clientes: { title: "Clientes", subtitle: "Carteira de clientes do escritório." },
  prazos: { title: "Prazos & Tarefas", subtitle: "Acompanhe prazos processuais, audiências e tarefas." },
  documentos: { title: "Documentos", subtitle: "Repositório central de arquivos e documentos." },
  configuracoes: { title: "Configurações", subtitle: "Gerencie perfil, equipe e preferências do sistema." },
};

interface DashboardHeaderProps {
  activeItem: string;
}

export const DashboardHeader = ({ activeItem }: DashboardHeaderProps) => {
  const section = sectionTitles[activeItem] ?? sectionTitles.dashboard;

  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          {section.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {section.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar processos, clientes..."
            className="pl-9 w-72 bg-secondary border-none"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>
        <Avatar className="h-9 w-9 border-2 border-primary/30">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
            {usuarioAtual.initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};
