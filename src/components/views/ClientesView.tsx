import { useState } from "react";
import { Users, Plus, Search, Mail, Phone, Scale, X, LayoutGrid, List, ChevronRight, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { clientes, getProcessosByCliente } from "@/data/mockData";
import type { Cliente } from "@/types";

// ─── Drawer de Detalhes ───────────────────────────────────────────────────────

function ClienteDrawer({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const processosDoCliente = getProcessosByCliente(cliente.id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{cliente.initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{cliente.nome}</p>
              <p className="text-xs text-muted-foreground capitalize">{cliente.tipo === "pessoa_fisica" ? "Pessoa Física" : "Pessoa Jurídica"}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            <h3 className="font-heading text-base font-semibold text-foreground">Informações</h3>
            <div className="space-y-2.5">
              {[
                { label: "CPF / CNPJ", value: cliente.cpfCnpj },
                { label: "E-mail", value: cliente.email },
                { label: "Telefone", value: cliente.telefone },
                { label: "Cidade / UF", value: `${cliente.cidade} — ${cliente.estado}` },
                { label: "Cadastro", value: new Date(cliente.dataCadastro).toLocaleDateString("pt-BR") },
                { label: "Advogado Responsável", value: cliente.advogadoResponsavel },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start py-2 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground min-w-[140px]">{label}</span>
                  <span className="text-sm text-foreground text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {processosDoCliente.length > 0 && (
            <div className="px-6 pb-6">
              <h3 className="font-heading text-base font-semibold text-foreground mb-3">
                Processos ({processosDoCliente.length})
              </h3>
              <div className="space-y-2">
                {processosDoCliente.map(p => (
                  <div key={p.id} className="rounded-lg border border-border bg-muted/30 p-3 hover:border-primary/30 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs text-primary">{p.numero.slice(0, 16)}…</p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{p.tipo}</p>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        p.status === "Em andamento" ? "bg-blue-500/15 text-blue-400" :
                        p.status === "Urgente" ? "bg-red-500/15 text-red-400" :
                        p.status === "Concluído" ? "bg-primary/15 text-primary" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button className="flex-1">Editar Cliente</Button>
          <Button variant="outline">Novo Processo</Button>
        </div>
      </div>
    </div>
  );
}

// ─── View Principal ───────────────────────────────────────────────────────────

export const ClientesView = () => {
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<"grid" | "lista">("grid");
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  const clientesFiltrados = clientes.filter(c =>
    !busca ||
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.email.toLowerCase().includes(busca.toLowerCase()) ||
    c.cpfCnpj.includes(busca)
  );

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Topo */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou CPF/CNPJ..."
            className="pl-9 bg-secondary border-none"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          <button
            onClick={() => setModo("grid")}
            className={cn("p-1.5 rounded-md transition-all", modo === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setModo("lista")}
            className={cn("p-1.5 rounded-md transition-all", modo === "lista" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <Button className="gap-2 ml-auto">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {/* Grid */}
      {modo === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clientesFiltrados.map(c => (
            <div
              key={c.id}
              onClick={() => setClienteSelecionado(c)}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 border-2 border-primary/20 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{c.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{c.nome}</p>
                    {c.tipo === "pessoa_juridica"
                      ? <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      : <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.cpfCnpj}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs bg-accent text-foreground border-border">
                  <Scale className="h-3 w-3 mr-1" />{c.processos}
                </Badge>
              </div>
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{c.telefone}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.advogadoResponsavel}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Lista / Tabela */
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide">Cliente</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide hidden md:table-cell">CPF / CNPJ</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide hidden lg:table-cell">Contato</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide hidden lg:table-cell">Responsável</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium text-xs tracking-wide">Processos</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map(c => (
                <tr
                  key={c.id}
                  onClick={() => setClienteSelecionado(c)}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 border border-primary/15">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{c.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.tipo === "pessoa_fisica" ? "Pessoa Física" : "Pessoa Jurídica"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell font-mono text-xs">{c.cpfCnpj}</td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <p className="text-sm text-foreground">{c.telefone}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">{c.advogadoResponsavel}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-accent text-foreground px-2 py-1 rounded-full">
                      <Scale className="h-3 w-3" />{c.processos}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right">
        {clientesFiltrados.length} de {clientes.length} clientes exibidos
      </p>

      {clienteSelecionado && (
        <ClienteDrawer cliente={clienteSelecionado} onClose={() => setClienteSelecionado(null)} />
      )}
    </div>
  );
};
