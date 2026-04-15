import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentoUploadModal } from "./DocumentoUploadModal";
import { documentosApi } from "@/services/api";

vi.mock("@/services/api", () => ({
  documentosApi: {
    upload: vi.fn(),
  },
}));

describe("DocumentoUploadModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (documentosApi.upload as any).mockResolvedValue({});
  });

  it("deve aceitar varios arquivos e enviar todos no mesmo fluxo", async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();

    const { container } = render(
      <DocumentoUploadModal
        onClose={onClose}
        onSaved={onSaved}
        clientesList={[]}
        processosList={[]}
        pastasInternas={[
          {
            id: "p1",
            nome: "Financeiro",
            parentId: null,
            children: [],
          },
        ]}
        initialDestino="interno"
        initialPastaId="p1"
        allowDestinoSwitch={false}
      />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const fileA = new File(["a"], "contrato-a.pdf", { type: "application/pdf" });
    const fileB = new File(["b"], "contrato-b.pdf", { type: "application/pdf" });

    Object.defineProperty(input, "files", {
      value: [fileA, fileB],
      configurable: true,
    });
    fireEvent.change(input);

    expect(await screen.findByText(/2 arquivos selecionados/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Fazer upload \(2\)/i }));

    await waitFor(() => {
      expect(documentosApi.upload).toHaveBeenCalledTimes(2);
    }, { timeout: 3000 });

    expect(await screen.findByText(/2 arquivos enviados/i)).toBeDefined();
  });
});
