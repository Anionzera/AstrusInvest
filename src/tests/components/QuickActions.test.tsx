import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuickActions from '../../components/dashboard/QuickActions';

describe('QuickActions', () => {
  test('deve renderizar todos os botões de ação rápida', () => {
    render(
      <BrowserRouter>
        <QuickActions />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: 'Criar Nova Recomendação' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ver Histórico' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gerar Relatório' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gestão de Clientes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Análise de Portfólio' })).toBeInTheDocument();
  });

  test('deve ter links para as rotas corretas', () => {
    render(
      <BrowserRouter>
        <QuickActions />
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: 'Criar Nova' })).toHaveAttribute('href', '/recommendation/new');
    expect(screen.getByRole('link', { name: 'Ver Histórico' })).toHaveAttribute('href', '/history');
    expect(screen.getByRole('link', { name: 'Gerar' })).toHaveAttribute('href', '/report/new');
    expect(screen.getByRole('link', { name: 'Gerenciar' })).toHaveAttribute('href', '/clients');
    expect(screen.getByRole('link', { name: 'Analisar' })).toHaveAttribute('href', '/analysis');
  });
});
