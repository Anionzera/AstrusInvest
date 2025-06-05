import { Link } from 'react-router-dom';

// ... somewhere in the component, near the action buttons ...
          <div className="mt-6 flex flex-wrap gap-4">
            <Button onClick={handleEditClick}>
              <Edit className="mr-2 h-4 w-4" /> Editar Cliente
            </Button>
            <Button variant="outline" onClick={handleReportGenerate}>
              <FileText className="mr-2 h-4 w-4" /> Gerar Relatório
            </Button>
            <Link to={`/risk-analysis/${cliente.id}`}>
              <Button variant="secondary">
                <BarChart className="mr-2 h-4 w-4" /> Análise de Risco Avançada
              </Button>
            </Link>
          </div>
// ... existing code ... 