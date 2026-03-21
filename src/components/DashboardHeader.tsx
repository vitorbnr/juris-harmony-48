import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const DashboardHeader = () => {
  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-foreground">
          Bom dia, Dr. Viana
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Aqui está o resumo do seu escritório hoje.
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
            RV
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};
