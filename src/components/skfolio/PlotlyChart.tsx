import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    Plotly: any;
  }
}

interface PlotlyChartProps {
  htmlContent?: string;
  data?: any[];
  layout?: any;
  config?: any;
  chartId: string;
  style?: React.CSSProperties;
}

const PlotlyChart: React.FC<PlotlyChartProps> = ({ 
  htmlContent, 
  data, 
  layout, 
  config, 
  chartId, 
  style = {} 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 🎯 MÉTODO 1: Usar dados diretos do Plotly (PREFERIDO)
    if (data && layout && window.Plotly) {
      // Limpar gráfico anterior
      if (containerRef.current.innerHTML) {
        window.Plotly.purge(containerRef.current);
      }

      // Configuração padrão otimizada
      const defaultConfig = {
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
        responsive: true,
        ...config
      };

      // Layout padrão otimizado
      const defaultLayout = {
        autosize: true,
        margin: { l: 50, r: 50, t: 50, b: 50 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: 'Inter, sans-serif', size: 12 },
        ...layout
      };

      // Criar gráfico com Plotly.js
      window.Plotly.newPlot(containerRef.current, data, defaultLayout, defaultConfig)
        .then(() => {
          console.log(`✅ Gráfico ${chartId} renderizado com sucesso!`);
        })
        .catch((error: any) => {
          console.error(`❌ Erro ao renderizar gráfico ${chartId}:`, error);
        });

      return;
    }

    // 🎯 MÉTODO 2: Usar HTML content (FALLBACK)
    if (htmlContent) {
      // Limpar conteúdo anterior
      containerRef.current.innerHTML = '';

      // Criar um iframe isolado e melhorado
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '500px';
      iframe.style.border = 'none';
      iframe.style.backgroundColor = 'transparent';
      iframe.style.borderRadius = '8px';
      
      // Adicionar o iframe ao container
      containerRef.current.appendChild(iframe);

      // HTML melhorado com Plotly 3.0.1
      const enhancedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.plot.ly/plotly-3.0.1.min.js"></script>
          <style>
            body { 
              margin: 0; 
              padding: 10px; 
              font-family: Inter, sans-serif;
              background: transparent;
            }
            .plotly-graph-div {
              width: 100% !important;
              height: 100% !important;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;

      // Escrever o conteúdo HTML melhorado no iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(enhancedHtml);
        iframeDoc.close();
      }
    }

    // Cleanup function
    return () => {
      if (containerRef.current) {
        if (window.Plotly && data) {
          window.Plotly.purge(containerRef.current);
        } else {
          containerRef.current.innerHTML = '';
        }
      }
    };
  }, [htmlContent, data, layout, config, chartId]);

  // Loading state
  if (!htmlContent && !data) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Carregando gráfico SKFolio...</p>
          <p className="text-blue-400 text-sm mt-1">Processando dados de otimização</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full bg-white rounded-lg shadow-sm border border-gray-200"
      id={chartId}
      style={{ 
        minHeight: '400px', 
        height: data ? 'auto' : '500px',
        ...style 
      }}
    />
  );
};

export default PlotlyChart; 