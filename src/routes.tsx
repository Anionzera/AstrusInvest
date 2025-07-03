import React, { Suspense, lazy } from 'react';
import { RouteObject, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import PageLoading from './components/ui/page-loading';
import RequireAuth from './components/auth/RequireAuth';

// Importação Lazy de componentes com manipulação de erros
const Home = lazy(() => import('./components/home').catch(() => ({ default: () => <div>Erro ao carregar componente Home</div> })));
const ClientManager = lazy(() => import('./components/client/ClientManager').catch(() => ({ default: () => <div>Erro ao carregar componente</div> })));
const PortfoliosPage = lazy(() => import('./components/client/PortfoliosPage').catch(() => ({ default: () => <div>Erro ao carregar componente</div> })));
const PortfolioManager = lazy(() => import('./components/client/PortfolioManager').catch(() => ({ default: () => <div>Erro ao carregar componente</div> })));
const PortfolioOptimizerPage = lazy(() => import('./components/client/PortfolioOptimizerPage').catch(() => ({ default: () => <div>Erro ao carregar otimizador de portfólio</div> })));
const RecommendationView = lazy(() => import('./components/recommendation/RecommendationView').catch(() => ({ default: () => <div>Erro ao carregar componente</div> })));
const HistoryManager = lazy(() => import('./components/history/HistoryManager').catch(() => ({ default: () => <div>Erro ao carregar componente</div> })));
const AnalysisPage = lazy(() => import('./components/analysis/AnalysisPage').catch(() => ({ default: () => <div>Erro ao carregar componente</div> })));
const ReportGenerator = lazy(() => import('./components/report/ReportGenerator').catch(() => ({ default: () => <div>Erro ao carregar componente</div> })));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage').catch(() => ({ default: () => <div>Erro ao carregar componente</div> })));
const BackupManager = lazy(() => import('./components/backup/BackupManager').catch(() => ({ default: () => <div>Erro ao carregar componente</div> })));
const DocumentationPage = lazy(() => import('./components/documentation/DocumentationPage').catch(() => ({ default: () => <div>Erro ao carregar componente</div> })));
const LoginPage = lazy(() => import('./components/auth/LoginPage').catch(() => ({ default: () => <div>Erro ao carregar componente Login</div> })));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel').catch(() => ({ default: () => <div>Erro ao carregar componente</div> })));
const UserManager = lazy(() => import('./components/admin/UserManager').catch(() => ({ default: () => <div>Erro ao carregar componente</div> })));
const ExportManager = lazy(() => import('./components/admin/ExportManager').catch(() => ({ default: () => <div>Erro ao carregar componente</div> })));

// Formulário avançado de recomendação (único mantido)
const AdvancedRecommendationForm = lazy(() => import('./components/recommendation/AdvancedRecommendationForm').catch(() => ({ default: () => <div>Erro ao carregar formulário de recomendação</div> })));

// Importar o componente de análise de mercado
const MarketAnalysisPage = lazy(() => import('./components/market/MarketAnalysisPage').catch(() => ({ default: () => <div>Erro ao carregar página de análise de mercado</div> })));

// Importar o componente de valuation
const ValuationPage = lazy(() => import('./components/valuation/ValuationPage').catch(() => ({ default: () => <div>Erro ao carregar página de valuation</div> })));

// Importar a nova página de análise de performance moderna
const PerformancePage = lazy(() => import('./pages/PerformancePage').catch(() => ({ default: () => <div>Erro ao carregar página de análise de performance</div> })));

// Importar a página de Otimização Avançada com IA
const AdvancedOptimizationPage = lazy(() => import('./pages/SKFolioPage').catch(() => ({ default: () => <div>Erro ao carregar página de Otimização IA</div> })));

// Configuração de rotas
export const appRoutes: RouteObject[] = [
  // Rota de login
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoading />}>
        <LoginPage />
      </Suspense>
    ),
  },
  // Rotas protegidas
  {
    path: '/',
    element: (
      <AppLayout />
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoading />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageLoading />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: 'clients',
        element: (
          <Suspense fallback={<PageLoading />}>
            <ClientManager />
          </Suspense>
        ),
      },
      {
        path: 'clients/:id',
        element: (
          <Suspense fallback={<PageLoading />}>
            <ClientManager />
          </Suspense>
        ),
      },
      {
        path: 'portfolios',
        element: (
          <Suspense fallback={<PageLoading />}>
            <PortfoliosPage />
          </Suspense>
        ),
      },
      {
        path: 'portfolio/:id',
        element: (
          <Suspense fallback={<PageLoading />}>
            <PortfolioManager />
          </Suspense>
        ),
      },
      {
        path: 'clients/:clienteId/portfolio',
        element: (
          <Suspense fallback={<PageLoading />}>
            <PortfolioManager />
          </Suspense>
        ),
      },
      {
        path: 'clients/:clienteId/portfolio/optimize',
        element: (
          <Suspense fallback={<PageLoading />}>
            <PortfolioOptimizerPage />
          </Suspense>
        ),
      },
      {
        path: 'recommendation/new',
        element: (
          <Suspense fallback={<PageLoading />}>
            <AdvancedRecommendationForm />
          </Suspense>
        ),
      },
      {
        path: 'recommendation/:id',
        element: (
          <Suspense fallback={<PageLoading />}>
            <RecommendationView />
          </Suspense>
        ),
      },
      {
        path: 'history',
        element: (
          <Suspense fallback={<PageLoading />}>
            <HistoryManager />
          </Suspense>
        ),
      },
      {
        path: 'analysis',
        element: (
          <Suspense fallback={<PageLoading />}>
            <AnalysisPage />
          </Suspense>
        ),
      },
      // Nova rota para análise de mercado
      {
        path: 'market',
        element: (
          <Suspense fallback={<PageLoading />}>
            <MarketAnalysisPage />
          </Suspense>
        ),
      },
      // Nova rota para valuation
      {
        path: 'valuation',
        element: (
          <Suspense fallback={<PageLoading />}>
            <ValuationPage />
          </Suspense>
        ),
      },
      // Nova rota para análise de performance avançada
      {
        path: 'performance',
        element: (
          <Suspense fallback={<PageLoading />}>
            <PerformancePage />
          </Suspense>
        ),
      },
      // Nova rota para Otimização Avançada com IA
      {
        path: 'optimization',
        element: (
          <Suspense fallback={<PageLoading />}>
            <AdvancedOptimizationPage />
          </Suspense>
        ),
      },
      {
        path: 'report/:id',
        element: (
          <Suspense fallback={<PageLoading />}>
            <ReportGenerator />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoading />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'backup',
        element: (
          <Suspense fallback={<PageLoading />}>
            <RequireAuth>
              <BackupManager />
            </RequireAuth>
          </Suspense>
        ),
      },
      {
        path: 'documentation',
        element: (
          <Suspense fallback={<PageLoading />}>
            <DocumentationPage />
          </Suspense>
        ),
      },
      {
        path: 'admin',
        element: (
          <Suspense fallback={<PageLoading />}>
            <RequireAuth requireAdmin={true}>
              <AdminPanel />
            </RequireAuth>
          </Suspense>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <Suspense fallback={<PageLoading />}>
            <RequireAuth requireAdmin={true}>
              <UserManager />
            </RequireAuth>
          </Suspense>
        ),
      },
      {
        path: 'admin/export',
        element: (
          <Suspense fallback={<PageLoading />}>
            <RequireAuth requireAdmin={true}>
              <ExportManager />
            </RequireAuth>
          </Suspense>
        ),
      },
    ],
  },
];

export default appRoutes; 