import { useEffect } from "react";
import { Plus, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskCNPJ, maskCPF } from "@/lib/masks";
import type { ProcessoParteFormValue, ProcessoParteRepresentanteFormValue } from "@/types";

type AdvogadoInternoOption = {
  id: string;
  nome: string;
};

type ClienteSugestao = {
  id: string;
  nome: string;
  cpfCnpj: string;
  tipo: string; // "pessoa_fisica" | "pessoa_juridica"
};

type Props = {
  value: ProcessoParteFormValue[];
  onChange: (value: ProcessoParteFormValue[]) => void;
  advogadosInternos: AdvogadoInternoOption[];
  clientesSugestoes?: ClienteSugestao[];
};

const tiposParte = [
  { value: "PESSOA_FISICA", label: "Pessoa fisica" },
  { value: "PESSOA_JURIDICA", label: "Pessoa juridica" },
  { value: "NAO_IDENTIFICADO", label: "Não identificado" },
];

const polosParte = [
  { value: "ATIVO", label: "Polo ativo" },
  { value: "PASSIVO", label: "Polo passivo" },
  { value: "TERCEIRO", label: "Terceiro" },
  { value: "OUTRO", label: "Outro" },
];

function createRepresentante(): ProcessoParteRepresentanteFormValue {
  return {
    nome: "",
    cpf: "",
    oab: "",
    principal: false,
    usuarioInternoId: "",
  };
}

function createParte(): ProcessoParteFormValue {
  return {
    nome: "",
    documento: "",
    tipo: "NAO_IDENTIFICADO",
    polo: "OUTRO",
    principal: false,
    observacao: "",
    representantes: [],
  };
}

function maskDocumentoParte(tipo: string, value: string) {
  if (tipo === "PESSOA_FISICA") {
    return maskCPF(value);
  }

  if (tipo === "PESSOA_JURIDICA") {
    return maskCNPJ(value);
  }

  return value;
}

export function mapProcessoPartesToForm(
  partes?: {
    nome?: string;
    documento?: string;
    tipo?: string;
    polo?: string;
    principal?: boolean;
    observacao?: string;
    representantes?: {
      nome?: string;
      cpf?: string;
      oab?: string;
      principal?: boolean;
      usuarioInternoId?: string;
    }[];
  }[],
): ProcessoParteFormValue[] {
  if (!partes || partes.length === 0) {
    return [];
  }

  return partes.map((parte) => ({
    nome: parte.nome ?? "",
    documento: parte.documento ?? "",
    tipo: parte.tipo ?? "NAO_IDENTIFICADO",
    polo: parte.polo ?? "OUTRO",
    principal: Boolean(parte.principal),
    observacao: parte.observacao ?? "",
    representantes: (parte.representantes ?? []).map((representante) => ({
      nome: representante.nome ?? "",
      cpf: representante.cpf ? maskCPF(representante.cpf) : "",
      oab: representante.oab ?? "",
      principal: Boolean(representante.principal),
      usuarioInternoId: representante.usuarioInternoId ?? "",
    })),
  }));
}

export function sanitizeProcessoPartesForApi(partes: ProcessoParteFormValue[]) {
  return partes
    .map((parte) => ({
      nome: parte.nome.trim(),
      documento: parte.documento.trim() || null,
      tipo: parte.tipo || "NAO_IDENTIFICADO",
      polo: parte.polo || "OUTRO",
      principal: Boolean(parte.principal),
      observacao: parte.observacao.trim() || null,
      representantes: parte.representantes
        .map((representante) => ({
          nome: representante.nome.trim(),
          cpf: representante.cpf.trim() || null,
          oab: representante.oab.trim().toUpperCase() || null,
          principal: Boolean(representante.principal),
          usuarioInternoId: representante.usuarioInternoId || null,
        }))
        .filter((representante) => representante.nome),
    }))
    .filter((parte) => parte.nome);
}

export function PartesProcessoEditor({ value, onChange, advogadosInternos, clientesSugestoes = [] }: Props) {
  useEffect(() => {
    if (!value.length) {
      return;
    }

    const validIds = new Set(advogadosInternos.map((advogado) => advogado.id));
    let changed = false;

    const sanitized = value.map((parte) => ({
      ...parte,
      representantes: parte.representantes.map((representante) => {
        if (representante.usuarioInternoId && !validIds.has(representante.usuarioInternoId)) {
          changed = true;
          return {
            ...representante,
            usuarioInternoId: "",
          };
        }

        return representante;
      }),
    }));

    if (changed) {
      onChange(sanitized);
    }
  }, [advogadosInternos, onChange, value]);

  const updateParte = (index: number, updates: Partial<ProcessoParteFormValue>) => {
    const next = value.map((parte, currentIndex) =>
      currentIndex === index ? { ...parte, ...updates } : parte,
    );
    onChange(next);
  };

  const removeParte = (index: number) => {
    onChange(value.filter((_, currentIndex) => currentIndex !== index));
  };

  const addParte = () => {
    onChange([...value, createParte()]);
  };

  const addRepresentante = (parteIndex: number) => {
    const parte = value[parteIndex];
    updateParte(parteIndex, {
      representantes: [...parte.representantes, createRepresentante()],
    });
  };

  const updateRepresentante = (
    parteIndex: number,
    representanteIndex: number,
    updates: Partial<ProcessoParteRepresentanteFormValue>,
  ) => {
    const parte = value[parteIndex];
    updateParte(parteIndex, {
      representantes: parte.representantes.map((representante, currentIndex) =>
        currentIndex === representanteIndex ? { ...representante, ...updates } : representante,
      ),
    });
  };

  const removeRepresentante = (parteIndex: number, representanteIndex: number) => {
    const parte = value[parteIndex];
    updateParte(parteIndex, {
      representantes: parte.representantes.filter((_, currentIndex) => currentIndex !== representanteIndex),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>Partes e Representantes</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Estruture autor, reu e demais polos com quantos representantes forem necessarios.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addParte} disabled={value.length >= 20}>
          <Plus className="mr-1 h-4 w-4" />
          Adicionar parte
        </Button>
      </div>

      {value.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
          Nenhuma parte estruturada ainda. Voce pode cadastrar manualmente as partes e seus representantes.
        </div>
      )}

      {value.map((parte, parteIndex) => (
        <div key={`parte-${parteIndex}`} className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Parte {parteIndex + 1}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeParte(parteIndex)} className="h-8 w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Nome da parte *</Label>
              {clientesSugestoes.length > 0 && (
                <datalist id={`datalist-partes-clientes-${parteIndex}`}>
                  {clientesSugestoes.map((cliente) => (
                    <option key={cliente.id} value={cliente.nome} />
                  ))}
                </datalist>
              )}
              <Input
                value={parte.nome}
                list={clientesSugestoes.length > 0 ? `datalist-partes-clientes-${parteIndex}` : undefined}
                onChange={(event) => {
                  const nomeDigitado = event.target.value;
                  updateParte(parteIndex, { nome: nomeDigitado });

                  // Ao corresponder exatamente a um cliente, preenche documento e tipo
                  const clienteEncontrado = clientesSugestoes.find(
                    (c) => c.nome.toLowerCase() === nomeDigitado.toLowerCase(),
                  );
                  if (clienteEncontrado) {
                    const tipoMapeado =
                      clienteEncontrado.tipo === "pessoa_juridica" ? "PESSOA_JURIDICA" : "PESSOA_FISICA";
                    const docFormatado = clienteEncontrado.cpfCnpj
                      ? tipoMapeado === "PESSOA_JURIDICA"
                        ? maskCNPJ(clienteEncontrado.cpfCnpj)
                        : maskCPF(clienteEncontrado.cpfCnpj)
                      : "";
                    updateParte(parteIndex, {
                      nome: clienteEncontrado.nome,
                      tipo: tipoMapeado,
                      documento: docFormatado,
                    });
                  }
                }}
                placeholder="Digite ou selecione um cliente cadastrado"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select
                value={parte.tipo}
                onChange={(event) =>
                  updateParte(parteIndex, {
                    tipo: event.target.value,
                    documento: maskDocumentoParte(event.target.value, parte.documento),
                  })
                }
                className="w-full h-10 rounded-md bg-secondary px-3 text-sm text-foreground outline-none"
              >
                {tiposParte.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Polo</Label>
              <select
                value={parte.polo}
                onChange={(event) => updateParte(parteIndex, { polo: event.target.value })}
                className="w-full h-10 rounded-md bg-secondary px-3 text-sm text-foreground outline-none"
              >
                {polosParte.map((polo) => (
                  <option key={polo.value} value={polo.value}>
                    {polo.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Documento</Label>
              <Input
                value={parte.documento}
                onChange={(event) =>
                  updateParte(parteIndex, {
                    documento: maskDocumentoParte(parte.tipo, event.target.value),
                  })
                }
                placeholder={parte.tipo === "PESSOA_JURIDICA" ? "CNPJ" : parte.tipo === "PESSOA_FISICA" ? "CPF" : "Documento"}
              />
            </div>

            <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={parte.principal}
                onChange={(event) => updateParte(parteIndex, { principal: event.target.checked })}
              />
              Marcar como parte principal
            </label>
          </div>

          <div className="space-y-1.5">
            <Label>Observacao</Label>
            <textarea
              className="w-full resize-none rounded-md bg-secondary px-3 py-2 text-sm text-foreground outline-none"
              rows={2}
              value={parte.observacao}
              onChange={(event) => updateParte(parteIndex, { observacao: event.target.value })}
              placeholder="Observacoes relevantes sobre esta parte"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Representantes</p>
                <p className="text-xs text-muted-foreground">
                  Vinculo interno opcional. Se usado, o advogado precisa estar entre os responsaveis do processo.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addRepresentante(parteIndex)}
                disabled={parte.representantes.length >= 10}
              >
                <Plus className="mr-1 h-4 w-4" />
                Adicionar
              </Button>
            </div>

            {parte.representantes.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum representante informado para esta parte.</p>
            )}

            {parte.representantes.map((representante, representanteIndex) => (
              <div
                key={`parte-${parteIndex}-representante-${representanteIndex}`}
                className="space-y-3 rounded-lg border border-border bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Representante {representanteIndex + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRepresentante(parteIndex, representanteIndex)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Nome do representante *</Label>
                    <Input
                      value={representante.nome}
                      onChange={(event) =>
                        updateRepresentante(parteIndex, representanteIndex, { nome: event.target.value })
                      }
                      placeholder="Ex: Ana Souza"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>CPF</Label>
                    <Input
                      value={representante.cpf}
                      onChange={(event) =>
                        updateRepresentante(parteIndex, representanteIndex, { cpf: maskCPF(event.target.value) })
                      }
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>OAB</Label>
                    <Input
                      value={representante.oab}
                      onChange={(event) =>
                        updateRepresentante(parteIndex, representanteIndex, { oab: event.target.value.toUpperCase() })
                      }
                      placeholder="BA12345"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Advogado interno vinculado</Label>
                    <select
                      value={representante.usuarioInternoId}
                      onChange={(event) =>
                        updateRepresentante(parteIndex, representanteIndex, { usuarioInternoId: event.target.value })
                      }
                      className="w-full h-10 rounded-md bg-secondary px-3 text-sm text-foreground outline-none"
                    >
                      <option value="">Nao vincular</option>
                      {advogadosInternos.map((advogado) => (
                        <option key={advogado.id} value={advogado.id}>
                          {advogado.nome}
                        </option>
                      ))}
                    </select>
                    {advogadosInternos.length === 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Adicione primeiro os advogados responsaveis do processo para permitir o vinculo interno.
                      </p>
                    )}
                  </div>

                  <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground md:col-span-2">
                    <input
                      type="checkbox"
                      checked={representante.principal}
                      onChange={(event) =>
                        updateRepresentante(parteIndex, representanteIndex, { principal: event.target.checked })
                      }
                    />
                    Marcar como representante principal
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
