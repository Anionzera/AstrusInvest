/**
 * Utilitários para exportação de dados em diferentes formatos
 */

/**
 * Converte um array de objetos em formato CSV e inicia o download
 * @param data Array de objetos a serem convertidos
 * @param filename Nome do arquivo sem extensão
 * @param options Opções adicionais de formatação
 */
export const exportToCSV = (
  data: Record<string, any>[],
  filename: string,
  options?: {
    delimiter?: string;
    includeHeaders?: boolean;
    selectedColumns?: string[];
  }
) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error('Dados inválidos para exportação');
    return;
  }

  const delimiter = options?.delimiter || ';';
  const includeHeaders = options?.includeHeaders !== false;
  const selectedColumns = options?.selectedColumns || Object.keys(data[0]);

  // Função para garantir que valores com delimitadores são corretamente formatados
  const formatCSVValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    
    const stringValue = String(value);
    // Se o valor contiver delimitador, aspas ou quebras de linha, colocá-lo entre aspas
    if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
      // Escapar aspas duplicando-as
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  };

  let csvContent = '';

  // Adicionar cabeçalhos se necessário
  if (includeHeaders) {
    csvContent += selectedColumns.map(formatCSVValue).join(delimiter) + '\n';
  }

  // Adicionar linhas de dados
  data.forEach(item => {
    const row = selectedColumns.map(column => formatCSVValue(item[column])).join(delimiter);
    csvContent += row + '\n';
  });

  // Adicionar BOM para garantir que caracteres especiais sejam reconhecidos corretamente
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Criar link para download
  const link = document.createElement('a');
  
  // Suporte para IE
  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, `${filename}.csv`);
  } else {
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return true;
};

/**
 * Exporta dados para o formato Excel (XLSX)
 * Obs: Esta função requer a biblioteca xlsx instalada
 * npm install xlsx
 */
export const exportToExcel = async (
  data: Record<string, any>[],
  filename: string,
  options?: {
    sheetName?: string;
    selectedColumns?: string[];
  }
) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error('Dados inválidos para exportação');
    return;
  }

  try {
    // Importar XLSX dinamicamente para não exigir que a biblioteca esteja instalada
    const XLSX = await import('xlsx').catch(() => {
      throw new Error('Biblioteca xlsx não encontrada. Instale com: npm install xlsx');
    });

    const sheetName = options?.sheetName || 'Planilha1';
    const selectedColumns = options?.selectedColumns || Object.keys(data[0]);

    // Filtrar apenas as colunas selecionadas
    const filteredData = data.map(item => {
      const filteredItem: Record<string, any> = {};
      selectedColumns.forEach(col => {
        filteredItem[col] = item[col];
      });
      return filteredItem;
    });

    // Criar workbook e adicionar worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filteredData);
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Gerar arquivo e iniciar download
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Erro ao exportar para Excel:', error);
    
    // Fallback para CSV em caso de erro
    console.warn('Usando fallback para CSV');
    return exportToCSV(data, filename, {
      selectedColumns: options?.selectedColumns
    });
  }
};

/**
 * Exporta um objeto para um arquivo JSON para download
 */
export const exportToJSON = (
  data: any,
  filename: string
) => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, `${filename}.json`);
  } else {
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `${filename}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return true;
}; 