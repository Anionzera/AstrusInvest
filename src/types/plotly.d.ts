// Tipos para Plotly.js
declare global {
  interface Window {
    Plotly: {
      newPlot: (
        div: string | HTMLElement,
        data: any[],
        layout?: any,
        config?: any
      ) => Promise<any>;
      
      react: (
        div: string | HTMLElement,
        data: any[],
        layout?: any,
        config?: any
      ) => Promise<any>;
      
      restyle: (
        div: string | HTMLElement,
        update: any,
        traces?: number | number[]
      ) => Promise<any>;
      
      relayout: (
        div: string | HTMLElement,
        update: any
      ) => Promise<any>;
      
      redraw: (div: string | HTMLElement) => Promise<any>;
      
      purge: (div: string | HTMLElement) => void;
      
      downloadImage: (
        div: string | HTMLElement,
        options: {
          format: 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf' | 'eps';
          width?: number;
          height?: number;
          filename?: string;
          scale?: number;
        }
      ) => Promise<string>;
      
      toImage: (
        div: string | HTMLElement,
        options: {
          format: 'png' | 'jpeg' | 'webp' | 'svg';
          width?: number;
          height?: number;
          scale?: number;
        }
      ) => Promise<string>;
      
      plot: (
        div: string | HTMLElement,
        data: any[],
        layout?: any,
        config?: any
      ) => Promise<any>;
    };
  }
}

// Tipos para dados Plotly
export interface PlotlyData {
  x?: any[];
  y?: any[];
  z?: any[];
  type?: string;
  mode?: string;
  name?: string;
  marker?: {
    color?: any;
    size?: number | number[];
    colorscale?: string;
    showscale?: boolean;
    colorbar?: any;
    line?: any;
  };
  line?: {
    color?: string;
    width?: number;
    shape?: string;
  };
  fill?: string;
  fillcolor?: string;
  text?: string | string[];
  textposition?: string;
  hovertemplate?: string;
  showlegend?: boolean;
  yaxis?: string;
  xaxis?: string;
  hole?: number;
  labels?: string[];
  values?: number[];
  textinfo?: string;
}

export interface PlotlyLayout {
  title?: {
    text: string;
    x?: number;
    xanchor?: string;
    font?: any;
  } | string;
  xaxis?: {
    title?: string;
    showgrid?: boolean;
    gridwidth?: number;
    gridcolor?: string;
    side?: string;
  };
  yaxis?: {
    title?: string;
    showgrid?: boolean;
    gridwidth?: number;
    gridcolor?: string;
    side?: string;
    overlaying?: string;
  };
  yaxis2?: {
    title?: string;
    side?: string;
    overlaying?: string;
  };
  plot_bgcolor?: string;
  paper_bgcolor?: string;
  font?: any;
  showlegend?: boolean;
  legend?: {
    orientation?: string;
    yanchor?: string;
    y?: number;
    xanchor?: string;
    x?: number;
  };
  margin?: {
    t?: number;
    b?: number;
    l?: number;
    r?: number;
  };
  height?: number;
  width?: number;
  annotations?: any[];
  coloraxis?: any;
  hovermode?: string;
}

export interface PlotlyConfig {
  responsive?: boolean;
  displayModeBar?: boolean;
  modeBarButtonsToRemove?: string[];
  displaylogo?: boolean;
  toImageButtonOptions?: {
    format: 'png' | 'jpeg' | 'webp' | 'svg';
    filename?: string;
    height?: number;
    width?: number;
    scale?: number;
  };
}

export interface PlotlyGraph {
  data: PlotlyData[];
  layout: PlotlyLayout;
  config?: PlotlyConfig;
}

export {}; 