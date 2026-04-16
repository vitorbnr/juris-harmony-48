import { AtividadeModal } from "@/components/produtividade/AtividadeModal";
import type { Prazo } from "@/types";

interface Props {
  prazo: Prazo;
  onClose: () => void;
  onSaved: () => void;
}

export function EditarPrazoModal({ prazo, onClose, onSaved }: Props) {
  return (
    <AtividadeModal
      open
      initialData={prazo}
      onClose={onClose}
      onSaved={() => {
        onSaved();
      }}
    />
  );
}
