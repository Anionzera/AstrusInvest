/**
 * Estratégias de Investimento
 * 
 * Este arquivo contém definições de estratégias de investimento
 * que podem ser recomendadas com base no perfil do cliente e objetivos.
 */

export interface InvestmentStrategy {
  id: string;
  name: string;
  riskLevel: "baixo" | "moderado" | "alto";
  suitableProfiles: ("conservador" | "moderado" | "agressivo")[];
  focus: string[];
  expectedReturn: {
    min: number;
    avg: number;
    max: number;
  };
  volatility: number;
  minHorizon: number;
  description: string;
  keyPoints: string[];
  advantages: string[];
  disadvantages: string[];
  marketConditions: {
    favorable: string[];
    unfavorable: string[];
  };
  suitableFor: string[];
  assetAllocationBase: {
    [key: string]: number;
  };
  // Categorias para facilitar a filtragem
  categories: string[];
  // Exemplos de produtos típicos desta estratégia
  exampleProducts: {
    name: string;
    type: string;
    description: string;
  }[];
}

const investmentStrategies: InvestmentStrategy[] = [
  {
    id: "renda-fixa-conservadora",
    name: "Renda Fixa Conservadora",
    riskLevel: "baixo",
    suitableProfiles: ["conservador", "moderado"],
    focus: ["Preservação de Capital", "Estabilidade"],
    expectedReturn: {
      min: 8.5,
      avg: 9.8,
      max: 11.2
    },
    volatility: 1.8,
    minHorizon: 1,
    description: "Estratégia voltada para segurança e preservação de capital, com alocação predominante em títulos de renda fixa de alta qualidade creditícia. Ideal para investidores com baixa tolerância a risco ou com objetivos de curto prazo.",
    keyPoints: [
      "Foco em preservação de capital",
      "Baixa volatilidade",
      "Rendimentos previsíveis",
      "Exposição mínima a risco de mercado"
    ],
    advantages: [
      "Alta previsibilidade dos retornos",
      "Proteção do capital investido",
      "Baixa correlação com mercados de risco",
      "Liquidez adequada para necessidades de curto prazo"
    ],
    disadvantages: [
      "Retornos limitados em cenários de alta nos mercados",
      "Pode não superar a inflação em determinados períodos",
      "Baixa exposição a oportunidades de crescimento",
      "Sensibilidade a mudanças nas taxas de juros"
    ],
    marketConditions: {
      favorable: [
        "Ambiente de juros altos",
        "Incerteza econômica elevada",
        "Mercados voláteis"
      ],
      unfavorable: [
        "Taxas de juros em queda",
        "Inflação acelerada",
        "Forte crescimento econômico"
      ]
    },
    suitableFor: [
      "Investidores com horizonte de curto prazo",
      "Reservas de emergência",
      "Objetivos de compra de bens nos próximos 1-2 anos",
      "Pessoas próximas à aposentadoria",
      "Recursos dedicados à segurança financeira"
    ],
    assetAllocationBase: {
      "Tesouro Direto": 40,
      "Renda Fixa": 45,
      "Fundos Imobiliários": 10,
      "Renda Variável": 5,
      "Fundos Multimercado": 0,
      "Investimentos Internacionais": 0,
      "Criptomoedas": 0
    },
    categories: ["Conservadora", "Baixo Risco", "Renda Fixa", "Preservação"],
    exampleProducts: [
      {
        name: "Tesouro Selic 2026",
        type: "Título Público",
        description: "Título do governo indexado à taxa básica de juros, com liquidez diária"
      },
      {
        name: "CDB Banco AAA 102% CDI",
        type: "Renda Fixa Bancária",
        description: "Certificado de banco de primeira linha com retorno atrelado ao CDI"
      },
      {
        name: "LCI/LCA 95% CDI",
        type: "Título Isento",
        description: "Letras de crédito com isenção fiscal e garantia do FGC"
      }
    ]
  },
  {
    id: "acumulacao-imovel",
    name: "Acumulação para Imóvel",
    riskLevel: "baixo",
    suitableProfiles: ["conservador", "moderado"],
    focus: ["Objetivo Específico", "Proteção Inflacionária", "Segurança"],
    expectedReturn: {
      min: 8.0,
      avg: 10.2,
      max: 12.5
    },
    volatility: 2.5,
    minHorizon: 2,
    description: "Estratégia específica para acumulação de recursos visando a compra de um imóvel, com foco em títulos indexados à inflação para proteger o poder de compra imobiliário e baixa exposição a riscos de mercado.",
    keyPoints: [
      "Proteção contra a inflação imobiliária",
      "Segurança do capital acumulado",
      "Adequação ao prazo do objetivo de compra",
      "Liquidez programada para o momento da aquisição"
    ],
    advantages: [
      "Alinhamento com o objetivo específico de compra imobiliária",
      "Proteção do poder de compra com indexadores",
      "Previsibilidade para o planejamento financeiro",
      "Baixo risco de perdas próximo à data-alvo"
    ],
    disadvantages: [
      "Potencial de rendimento limitado em comparação a estratégias mais agressivas",
      "Menor flexibilidade para aproveitar oportunidades de mercado",
      "Pode exigir aportes maiores para atingir o objetivo no prazo desejado"
    ],
    marketConditions: {
      favorable: [
        "Período de estabilidade no mercado imobiliário",
        "Taxas de juros estáveis ou em alta",
        "Programas de incentivo à compra da casa própria"
      ],
      unfavorable: [
        "Bolhas imobiliárias",
        "Períodos de alta volatilidade cambial",
        "Instabilidade política que afete o setor construção civil"
      ]
    },
    suitableFor: [
      "Planejamento para compra da casa própria",
      "Aquisição de imóveis para investimento",
      "Entrada para financiamento imobiliário",
      "Objetivo familiar de longo prazo"
    ],
    assetAllocationBase: {
      "Tesouro Direto": 65,
      "Renda Fixa": 30,
      "Fundos Imobiliários": 5,
      "Renda Variável": 0,
      "Fundos Multimercado": 0,
      "Investimentos Internacionais": 0,
      "Criptomoedas": 0
    },
    categories: ["Objetivo Específico", "Imobiliário", "Conservadora", "Indexada"],
    exampleProducts: [
      {
        name: "Tesouro IPCA+ 2026",
        type: "Título Público",
        description: "Proteção contra a inflação com rentabilidade real garantida"
      },
      {
        name: "LCI 98% CDI",
        type: "Letra de Crédito Imobiliário",
        description: "Investimento com isenção fiscal vinculado ao setor imobiliário"
      },
      {
        name: "FII de Títulos (papel)",
        type: "Fundo Imobiliário",
        description: "Exposição indireta ao mercado imobiliário com maior liquidez"
      }
    ]
  },
  {
    id: "renda-balance",
    name: "Balanceada com Proteção",
    riskLevel: "moderado",
    suitableProfiles: ["conservador", "moderado", "agressivo"],
    focus: ["Crescimento Moderado", "Diversificação"],
    expectedReturn: {
      min: 10.5,
      avg: 12.8,
      max: 15.2
    },
    volatility: 6.5,
    minHorizon: 3,
    description: "Estratégia que busca equilíbrio entre crescimento de capital e proteção patrimonial, com diversificação entre classes de ativos. Combina a estabilidade da renda fixa com o potencial de valorização de ativos variáveis, mantendo volatilidade controlada.",
    keyPoints: [
      "Diversificação ampla entre classes de ativos",
      "Balanceamento entre risco e retorno",
      "Proteção parcial contra inflação",
      "Adequada para objetivos de médio prazo"
    ],
    advantages: [
      "Boa relação risco-retorno para a maioria dos investidores",
      "Capacidade de adaptação a diferentes ciclos econômicos",
      "Proteção parcial em cenários adversos",
      "Captura parte da valorização dos mercados em alta"
    ],
    disadvantages: [
      "Pode ter desempenho abaixo da renda fixa em períodos de queda nos mercados",
      "Não aproveita integralmente ciclos de forte alta",
      "Exige rebalanceamentos periódicos para manter a alocação ideal"
    ],
    marketConditions: {
      favorable: [
        "Cenários de crescimento econômico moderado",
        "Ambientes de inflação controlada",
        "Períodos de estabilidade nas taxas de juros"
      ],
      unfavorable: [
        "Períodos de forte polarização de mercado",
        "Crises sistêmicas globais",
        "Momentos de grande incerteza política"
      ]
    },
    suitableFor: [
      "Investidores com horizonte de médio prazo (3-5 anos)",
      "Objetivos financeiros como educação dos filhos",
      "Complementação de aposentadoria ainda distante",
      "Patrimonialização com risco controlado"
    ],
    assetAllocationBase: {
      "Tesouro Direto": 20,
      "Renda Fixa": 35,
      "Fundos Imobiliários": 15,
      "Renda Variável": 20,
      "Fundos Multimercado": 5,
      "Investimentos Internacionais": 5,
      "Criptomoedas": 0
    },
    categories: ["Balanceada", "Diversificação", "Moderada", "Múltiplas Classes"],
    exampleProducts: [
      {
        name: "Tesouro IPCA+ com Juros",
        type: "Título Público",
        description: "Base de proteção com pagamentos semestrais"
      },
      {
        name: "ETF BOVA11",
        type: "Renda Variável",
        description: "Exposição diversificada ao mercado de ações brasileiro"
      },
      {
        name: "Fundo Multimercado Macro",
        type: "Multimercado",
        description: "Estratégias diversificadas com proteção em diferentes cenários"
      }
    ]
  },
  {
    id: "renda-passiva",
    name: "Geração de Renda Passiva",
    riskLevel: "moderado",
    suitableProfiles: ["conservador", "moderado", "agressivo"],
    focus: ["Geração de Renda", "Fluxo de Caixa", "Dividendos"],
    expectedReturn: {
      min: 9.5,
      avg: 11.8,
      max: 14.2
    },
    volatility: 5.5,
    minHorizon: 2,
    description: "Estratégia destinada a gerar renda recorrente através de dividendos, juros e aluguel, permitindo ao investidor viver dos rendimentos ou complementar sua renda mensal. Foco em ativos que distribuem proventos de forma consistente e previsível.",
    keyPoints: [
      "Fluxo regular de rendimentos",
      "Ênfase em ativos com dividendos e juros",
      "Preservação moderada de capital",
      "Diversificação em múltiplas fontes de renda"
    ],
    advantages: [
      "Renda previsível para complementação financeira",
      "Menor dependência da valorização dos ativos",
      "Potencial para reinvestimento e crescimento composto",
      "Psicologicamente confortável (ver rendimentos entrando)"
    ],
    disadvantages: [
      "Pode gerar menos crescimento patrimonial no longo prazo",
      "Menor proteção em cenários inflacionários extremos",
      "Incidência frequente de impostos (exceto em produtos isentos)",
      "Risco de corte de dividendos em crises"
    ],
    marketConditions: {
      favorable: [
        "Ambiente de juros moderados a altos",
        "Empresas maduras com bom histórico de pagamentos",
        "Mercado imobiliário aquecido (para FIIs)"
      ],
      unfavorable: [
        "Cenários de recessão prolongada",
        "Períodos de forte aperto fiscal para empresas",
        "Regulações que impactem distribuição de dividendos"
      ]
    },
    suitableFor: [
      "Aposentados ou pessoas próximas da aposentadoria",
      "Investidores que buscam complementação de renda",
      "Planejamento de independência financeira",
      "Famílias que precisam de fluxo de caixa regular"
    ],
    assetAllocationBase: {
      "Tesouro Direto": 15,
      "Renda Fixa": 30,
      "Fundos Imobiliários": 30,
      "Renda Variável": 20,
      "Fundos Multimercado": 5,
      "Investimentos Internacionais": 0,
      "Criptomoedas": 0
    },
    categories: ["Renda Passiva", "Dividendos", "Fluxo de Caixa", "Preservação"],
    exampleProducts: [
      {
        name: "Carteira de Ações Dividendos",
        type: "Renda Variável",
        description: "Ações de empresas com histórico consistente de distribuição"
      },
      {
        name: "FIIs de Tijolo",
        type: "Fundos Imobiliários",
        description: "Fundos com imóveis alugados e distribuição mensal"
      },
      {
        name: "CDB/LC com pagamentos semestrais",
        type: "Renda Fixa",
        description: "Títulos que pagam juros periodicamente antes do vencimento"
      }
    ]
  },
  {
    id: "aposentadoria-longo-prazo",
    name: "Aposentadoria Longo Prazo",
    riskLevel: "moderado",
    suitableProfiles: ["moderado", "agressivo"],
    focus: ["Crescimento Composto", "Horizonte Longo", "Acumulação"],
    expectedReturn: {
      min: 11.0,
      avg: 13.5,
      max: 16.0
    },
    volatility: 8.5,
    minHorizon: 10,
    description: "Estratégia desenhada para acumulação de patrimônio visando aposentadoria, com horizonte típico de 10+ anos. Combina crescimento de longo prazo com gestão de risco, aproveitando o poder dos juros compostos para maximizar o capital final.",
    keyPoints: [
      "Foco no resultado final de longo prazo",
      "Aproveitamento dos juros compostos",
      "Tolerância calculada a volatilidades de curto prazo",
      "Rebalanceamentos estratégicos periódicos"
    ],
    advantages: [
      "Potencial de acumulação significativa via juros compostos",
      "Maior exposição a ativos de crescimento diluindo risco temporal",
      "Flexibilidade para aportes regulares e estratégia Dollar-Cost Averaging",
      "Oportunidades de ajustes ao longo do caminho"
    ],
    disadvantages: [
      "Exige consistência e disciplina por período prolongado",
      "Volatilidade moderada a alta em períodos intermediários",
      "Pode requerer redução gradual de risco ao se aproximar do objetivo"
    ],
    marketConditions: {
      favorable: [
        "Perspectiva de crescimento econômico de longo prazo",
        "Estabilidade política e monetária",
        "Tendências demográficas e tecnológicas favoráveis"
      ],
      unfavorable: [
        "Ambientes de extrema instabilidade política de longo prazo",
        "Cenários deflacionários prolongados",
        "Controles de capital ou intervenções extremas nos mercados"
      ]
    },
    suitableFor: [
      "Investidores com mais de 10 anos para a aposentadoria",
      "Planejamento de independência financeira",
      "Pessoas que desejam complementar a previdência oficial",
      "Jovens profissionais em início de carreira"
    ],
    assetAllocationBase: {
      "Tesouro Direto": 15,
      "Renda Fixa": 15,
      "Fundos Imobiliários": 15,
      "Renda Variável": 30,
      "Fundos Multimercado": 10,
      "Investimentos Internacionais": 15,
      "Criptomoedas": 0
    },
    categories: ["Aposentadoria", "Longo Prazo", "Acumulação", "Previdência"],
    exampleProducts: [
      {
        name: "ETF de Índice Amplo",
        type: "Renda Variável",
        description: "Exposição diversificada ao mercado acionário"
      },
      {
        name: "Previdência Privada PGBL",
        type: "Previdência",
        description: "Veículo com benefício fiscal para acumulação de longo prazo"
      },
      {
        name: "ETF internacional",
        type: "Investimento Global",
        description: "Diversificação geográfica para redução de risco país"
      }
    ]
  },
  {
    id: "protecao-inflacionaria",
    name: "Proteção Inflacionária",
    riskLevel: "moderado",
    suitableProfiles: ["conservador", "moderado", "agressivo"],
    focus: ["Proteção contra Inflação", "Preservação de Poder de Compra"],
    expectedReturn: {
      min: 10.0,
      avg: 12.0,
      max: 14.5
    },
    volatility: 4.8,
    minHorizon: 3,
    description: "Estratégia focada em proteger o patrimônio contra efeitos da inflação, com alocação em ativos indexados e setores resistentes. Indicada para períodos de alta inflação ou para investidores preocupados com a preservação do poder de compra real.",
    keyPoints: [
      "Proteção do poder de compra",
      "Ativos indexados à inflação",
      "Setores com capacidade de repasse de preços",
      "Cobertura contra ciclos inflacionários"
    ],
    advantages: [
      "Manutenção do poder aquisitivo ao longo do tempo",
      "Proteção contra a desvalorização monetária",
      "Previsibilidade de ganho real",
      "Baixa correlação com mercados de renda fixa convencional"
    ],
    disadvantages: [
      "Pode ter desempenho inferior em cenários de deflação",
      "Menor rendimento em períodos de juros reais baixos",
      "Alguns produtos têm menor liquidez que alternativas convencionais"
    ],
    marketConditions: {
      favorable: [
        "Períodos de inflação crescente",
        "Expansão fiscal do governo",
        "Forte crescimento da base monetária"
      ],
      unfavorable: [
        "Períodos deflacionários",
        "Recessão profunda",
        "Política monetária contracionista"
      ]
    },
    suitableFor: [
      "Investidores com metas financeiras específicas que precisam de proteção real",
      "Planejamento para despesas futuras como educação dos filhos",
      "Complementação de aposentadoria com foco na manutenção do padrão de vida",
      "Reserva de valor em períodos de incerteza monetária"
    ],
    assetAllocationBase: {
      "Tesouro Direto": 30,
      "Renda Fixa": 25,
      "Fundos Imobiliários": 20,
      "Renda Variável": 15,
      "Fundos Multimercado": 5,
      "Investimentos Internacionais": 5,
      "Criptomoedas": 0
    },
    categories: ["Inflação", "Proteção Real", "Indexação", "Poder de Compra"],
    exampleProducts: [
      {
        name: "Tesouro IPCA+",
        type: "Título Público",
        description: "Proteção inflacionária com ganho real garantido"
      },
      {
        name: "Debêntures Incentivadas IPCA+",
        type: "Crédito Privado",
        description: "Títulos corporativos com isenção fiscal e indexação à inflação"
      },
      {
        name: "Ações de Empresas de Setores Essenciais",
        type: "Renda Variável",
        description: "Empresas com capacidade de repasse de preços em períodos inflacionários"
      }
    ]
  },
  {
    id: "crescimento-acelerado",
    name: "Crescimento Acelerado",
    riskLevel: "alto",
    suitableProfiles: ["moderado", "agressivo"],
    focus: ["Crescimento de Capital", "Valorização", "Exposição Agressiva"],
    expectedReturn: {
      min: 12.5,
      avg: 16.8,
      max: 22.2
    },
    volatility: 12.8,
    minHorizon: 5,
    description: "Estratégia focada em crescimento substancial de capital, com maior exposição a ativos de renda variável e classes alternativas. Aceita maior volatilidade no curto prazo visando retornos expressivos no longo prazo, ideal para investidores com alta tolerância a risco.",
    keyPoints: [
      "Foco em valorização de capital a longo prazo",
      "Exposição significativa a renda variável",
      "Potencial de superar a inflação significativamente",
      "Tolerância a volatilidade no curto prazo"
    ],
    advantages: [
      "Potencial de retornos acima da média do mercado",
      "Exposição a setores de alto crescimento e inovação",
      "Maior benefício de juros compostos no longo prazo",
      "Possibilidade de construção patrimonial acelerada"
    ],
    disadvantages: [
      "Alta volatilidade e oscilações significativas",
      "Risco de perdas temporárias expressivas",
      "Inadequado para recursos com necessidade de uso no curto prazo",
      "Exige disciplina emocional durante crises de mercado"
    ],
    marketConditions: {
      favorable: [
        "Ciclos de expansão econômica",
        "Políticas monetárias expansionistas",
        "Inovação tecnológica acelerada",
        "Confiança elevada dos consumidores e empresas"
      ],
      unfavorable: [
        "Recessões profundas",
        "Crises financeiras sistêmicas",
        "Políticas restritivas prolongadas",
        "Instabilidade geopolítica severa"
      ]
    },
    suitableFor: [
      "Investidores jovens com longo horizonte até a aposentadoria",
      "Pessoas com alta tolerância a volatilidade",
      "Indivíduos com fonte de renda estável e outras reservas",
      "Parte agressiva de uma estratégia core-satellite"
    ],
    assetAllocationBase: {
      "Tesouro Direto": 10,
      "Renda Fixa": 20,
      "Fundos Imobiliários": 15,
      "Renda Variável": 35,
      "Fundos Multimercado": 10,
      "Investimentos Internacionais": 7,
      "Criptomoedas": 3
    },
    categories: ["Crescimento Agressivo", "Alto Retorno", "Valorização", "Exposição Acionária"],
    exampleProducts: [
      {
        name: "ETFs Setoriais",
        type: "Renda Variável",
        description: "Exposição a setores específicos de alto crescimento"
      },
      {
        name: "Small Caps",
        type: "Ações",
        description: "Empresas menores com maior potencial de valorização"
      },
      {
        name: "Fundos de Venture Capital",
        type: "Alternativos",
        description: "Investimento em empresas emergentes e inovadoras"
      }
    ]
  },
  {
    id: "diversificacao-global",
    name: "Diversificação Global",
    riskLevel: "alto",
    suitableProfiles: ["moderado", "agressivo"],
    focus: ["Diversificação Geográfica", "Exposição Internacional", "Proteção contra Risco Brasil"],
    expectedReturn: {
      min: 11.5,
      avg: 14.8,
      max: 19.2
    },
    volatility: 10.2,
    minHorizon: 5,
    description: "Estratégia que busca diversificação geográfica, com exposição significativa a mercados internacionais para reduzir risco específico do Brasil. Permite acesso a setores pouco representados no mercado local e proteção contra instabilidades político-econômicas domésticas.",
    keyPoints: [
      "Diversificação entre países e regiões",
      "Proteção contra riscos locais",
      "Exposição a diferentes ciclos econômicos",
      "Acesso a setores subrepresentados no Brasil"
    ],
    advantages: [
      "Redução do risco específico do Brasil",
      "Acesso a empresas líderes globais",
      "Exposição a moedas fortes como proteção cambial",
      "Acesso a setores e tecnologias não disponíveis no mercado doméstico"
    ],
    disadvantages: [
      "Exposição à volatilidade cambial",
      "Complexidade fiscal e tratamento tributário",
      "Potencial descorrelação com necessidades em moeda local",
      "Custos operacionais possivelmente mais elevados"
    ],
    marketConditions: {
      favorable: [
        "Instabilidade política ou econômica doméstica",
        "Perspectiva de desvalorização da moeda local",
        "Crescimento global forte com Brasil em descompasso",
        "Ciclos de inovação concentrados em mercados desenvolvidos"
      ],
      unfavorable: [
        "Fortalecimento expressivo do real",
        "Brasil crescendo acima da média global",
        "Restrições a fluxos de capital internacional",
        "Custos tributários elevados para investimentos externos"
      ]
    },
    suitableFor: [
      "Investidores preocupados com risco político e econômico do Brasil",
      "Pessoas com planos de morar no exterior futuramente",
      "Famílias com despesas previstas em moeda estrangeira (educação, viagens)",
      "Quem busca exposição a setores tecnológicos e de inovação"
    ],
    assetAllocationBase: {
      "Tesouro Direto": 10,
      "Renda Fixa": 15,
      "Fundos Imobiliários": 10,
      "Renda Variável": 25,
      "Fundos Multimercado": 15,
      "Investimentos Internacionais": 25,
      "Criptomoedas": 0
    },
    categories: ["Internacional", "Diversificação Geográfica", "Proteção Cambial", "Global"],
    exampleProducts: [
      {
        name: "ETFs Globais (S&P 500, MSCI World)",
        type: "Renda Variável Internacional",
        description: "Exposição diversificada aos mercados globais desenvolvidos"
      },
      {
        name: "BDRs de Empresas Tecnológicas",
        type: "Recibos de Ações",
        description: "Acesso a empresas líderes em tecnologia negociadas no Brasil"
      },
      {
        name: "Fundo Cambial",
        type: "Proteção Cambial",
        description: "Exposição direta à variação de moedas fortes como dólar e euro"
      }
    ]
  },
  {
    id: "preservacao-capital-baixo-risco",
    name: "Preservação de Capital (Baixo Risco)",
    riskLevel: "baixo",
    suitableProfiles: ["conservador"],
    focus: ["Segurança Máxima", "Liquidez", "Preservação"],
    expectedReturn: {
      min: 7.8,
      avg: 9.0,
      max: 10.5
    },
    volatility: 1.0,
    minHorizon: 0.5,
    description: "Estratégia de máxima segurança com foco absoluto na preservação do capital e liquidez, adequada para reservas de emergência ou recursos que não podem sofrer oscilações. Prioriza títulos públicos, CDBs de bancos sólidos e fundos DI com liquidez imediata.",
    keyPoints: [
      "Segurança máxima do principal investido",
      "Altíssima liquidez para resgate imediato",
      "Rendimentos previsíveis e estáveis",
      "Mínima exposição a riscos de mercado"
    ],
    advantages: [
      "Tranquilidade em momentos de crise",
      "Disponibilidade imediata dos recursos",
      "Proteção contra flutuações de mercado",
      "Ideal para reservas de emergência"
    ],
    disadvantages: [
      "Retornos limitados, possivelmente abaixo da inflação",
      "Risco de perda de poder aquisitivo no longo prazo",
      "Oportunidade perdida em momentos de alta do mercado"
    ],
    marketConditions: {
      favorable: [
        "Períodos de alta instabilidade e incerteza",
        "Crises financeiras e volatilidade extrema",
        "Taxas de juros elevadas"
      ],
      unfavorable: [
        "Taxas de juros reais negativas",
        "Inflação descontrolada",
        "Longos períodos de estabilidade e crescimento"
      ]
    },
    suitableFor: [
      "Reserva de emergência (3-6 meses de despesas)",
      "Recursos para necessidades de curto prazo (menos de 1 ano)",
      "Valores destinados a compras específicas iminentes",
      "Perfil extremamente avesso a risco"
    ],
    assetAllocationBase: {
      "Tesouro Direto": 50,
      "Renda Fixa": 45,
      "Fundos Imobiliários": 0,
      "Renda Variável": 0,
      "Fundos Multimercado": 0,
      "Investimentos Internacionais": 0,
      "Criptomoedas": 0,
      "Caixa": 5
    },
    categories: ["Ultraconservadora", "Liquidez", "Segurança", "Reserva"],
    exampleProducts: [
      {
        name: "Tesouro Selic",
        type: "Título Público",
        description: "Liquidez diária e rentabilidade acompanhando a taxa básica"
      },
      {
        name: "CDB com liquidez diária",
        type: "Renda Fixa Bancária",
        description: "Certificados de bancos com resgate a qualquer momento"
      },
      {
        name: "Fundos DI com liquidez imediata",
        type: "Fundo de Investimento",
        description: "Carteira diversificada de títulos pós-fixados com resgate no dia"
      }
    ]
  },
  {
    id: "oportunista",
    name: "Oportunista",
    riskLevel: "alto",
    suitableProfiles: ["agressivo"],
    focus: ["Oportunidades de Mercado", "Alta Performance", "Momento"],
    expectedReturn: {
      min: 13.5,
      avg: 18.8,
      max: 25.2
    },
    volatility: 15.5,
    minHorizon: 7,
    description: "Estratégia agressiva que busca capturar oportunidades de mercado com potencial de alta performance, incluindo ativos alternativos e classes emergentes. Indicada apenas para investidores experientes com alta tolerância a risco e horizonte de longo prazo.",
    keyPoints: [
      "Foco em setores de alto crescimento",
      "Alocação tática e ajustes frequentes",
      "Inclusão de ativos alternativos",
      "Potencial de retornos expressivos com alta volatilidade"
    ],
    advantages: [
      "Potencial de retornos significativamente acima da média",
      "Aproveitamento de oportunidades de mercado e timing",
      "Exposição a classes de ativos emergentes",
      "Captura de movimentos táticos e setoriais"
    ],
    disadvantages: [
      "Volatilidade muito elevada, com oscilações extremas",
      "Risco de perdas permanentes em casos de eventos extremos",
      "Necessidade de monitoramento constante e análise de mercado",
      "Dependência de competência na seleção e timing"
    ],
    marketConditions: {
      favorable: [
        "Mercados em estágios iniciais de recuperação",
        "Setores emergentes com inovação disruptiva",
        "Ciclos de política monetária expansionista",
        "Períodos pós-correções significativas"
      ],
      unfavorable: [
        "Mercados em topos históricos de valorização",
        "Aperto monetário em curso",
        "Cenários de incerteza macroeconômica grave",
        "Instabilidade institucional ou geopolítica"
      ]
    },
    suitableFor: [
      "Apenas investidores com alta capacidade de absorção de risco",
      "Pessoa com portfólio já diversificado buscando maximizar um componente",
      "Investidores com conhecimento avançado de mercados",
      "Horizonte de pelo menos 7-10 anos sem necessidade dos recursos"
    ],
    assetAllocationBase: {
      "Tesouro Direto": 5,
      "Renda Fixa": 10,
      "Fundos Imobiliários": 10,
      "Renda Variável": 40,
      "Fundos Multimercado": 15,
      "Investimentos Internacionais": 15,
      "Criptomoedas": 5
    },
    categories: ["Oportunista", "Alto Risco", "Timing", "Agressiva"],
    exampleProducts: [
      {
        name: "Small Caps e Setores Específicos",
        type: "Renda Variável",
        description: "Empresas menores ou de setores em forte crescimento"
      },
      {
        name: "Fundos Long & Short",
        type: "Multimercado",
        description: "Estratégias que aproveitam distorções e oportunidades táticas"
      },
      {
        name: "Ativos Alternativos (Criptomoedas, Venture)",
        type: "Alternativos",
        description: "Exposição controlada a classes não tradicionais de alto potencial"
      }
    ]
  }
];

export default investmentStrategies; 