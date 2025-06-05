import { render, screen, fireEvent } from '@testing-library/react';
import MarketScenarioSelector from '../../components/report/MarketScenarioSelector';

describe('MarketScenarioSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve renderizar corretamente', () => {
    render(<MarketScenarioSelector selectedScenario="baseline" onScenarioChange={mockOnChange} />);
    expect(screen.getByText('Cenário de Mercado')).toBeInTheDocument();
  });

  test('deve chamar onScenarioChange quando o valor muda', () => {
    render(<MarketScenarioSelector selectedScenario="baseline" onScenarioChange={mockOnChange} />);
    const bullMarketOption = screen.getByLabelText('Mercado em Alta');
    fireEvent.click(bullMarketOption);
    expect(mockOnChange).toHaveBeenCalledWith('bull-market');
  });
});
