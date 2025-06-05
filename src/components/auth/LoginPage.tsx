import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Check, AlertTriangle, Lock, User, EyeIcon, EyeOffIcon, Mail, ArrowLeft, ShieldAlert } from "lucide-react";
import { inicializarDB } from "@/lib/db";
import { motion } from "framer-motion";
import { useAuth } from "./AuthContext";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { toast } from "@/components/ui/use-toast";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  // Novos estados para o formulário de criação de conta
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Usar o contexto de autenticação
  const { login, createAccount, isAuthenticated, isLoading } = useAuth();
  
  // Verificar se há mensagem de expiração de sessão nos parâmetros
  useEffect(() => {
    // Verificar se há estado na navegação que indique expiração de sessão
    const stateData = location.state as any;
    if (stateData?.sessionExpired) {
      setSessionExpired(true);
      setError("Sua sessão expirou. Por favor, faça login novamente.");
      
      // Limpar o estado para não mostrar a mensagem novamente após reload
      window.history.replaceState({}, document.title);
      
      // Exibir toast de aviso
      toast({
        title: "Sessão expirada",
        description: "Por motivos de segurança, sua sessão foi encerrada.",
        variant: "destructive"
      });
    }
  }, [location]);
  
  // Verificar e redirecionar se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      console.log("Usuário já está autenticado, redirecionando...");
      
      // Tentar obter a rota de origem se disponível
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Inicializar banco de dados
  useEffect(() => {
    const initDb = async () => {
      try {
        await inicializarDB();
        setDbInitialized(true);
      } catch (error) {
        console.error("Erro ao inicializar banco de dados:", error);
        setError("Erro ao inicializar o sistema. Tente novamente mais tarde.");
      }
    };
    
    initDb();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    
    setError("");
    
    try {
      console.log("Iniciando processo de login...");
      
      // Usar o método login do contexto de autenticação
      const success = await login(username, password);
      
      if (success) {
        console.log("Login bem-sucedido!");
        setSuccess(true);
        
        // O redirecionamento será feito pelo useEffect que monitora isAuthenticated
      } else {
        console.log("Credenciais inválidas");
        setError("Usuário ou senha incorretos. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro no processo de login:", error);
      setError("Ocorreu um erro ao tentar fazer login. Tente novamente.");
    }
  };
  
  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validação de formulário
    if (!newUsername || !newPassword || !confirmPassword || !email || !name) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    
    if (newPassword.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      setError("Por favor, insira um email válido.");
      return;
    }
    
    if (!termsAccepted) {
      setError("Você precisa aceitar os termos de uso para criar uma conta.");
      return;
    }
    
    try {
      // Criar dados do usuário a partir do formulário
      const userData = {
        username: newUsername,
        password: newPassword, // Em um sistema real, nunca envie a senha diretamente
        role: "user",
        name: name,
        email: email
      };
      
      // Usar o método createAccount do contexto de autenticação
      const success = await createAccount(userData);
      
      if (success) {
        toast({
          title: "Conta criada com sucesso",
          description: "Bem-vindo ao sistema ASTRUS Investimentos"
        });
      } else {
        setError("Não foi possível criar a conta. O nome de usuário pode já estar em uso.");
      }
      // Se for bem-sucedido, o useEffect que monitora isAuthenticated irá redirecionar
    } catch (error) {
      console.error("Erro ao criar conta:", error);
      setError("Ocorreu um erro ao criar a conta. Tente novamente.");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const switchToLogin = () => {
    setIsCreatingAccount(false);
    setError("");
  };
  
  const switchToCreateAccount = () => {
    setIsCreatingAccount(true);
    setError("");
  };

  if (!dbInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Inicializando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border bg-white/90 dark:bg-gray-800/90 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4">
              <motion.img 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
                src="/logo.png" 
                alt="ASTRUS Investimentos" 
                className="h-20 w-auto" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/logo-fallback.svg";
                }}
              />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {isCreatingAccount ? "Criar nova conta" : "Bem-vindo à ASTRUS Investimentos"}
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              {isCreatingAccount 
                ? "Preencha os campos abaixo para criar sua conta"
                : "Entre com suas credenciais para acessar o sistema"}
            </CardDescription>
          </CardHeader>
          
          {sessionExpired && !isCreatingAccount && (
            <div className="px-6">
              <Alert variant="destructive" className="mb-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Sessão expirada</AlertTitle>
                <AlertDescription>
                  Por motivos de segurança, sua sessão foi encerrada. Por favor, faça login novamente.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          {isCreatingAccount ? (
            <form onSubmit={handleCreateAccountSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-md flex items-start"
                  >
                    <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center text-gray-700 dark:text-gray-300">
                    <User className="h-4 w-4 mr-2" />
                    Nome completo
                  </Label>
                  <Input
                    id="name"
                    placeholder="Digite seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    required
                    className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center text-gray-700 dark:text-gray-300">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newUsername" className="flex items-center text-gray-700 dark:text-gray-300">
                    <User className="h-4 w-4 mr-2" />
                    Nome de usuário
                  </Label>
                  <Input
                    id="newUsername"
                    placeholder="Nome de usuário único"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    disabled={isLoading}
                    required
                    className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="flex items-center text-gray-700 dark:text-gray-300">
                    <Lock className="h-4 w-4 mr-2" />
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Crie uma senha segura"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    A senha deve ter pelo menos 8 caracteres.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="flex items-center text-gray-700 dark:text-gray-300">
                    <Lock className="h-4 w-4 mr-2" />
                    Confirmar senha
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center space-x-2 mt-4">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
                    Eu li e aceito os termos de uso e política de privacidade
                  </Label>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" /> Criando conta...
                    </>
                  ) : (
                    "Criar conta"
                  )}
                </Button>
                
                <div className="text-center w-full">
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-center mx-auto"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para o login
                  </button>
                </div>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-md flex items-start"
                  >
                    <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
                
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-3 rounded-md flex items-start"
                  >
                    <Check className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Login bem-sucedido! Redirecionando...</span>
                  </motion.div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center text-gray-700 dark:text-gray-300">
                    <User className="h-4 w-4 mr-2" />
                    Nome de usuário
                  </Label>
                  <Input
                    id="username"
                    placeholder="Seu nome de usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading || success}
                    required
                    className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center text-gray-700 dark:text-gray-300">
                    <Lock className="h-4 w-4 mr-2" />
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading || success}
                      required
                      className="border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading || success}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" /> Entrando...
                    </>
                  ) : success ? (
                    <>
                      <Check className="h-4 w-4 mr-2" /> Conectado
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
                
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={switchToCreateAccount}
                    disabled={isLoading || success}
                  >
                    Criar nova conta
                  </Button>
                </div>
              </CardFooter>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage; 