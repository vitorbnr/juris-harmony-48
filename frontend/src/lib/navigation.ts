import {
  BarChart3,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  Newspaper,
  NotebookPen,
  Scale,
  Settings2,
  SquareKanban,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AppSectionId =
  | "dashboard"
  | "inbox"
  | "gestao-kanban"
  | "agenda-notas"
  | "clientes"
  | "atendimentos"
  | "processos"
  | "publicacoes"
  | "documentos"
  | "indicadores"
  | "configuracoes";

interface AppSectionConfig {
  id: AppSectionId;
  label: string;
  title: string | ((userName: string) => string);
  subtitle: string;
  icon: LucideIcon;
}

export const appSections: AppSectionConfig[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    title: (userName) => `Ola, ${userName}`,
    subtitle: "Aqui esta o resumo do escritorio hoje.",
    icon: LayoutDashboard,
  },
  {
    id: "inbox",
    label: "Inbox Juridica",
    title: "Inbox Juridica",
    subtitle: "Central de eventos juridicos novos para triagem e acompanhamento.",
    icon: Inbox,
  },
  {
    id: "gestao-kanban",
    label: "Gestão Kanban",
    title: "Gestão Kanban",
    subtitle: "Mova prazos entre etapas com drag-and-drop e acompanhe o fluxo em tempo real.",
    icon: SquareKanban,
  },
  {
    id: "agenda-notas",
    label: "Agenda e Notas",
    title: "Agenda e Notas",
    subtitle: "Calendario operacional e bloco de notas pessoal com gravacao automatica.",
    icon: NotebookPen,
  },
  {
    id: "clientes",
    label: "Clientes",
    title: "Clientes",
    subtitle: "Carteira de clientes do escritorio.",
    icon: Users,
  },
  {
    id: "atendimentos",
    label: "Atendimentos",
    title: "Atendimentos",
    subtitle: "Triagem comercial com vinculo opcional a processo apenas como contexto do atendimento.",
    icon: ClipboardList,
  },
  {
    id: "processos",
    label: "Processos e Casos",
    title: "Processos e Casos",
    subtitle: "Gerencie os processos e casos do escritorio.",
    icon: Scale,
  },
  {
    id: "publicacoes",
    label: "Publicações",
    title: "Publicações",
    subtitle: "Central dedicada ao acompanhamento de publicações jurídicas.",
    icon: Newspaper,
  },
  {
    id: "documentos",
    label: "Documentos",
    title: "Documentos",
    subtitle: "Repositorio central de arquivos e documentos.",
    icon: FileText,
  },
  {
    id: "indicadores",
    label: "Indicadores",
    title: "Indicadores",
    subtitle: "Painel consolidado de metricas operacionais e juridicas.",
    icon: BarChart3,
  },
];

export const configuracoesSection: AppSectionConfig = {
  id: "configuracoes",
  label: "Configuracoes",
  title: "Configuracoes",
  subtitle: "Gerencie perfil, equipe e preferencias do sistema.",
  icon: Settings2,
};

const appSectionMap = [...appSections, configuracoesSection].reduce<Record<AppSectionId, AppSectionConfig>>((acc, section) => {
  acc[section.id] = section;
  return acc;
}, {} as Record<AppSectionId, AppSectionConfig>);

const legacySectionAliases: Record<string, AppSectionId> = {
  prazos: "gestao-kanban",
};

export const normalizeSectionId = (sectionId?: string | null): AppSectionId => {
  if (!sectionId) return "dashboard";

  if (sectionId in appSectionMap) {
    return sectionId as AppSectionId;
  }

  return legacySectionAliases[sectionId] ?? "dashboard";
};

export const getSectionMeta = (sectionId: string | null | undefined, userName: string) => {
  const section = appSectionMap[normalizeSectionId(sectionId)];

  return {
    ...section,
    title: typeof section.title === "function" ? section.title(userName) : section.title,
  };
};
