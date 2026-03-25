import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const ThemeToggle = () => {
  // 1. Lemos o localStorage logo na criação do estado
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      
      // Se tiver algo salvo, usamos a preferência do usuário
      if (savedTheme) {
        return savedTheme === "dark";
      }
      
      // Bônus: Se não tiver nada salvo, podemos checar a preferência do sistema do usuário (Windows/Mac)
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // 2. Um único useEffect para atualizar o DOM e o LocalStorage sempre que o estado mudar
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setDark(!dark)}
      className="text-sidebar-foreground hover:bg-sidebar-accent"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
};