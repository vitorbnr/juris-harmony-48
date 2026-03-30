import { useState, useEffect, useCallback } from "react";
import { User, Building2, Users, Plus, Activity, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { usuariosApi, logsApi } from "@/services/api";
import { NovoUsuarioModal } from "@/components/modals/NovoUsuarioModal";
import type { UserRole } from "@/types";

// --- INTERFACES ADICIONADAS ---
interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: string;
  initials?: string;
  unidadeNome?: string;
  ativo?: boolean;
}

interface LogAcesso {
  id: string;
  usuarioNome?: string;
  acao: string;
  modulo: string;
  descricao: string;
  dataHora: string | number | Date;
  ipAddress?: string;
}
// ------------------------------

type Aba = "perfil" | "equipe" | "logs";

const abas: { id: Aba; label: string; icon: React.ElementType }[] = [
  { id: "perfil",       label: "Perfil",       icon: User },
  { id: "equipe",       label: "Equipe",       icon: Users },
  { id: "logs",         label: "Logs de Acesso", icon: Activity },
];

const papelConfig: Record<UserRole | "advogado" | "secretaria" | "administrador" | "ADMINISTRADOR" | "ADVOGADO" | "SECRETARIA", { label: string; class: string }> = {
  administrador: { label: "Administrador", class: "border-purple-400/60 bg-purple-400/10 text-purple-400" },
  advogado:      { label: "Advogado",      class: "border-primary/60 bg-primary/10 text-primary" },
  secretaria:    { label: "Secretaria",    class: "border-chart-amber/60 bg-chart-amber/10 text-chart-amber" },
  ADMINISTRADOR: { label: "Administrador", class: "border-purple-400/60 bg-purple-400/10 text-purple-400" },
  ADVOGADO:      { label: "Advogado",      class: "border-primary/60 bg-primary/10 text-primary" },
  SECRETARIA:    { label: "Secretaria",    class: "border-chart-amber/60 bg-chart-amber/10 text-chart-amber" },
};

const acaoCor: Record<string, string> = {
  login: "bg-blue-500/15 text-blue-500",
  criacao: "bg-green-500/15 text-green-500",
  edicao: "bg-orange-500/15 text-orange-500",
  exclusao: "bg-red-500/15 text-red-500",
};

const acaoLabel: Record<string, string> = {
  login: "Login",
  criacao: "Criação",
  edicao: "Edição",
  exclusao: "Desativação",
};

const moduloLabel: Record<string, string> = {
  auth: "Sistema",
  processos: "Processos",
  clientes: "Clientes",
  documentos: "Documentos",
  prazos: "Prazos/Tarefas",
};

function TabPerfil() {
  const { user } = useAuth();
  const [salvo, setSalvo] = useState(false);
  
  const salvar = () => { setSalvo(true); setTimeout(() => setSalvo(false), 2000); };

  if (!user) return null;

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-6 mb-8">
        <Avatar className="h-20 w-20 border-2 border-primary/20">
          <AvatarFallback className="text-2xl font-heading bg-primary/10 text-primary">
            {user.initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{user.nome}</h3>
          <p className="text-sm text-muted-foreground">{user.cargo}</p>
          <Badge variant="outline" className={cn("mt-1.5 text-xs", papelConfig[user.papel as UserRole]?.class)}>
            {papelConfig[user.papel as UserRole]?.label}
          </Badge>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome Completo</Label>
        <Input id="nome" defaultValue={user.nome} disabled />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" defaultValue={user.email} disabled />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="oab">OAB</Label>
          <Input id="oab" defaultValue={user.oab || ""} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="unidade">Unidade Base</Label>
          <Input id="unidade" defaultValue={user.unidadeNome} disabled />
        </div>
      </div>

      {user.papel === "ADMINISTRADOR" && (
        <div className="space-y-1.5 pt-4">
          <Input id="senha" type="password" placeholder="••••••••" disabled />
          <p className="text-xs text-muted-foreground pt-1">O perfil Administrador editará isto via seção Equipe.</p>
        </div>
      )}

      <Button onClick={salvar} className="gap-2" disabled>
        {salvo ? <><Check className="h-4 w-4" /> Salvo!</> : <><Save className="h-4 w-4" /> Salvar Alterações</>}
      </Button>
    </div>
  );
}

function TabEquipe() {
  const { user } = useAuth();
  const [papelFiltro, setPapelFiltro] = useState<string>("todos");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    usuariosApi.listar().then((res: { content?: Usuario[] } | Usuario[]) => {
      const items = (res as { content?: Usuario[] }).content ?? res;
      setUsuarios(Array.isArray(items) ? (items as Usuario[]) : []);
    }).catch(() => setUsuarios([]))
    .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const usuariosFiltrados = usuarios.filter(u =>
    papelFiltro === "todos" || u.papel.toLowerCase() === papelFiltro.toLowerCase()
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(["todos", "administrador", "advogado", "secretaria"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPapelFiltro(p)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-medium border transition-all capitalize",
                  papelFiltro === p
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {user?.papel === "ADMINISTRADOR" && (
            <Button className="gap-2" onClick={() => setModalUsuario(true)}>
              <Plus className="h-4 w-4" /> Novo Usuário
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-medium text-xs">
                <th className="px-5 py-3">Usuário</th>
                <th className="px-5 py-3 hidden md:table-cell">Permissão</th>
                <th className="px-5 py-3 hidden lg:table-cell">Unidade</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map(u => {
                const papelNorm = u.papel.toLowerCase() as UserRole;
                const conf = papelConfig[papelNorm] || papelConfig.advogado;
                return (
                  <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {u.initials || u.nome.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">{u.nome}</p>
                          <p className="text-[10px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider", conf.class)}>
                        {conf.label}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {u.unidadeNome ?? "N/A"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {u.ativo !== false ? (
                        <div className="flex items-center gap-1.5 text-green-500 text-xs font-medium">
                          <Check className="h-3.5 w-3.5" /> Ativo
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
                           Inativo
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalUsuario && <NovoUsuarioModal onClose={() => setModalUsuario(false)} onSaved={carregar} />}
    </div>
  );
}

function TabLogs() {
  const [logs, setLogs] = useState<LogAcesso[]>([]);

  useEffect(() => {
    logsApi.listar().then((res: { content?: LogAcesso[] } | LogAcesso[]) => {
      const items = (res as { content?: LogAcesso[] }).content ?? res;
      setLogs(Array.isArray(items) ? (items as LogAcesso[]) : []);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhum log encontrado.</div>
        ) : logs.map((log, i) => (
          <div key={log.id} className={cn("flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors", i < logs.length - 1 && "border-b border-border/50")}>
            <Avatar className="h-8 w-8 border border-primary/20 shrink-0 mt-0.5">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {String(log.usuarioNome || "SYS").split(" ").slice(-2).map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start flex-wrap gap-2">
                <p className="text-sm font-semibold text-foreground">{log.usuarioNome || "Sistema"}</p>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", acaoCor[log.acao] || "bg-muted")}>
                  {acaoLabel[log.acao] || log.acao}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{moduloLabel[log.modulo] || log.modulo}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{log.descricao}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(log.dataHora).toLocaleString("pt-BR")} · IP {log.ipAddress}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ConfiguracoesView = () => {
  const { user } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<Aba>("perfil");

  return (
    <div className="p-6 md:p-8">
      {/* Conflito de CSS resolvido aqui: Removido o '-mb-px' que brigava com o 'mb-8' */}
      <div className="flex gap-1 mb-8 border-b border-border pb-0">
        {abas
          .filter(aba => (aba.id === "equipe" || aba.id === "logs") ? user?.papel === "ADMINISTRADOR" : true)
          .map(a => {
          const Icon = a.icon;
          return (
          <button
            key={a.id}
            onClick={() => setAbaAtiva(a.id)}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors",
              abaAtiva === a.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
              <Icon className="h-4 w-4" />
              {a.label}
            </button>
          );
        })}
      </div>

      <div>
        {abaAtiva === "perfil"       && <TabPerfil />}
        {abaAtiva === "equipe"       && <TabEquipe />}
        {abaAtiva === "logs"         && <TabLogs />}
      </div>
    </div>
  );
};