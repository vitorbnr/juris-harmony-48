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
    title: (userName) => `Olá, ${userName}`,
    subtitle: "Aqui está o resumo do escritório hoje.",
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
    title: "Gestão Kanban de Prazos",
    subtitle: "Arraste os cards entre as colunas ou use o menu de 3 pontos em cada tarefa para reorganizar o fluxo de trabalho.",
    icon: SquareKanban,
  },
  {
    id: "agenda-notas",
    label: "Agenda e Notas",
    title: "Agenda & Notas",
    subtitle: "Painel dividido para acompanhar tarefas, prazos, eventos e audiências do período sem interromper o fluxo de trabalho.",
    icon: NotebookPen,
  },
  {
    id: "clientes",
    label: "Clientes",
    title: "Clientes",
    subtitle: "Carteira de clientes do escritório.",
    icon: Users,
  },
  {
    id: "atendimentos",
    label: "Atendimentos",
    title: "Atendimentos",
    subtitle: "Triagem inicial com visao de abertos e fechados, e vinculo opcional a processo apenas como contexto.",
    icon: ClipboardList,
  },
  {
    id: "processos",
    label: "Processos e Casos",
    title: "Processos e Casos",
    subtitle: "Entre no modulo ja com leitura executiva do processo e, agora, com uma visao dedicada para os casos do escritorio.",
    icon: Scale,
  },
  {
    id: "publicacoes",
    label: "Publicações",
    title: "Publicações",
    subtitle: "Mesa de triagem pensada para advogados acostumados ao Astrea, com menos cliques, leitura confortavel e base pronta para IA explicavel.",
    icon: Newspaper,
  },
  {
    id: "documentos",
    label: "Documentos",
    title: "Documentos",
    subtitle: "Repositório central de arquivos e documentos.",
    icon: FileText,
  },
  {
    id: "indicadores",
    label: "Indicadores",
    title: "Indicadores",
    subtitle: "Painel consolidado de métricas operacionais e jurídicas.",
    icon: BarChart3,
  },
];

export const configuracoesSection: AppSectionConfig = {
  id: "configuracoes",
  label: "Configurações",
  title: "Configurações",
  subtitle: "Gerencie perfil, equipe e preferências do sistema.",
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
