import { useState } from "react";
import { User, Building2, Users, Settings, Shield, Activity, Moon, Sun, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usuarios, usuarioAtual, logsAuditoria } from "@/data/mockData";
import type { UserRole } from "@/types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Aba = "perfil" | "equipe" | "preferencias" | "logs";

const abas: { id: Aba; label: string; icon: React.ElementType }[] = [
  { id: "perfil",       label: "Perfil",       icon: User },
  { id: "equipe",       label: "Equipe",        icon: Users },
  { id: "preferencias", label: "Preferências",  icon: Settings },
  { id: "logs",         label: "Logs de Acesso", icon: Activity },
];

const papelConfig: Record<UserRole, { label: string; class: string }> = {
  administrador: { label: "Administrador", class: "bg-primary/15 text-primary border-primary/20" },
  advogado:      { label: "Advogado",       class: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  secretaria:    { label: "Secretária",     class: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
};

const papelPermissoes: Record<UserRole, string[]> = {
  administrador: ["Acesso total ao sistema", "Criar e excluir usuários", "Ver logs de auditoria", "Gerenciar configurações", "Upload e download de documentos"],
  advogado:      ["Criar e editar processos", "Gerenciar clientes", "Criar prazos e tarefas", "Upload e download de documentos", "Visualizar dados de casos"],
  secretaria:    ["Visualizar documentos autorizados", "Agendar na agenda dos advogados", "Cadastrar clientes (básico)", "Visualizar prazos e agenda, Upload e download de documentos"],
};

const moduloLabel: Record<string, string> = {
  processos: "Processos", clientes: "Clientes", prazos: "Prazos",
  documentos: "Documentos", usuarios: "Usuários", sistema: "Sistema",
};
const acaoLabel: Record<string, string> = {
  acessou: "Acessou", criou: "Criou", editou: "Editou",
  excluiu: "Excluiu", visualizou: "Visualizou", fez_upload: "Upload", baixou: "Download",
};
const acaoCor: Record<string, string> = {
  acessou: "text-blue-400 bg-blue-500/10",
  criou: "text-primary bg-primary/10",
  editou: "text-yellow-400 bg-yellow-500/10",
  excluiu: "text-red-400 bg-red-500/10",
  visualizou: "text-muted-foreground bg-muted",
  fez_upload: "text-purple-400 bg-purple-500/10",
  baixou: "text-cyan-400 bg-cyan-500/10",
};

// ─── Abas ─────────────────────────────────────────────────────────────────────

function TabPerfil() {
  const [nome, setNome] = useState(usuarioAtual.nome);
  const [email, setEmail] = useState(usuarioAtual.email);
  const [cargo, setCargo] = useState(usuarioAtual.cargo);
  const [oab, setOab] = useState(usuarioAtual.oab ?? "");
  const [salvo, setSalvo] = useState(false);

  const salvar = () => {
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-xl">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20 border-2 border-primary/30">
          <AvatarFallback className="bg-primary/15 text-primary text-2xl font-semibold">{usuarioAtual.initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">{usuarioAtual.nome}</p>
          <p className="text-sm text-muted-foreground">{usuarioAtual.email}</p>
          <Badge variant="outline" className={cn("mt-1.5 text-xs", papelConfig[usuarioAtual.papel].class)}>
            {papelConfig[usuarioAtual.papel].label}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nome Completo</Label>
          <Input value={nome} onChange={e => setNome(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Cargo</Label>
          <Input value={cargo} onChange={e => setCargo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Registro OAB</Label>
          <Input value={oab} placeholder="SP 000.000" onChange={e => setOab(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Nova Senha (opcional)</Label>
        <Input type="password" placeholder="••••••••" />
      </div>

      <Button onClick={salvar} className="gap-2">
        {salvo ? <><Check className="h-4 w-4" /> Salvo!</> : <><Save className="h-4 w-4" /> Salvar Alterações</>}
      </Button>
    </div>
  );
}

function TabEquipe() {
  const [papelFiltro, setPapelFiltro] = useState<UserRole | "todos">("todos");

  const usuariosFiltrados = usuarios.filter(u =>
    papelFiltro === "todos" || u.papel === papelFiltro
  );

  return (
    <div className="space-y-6">
      {/* Descrição de papéis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(papelPermissoes) as UserRole[]).map(papel => (
          <div key={papel} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              <Badge variant="outline" className={cn("text-xs", papelConfig[papel].class)}>{papelConfig[papel].label}</Badge>
            </div>
            <ul className="space-y-1">
              {papelPermissoes[papel].map(p => (
                <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />{p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Lista de usuários */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {(["todos", "administrador", "advogado", "secretaria"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPapelFiltro(p)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  papelFiltro === p ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {p === "todos" ? "Todos" : papelConfig[p as UserRole].label}
              </button>
            ))}
          </div>
          <Button size="sm" className="gap-1.5">
            <User className="h-3.5 w-3.5" /> Criar Novo Usuário
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {usuariosFiltrados.map((u, i) => (
            <div key={u.id} className={cn("flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors", i < usuariosFiltrados.length - 1 && "border-b border-border/50")}>
              <Avatar className="h-10 w-10 border border-primary/20 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{u.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{u.nome}</p>
                <p className="text-xs text-muted-foreground">{u.email} {u.oab && `· OAB ${u.oab}`}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={cn("text-xs", papelConfig[u.papel].class)}>{papelConfig[u.papel].label}</Badge>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", u.ativo ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                  {u.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabPreferencias() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const cores = [
    { name: "Verde Jurídico", primary: "87 35% 75%", selected: true },
    { name: "Azul Profissional", primary: "210 60% 60%", selected: false },
    { name: "Dourado Clássico", primary: "38 85% 60%", selected: false },
    { name: "Vinho Elegante", primary: "340 40% 55%", selected: false },
  ];

  const toggleDark = () => {
    const novo = !dark;
    setDark(novo);
    document.documentElement.classList.toggle("dark", novo);
    localStorage.setItem("theme", novo ? "dark" : "light");
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Tema */}
      <div>
        <h3 className="font-heading text-base font-semibold text-foreground mb-3">Aparência</h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            {dark ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
            <div>
              <p className="font-medium text-foreground">{dark ? "Tema Escuro" : "Tema Claro"}</p>
              <p className="text-xs text-muted-foreground">Clique para alternar</p>
            </div>
          </div>
          <button
            onClick={toggleDark}
            className={cn("w-12 h-6 rounded-full transition-all relative", dark ? "bg-primary" : "bg-muted")}
          >
            <span className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", dark ? "right-1" : "left-1")} />
          </button>
        </div>
      </div>

      {/* Cor de destaque */}
      <div>
        <h3 className="font-heading text-base font-semibold text-foreground mb-3">Cor de Destaque</h3>
        <div className="grid grid-cols-2 gap-3">
          {cores.map(cor => (
            <button
              key={cor.name}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                cor.selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div
                className="w-8 h-8 rounded-full shrink-0"
                style={{ background: `hsl(${cor.primary})` }}
              />
              <div>
                <p className="text-sm font-medium text-foreground">{cor.name}</p>
                {cor.selected && <p className="text-xs text-primary">Ativo</p>}
              </div>
              {cor.selected && <Check className="h-4 w-4 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabLogs() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {logsAuditoria.map((log, i) => (
          <div key={log.id} className={cn("flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors", i < logsAuditoria.length - 1 && "border-b border-border/50")}>
            <Avatar className="h-8 w-8 border border-primary/20 shrink-0 mt-0.5">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {log.usuarioNome.split(" ").slice(-2).map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start flex-wrap gap-2">
                <p className="text-sm font-semibold text-foreground">{log.usuarioNome}</p>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", acaoCor[log.acao])}>
                  {acaoLabel[log.acao]}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{moduloLabel[log.modulo]}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{log.descricao}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{log.data} às {log.hora} · IP {log.ip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── View Principal ───────────────────────────────────────────────────────────

export const ConfiguracoesView = () => {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("perfil");

  return (
    <div className="p-6 md:p-8">
      {/* Abas */}
      <div className="flex gap-1 mb-8 border-b border-border pb-0 -mb-px">
        {abas.map(aba => {
          const Icon = aba.icon;
          return (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px",
                abaAtiva === aba.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Icon className="h-4 w-4" />
              {aba.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo */}
      <div>
        {abaAtiva === "perfil"       && <TabPerfil />}
        {abaAtiva === "equipe"       && <TabEquipe />}
        {abaAtiva === "preferencias" && <TabPreferencias />}
        {abaAtiva === "logs"         && <TabLogs />}
      </div>
    </div>
  );
};
