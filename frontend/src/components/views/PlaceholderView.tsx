import { LucideIcon, Construction } from "lucide-react";

interface PlaceholderViewProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export const PlaceholderView = ({ icon: Icon, title, description }: PlaceholderViewProps) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 text-center px-8">
    <div className="rounded-2xl bg-muted p-6">
      <Icon className="h-12 w-12 text-muted-foreground" />
    </div>
    <div>
      <h2 className="font-heading text-2xl font-semibold text-foreground">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md">
        {description ?? "Esta seção está em desenvolvimento. Em breve estará disponível."}
      </p>
    </div>
    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-lg">
      <Construction className="h-4 w-4" />
      Em construção
    </div>
  </div>
);
