import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scale, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simula login no frontend
    setTimeout(() => {
      setIsLoading(false);
      navigate("/");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Painel esquerdo decorativo */}
      <div className="hidden lg:flex lg:w-1/2 sidebar-gradient relative items-center justify-center p-12">
        <div className="absolute top-6 left-6">
          <ThemeToggle />
        </div>
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <Scale className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-4xl font-bold text-sidebar-foreground">
            Viana Advocacia
          </h1>
          <p className="text-sidebar-muted text-lg leading-relaxed">
            Gestão jurídica completa com segurança, organização e eficiência para o seu escritório.
          </p>
          <div className="flex items-center justify-center gap-8 pt-8 text-sidebar-muted text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-sidebar-foreground">128</p>
              <p>Clientes</p>
            </div>
            <div className="w-px h-10 bg-sidebar-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-sidebar-foreground">47</p>
              <p>Processos</p>
            </div>
            <div className="w-px h-10 bg-sidebar-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-sidebar-foreground">99%</p>
              <p>Uptime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Painel direito com formulário */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
              <Scale className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Viana Advocacia
            </h1>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="font-heading text-3xl font-bold text-foreground">
              Bem-vindo de volta
            </h2>
            <p className="text-muted-foreground">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground pt-4">
            Sistema protegido com criptografia de ponta a ponta
          </p>

          <div className="lg:hidden flex justify-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
