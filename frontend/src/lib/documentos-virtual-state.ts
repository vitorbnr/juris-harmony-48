import type { Documento } from "@/types";

const STORAGE_KEY = "viana.documentos.virtual-state";

interface DocumentoVirtualOverride {
  nome?: string;
  categoria?: string;
}

interface DocumentoVirtualState {
  overrides: Record<string, DocumentoVirtualOverride>;
  deletedIds: string[];
}

function getDefaultState(): DocumentoVirtualState {
  return {
    overrides: {},
    deletedIds: [],
  };
}

function readState(): DocumentoVirtualState {
  if (typeof window === "undefined") {
    return getDefaultState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultState();
    }

    const parsed = JSON.parse(raw) as Partial<DocumentoVirtualState>;
    return {
      overrides: parsed.overrides ?? {},
      deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
    };
  } catch {
    return getDefaultState();
  }
}

function writeState(state: DocumentoVirtualState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function applyDocumentoVirtualState(documentos: Documento[]) {
  const state = readState();
  const deletedIds = new Set(state.deletedIds);

  return documentos
    .filter((documento) => !deletedIds.has(documento.id))
    .map((documento) => {
      const override = state.overrides[documento.id];
      if (!override) {
        return documento;
      }

      return {
        ...documento,
        nome: override.nome ?? documento.nome,
        categoria: override.categoria ?? documento.categoria,
      };
    });
}

export function saveDocumentoVirtualOverride(id: string, override: DocumentoVirtualOverride) {
  const state = readState();

  writeState({
    overrides: {
      ...state.overrides,
      [id]: {
        ...state.overrides[id],
        ...override,
      },
    },
    deletedIds: state.deletedIds.filter((storedId) => storedId !== id),
  });
}

export function markDocumentoVirtualDeleted(id: string) {
  const state = readState();
  const deletedIds = state.deletedIds.includes(id) ? state.deletedIds : [...state.deletedIds, id];

  const overrides = { ...state.overrides };
  delete overrides[id];

  writeState({
    overrides,
    deletedIds,
  });
}
