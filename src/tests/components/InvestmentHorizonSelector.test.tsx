import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import InvestmentHorizonSelector from '../../components/report/InvestmentHorizonSelector';

describe('InvestmentHorizonSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve renderizar corretamente', () => {
    render(<InvestmentHorizonSelector selectedHorizon="short-term" onHorizonChange={mockOnChange} />);
    expect(screen.getByText('Horizonte de Investimento')).toBeInTheDocument();
  });

  test('deve chamar onHorizonChange quando o valor muda', () => {
    render(<InvestmentHorizonSelector selectedHorizon="short-term" onHorizonChange={mockOnChange} />);
    const mediumTermOption = screen.getByLabelText('Médio Prazo');
    fireEvent.click(mediumTermOption);
    expect(mockOnChange).toHaveBeenCalledWith('medium-term');
  });
});
