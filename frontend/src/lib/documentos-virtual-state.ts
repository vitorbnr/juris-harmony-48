import type { Documento } from "@/types";

const STORAGE_KEY = "viana.documentos.virtual-state";

interface DocumentoVirtualOverride {
  nome?: string;
  categoria?: string;
}

interface DocumentoVirtualState {
  overrides: Record<string, DocumentoVirtualOverride>;
  trashedIds: string[];
  purgedIds: string[];
}

function getDefaultState(): DocumentoVirtualState {
  return {
    overrides: {},
    trashedIds: [],
    purgedIds: [],
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
      trashedIds: Array.isArray(parsed.trashedIds)
        ? parsed.trashedIds
        : Array.isArray((parsed as { deletedIds?: string[] }).deletedIds)
          ? (parsed as { deletedIds?: string[] }).deletedIds ?? []
          : [],
      purgedIds: Array.isArray(parsed.purgedIds) ? parsed.purgedIds : [],
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
  const hiddenIds = new Set([...state.trashedIds, ...state.purgedIds]);

  return documentos
    .filter((documento) => !hiddenIds.has(documento.id))
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
    trashedIds: state.trashedIds.filter((storedId) => storedId !== id),
    purgedIds: state.purgedIds.filter((storedId) => storedId !== id),
  });
}

export function markDocumentoVirtualDeleted(id: string) {
  const state = readState();
  const trashedIds = state.trashedIds.includes(id) ? state.trashedIds : [...state.trashedIds, id];

  const overrides = { ...state.overrides };
  delete overrides[id];

  writeState({
    overrides,
    trashedIds,
    purgedIds: state.purgedIds.filter((storedId) => storedId !== id),
  });
}

export function restoreDocumentoVirtual(id: string) {
  const state = readState();

  writeState({
    overrides: state.overrides,
    trashedIds: state.trashedIds.filter((storedId) => storedId !== id),
    purgedIds: state.purgedIds,
  });
}

export function purgeDocumentoVirtual(id: string) {
  const state = readState();
  const overrides = { ...state.overrides };
  delete overrides[id];

  writeState({
    overrides,
    trashedIds: state.trashedIds.filter((storedId) => storedId !== id),
    purgedIds: state.purgedIds.includes(id) ? state.purgedIds : [...state.purgedIds, id],
  });
}

export function listDocumentoVirtualTrashed(documentos: Documento[]) {
  const state = readState();
  const trashedIds = new Set(state.trashedIds);

  return documentos
    .filter((documento) => trashedIds.has(documento.id))
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
