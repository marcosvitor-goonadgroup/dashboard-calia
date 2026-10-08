import axios from 'axios';
import { ApiResponse, ProcessedCampaignData, ProcessedSearchData, PricingTableRow } from '../types/campaign';
import { parse } from 'date-fns';
import { toSlug } from '../utils/slug';

const API_BASE = 'https://nmbcoamazonia-api.vercel.app';

const CAMPAIGN_API_URLS = [
  `${API_BASE}/google/sheets/11wHR3ygl6w52Lfy6riucnxkH0IWYEy-Pd_6qryqo7OY/data?range=Meta`
];

// Planilhas no formato "Consolidado": Dailymotion, Caixa/Cittamobi,
// Ministério da Saúde/Moovit, etc. São todas mapeadas por mapConsolidatedRow.
// As colunas variam entre planilhas (ex.: a do Ministério não tem "Video View"
// nem "Localização"), por isso o mapeamento é feito pelo cabeçalho.
const CONSOLIDATED_API_URLS = [
  `${API_BASE}/google/sheets/108JM2aCuwPURZaN3KQa_jjOBi0eT1twSFbT29kzEb3E/data?range=dailymotion`,
  `${API_BASE}/google/sheets/1wB305ZP8J7EWaCz2BL3QHi0B-NDDILgip0r8pwpcFO4/data?range=Consolidado`,
  `${API_BASE}/google/sheets/1vvIEydJYR3eqY_BC5H47RLgjzP7ks45ad5G-NQmMOBY/data?range=Consolidado`
];

const SEARCH_API_URLS = [
  `${API_BASE}/google/sheets/1abcar-ESRB_f8ytKGQ_ru_slZ67cXhjxKt8gL7TrEVw/data?range=Search`,
  `${API_BASE}/google/sheets/1HykUxjCGGdveDS_5vlLOOkAq7Wkl058453xkYGTAzNM/data?range=Search`
];

const PRICING_API_URL = `${API_BASE}/google/sheets/1zgRBEs_qi_9DdYLqw-cEedD1u66FS88ku6zTZ0gV-oU/data?range=base`;

const PI_INFO_BASE_URL = `${API_BASE}/google/sheets/1T35Pzw9ZA5NOTLHsTqMGZL5IEedpSGdZHJ2ElrqLs1M/data`;
const PI_INFO_API_URL = `${PI_INFO_BASE_URL}?range=base`;
const PI_INFO_REPRESENTACAO_URL = `${PI_INFO_BASE_URL}?range=representacao`;

const parseNumber = (value: string): number => {
  if (!value || value === '') return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const parseCurrency = (value: string): number => {
  if (!value || value === '') return 0;
  // Remove "R$" e espaços, depois processa como número
  const cleaned = value.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const parsePercentage = (value: string): number => {
  if (!value || value === '') return 0;
  // Remove "%" e converte para decimal
  const cleaned = value.replace('%', '').trim().replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const parseDate = (dateString: string): Date => {
  try {
    // Suporta formato yyyy-MM-dd (Meta) e dd/MM/yyyy (legado)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
      return parse(dateString.substring(0, 10), 'yyyy-MM-dd', new Date());
    }
    return parse(dateString, 'dd/MM/yyyy', new Date());
  } catch {
    return new Date();
  }
};

const parseSearchDate = (dateString: string): Date => {
  try {
    // Format from API: "2025-04-08"
    return parse(dateString, 'yyyy-MM-dd', new Date());
  } catch {
    return new Date();
  }
};

const normalizeVeiculo = (veiculo: string): string => {
  const normalized = veiculo.trim();
  const lower = normalized.toLowerCase();
  if (lower === 'audience network' || lower === 'messenger' || lower === 'threads' || lower === 'unknown') {
    return 'Facebook';
  }
  return normalized;
};

export const fetchCampaignData = async (): Promise<ProcessedCampaignData[]> => {
  try {
    const responses = await Promise.all(
      CAMPAIGN_API_URLS.map(url => axios.get<ApiResponse>(url))
    );

    const allData: ProcessedCampaignData[] = [];

    responses.forEach(response => {
      if (response.data.success && response.data.data.values.length > 1) {
        const rows = response.data.data.values.slice(1);

        rows.forEach(row => {
          if (row.length >= 26) {
            const numeroPi = row[31] || '';
            const veiculoRaw = row[11] || '';
            const veiculo = normalizeVeiculo(veiculoRaw);
            const cliente = row[28] || '';

            // Ignora linhas onde o Número PI é "#VALUE!", EXCETO para Google Search
            if (numeroPi === '#VALUE!' && veiculo !== 'Google Search') {
              return;
            }

            // Novo formato Meta:
            // [0] Day, [1] Account Name, [2] Campaign Name, [3] Campaign ID,
            // [4] Ad Set Start Time, [5] Ad Set End Time, [6] Objective,
            // [7] Ad Set Name, [8] Ad Name, [9] Creative Image, [10] Placement,
            // [11] Platform, [12] Impressions, [13] Link Clicks, [14] Video Plays,
            // [15] Video Watches at 25%, [16] 50%, [17] 75%, [18] 100%,
            // [19] Post Reactions, [20] Post Shares, [21] Reach,
            // [22] Website Conversions, [23] Leads, [24] Post Engagement,
            // [25] Cost, [26] UTM Content, [27] Tipo de Compra,
            // [28] Cliente, [29] Agência, [30] Nome campanha, [31] Número PI
            const dataRow: ProcessedCampaignData = {
              date: parseDate(row[0]),
              campaignName: row[2] || '',
              adSetName: row[7] || '',
              adName: row[8] || '',
              cost: parseCurrency(row[25]),
              impressions: parseNumber(row[12]),
              reach: parseNumber(row[21]),
              clicks: parseNumber(row[13]),
              videoViews: parseNumber(row[14]),
              videoViews25: parseNumber(row[15]),
              videoViews50: parseNumber(row[16]),
              videoViews75: parseNumber(row[17]),
              videoCompletions: parseNumber(row[18]),
              totalEngagements: parseNumber(row[24]),
              veiculo: veiculo,
              tipoDeCompra: row[27] || '',
              videoEstaticoAudio: '',
              image: row[9] || '',
              campanha: row[30] || '',
              numeroPi: numeroPi,
              localizacao: '',
              cliente: cliente,
              agencia: row[29] || ''
            };
            allData.push(dataRow);
          }
        });
      }
    });

    return allData;
  } catch (error) {
    console.error('Erro ao buscar dados das campanhas:', error);
    throw error;
  }
};

// Normaliza o nome de uma coluna para casar grafias diferentes entre
// planilhas: "Campaign Name" / "CampaignName", "Views 25%" / "Views25%".
const normalizeHeader = (header: string): string => toSlug(header).replace(/-/g, '');

// Quando a coluna "Campanha" vem vazia (ex.: Ministério da Saúde), deriva o
// nome a partir da taxonomia do Campaign Name:
//   mes_agencia_cliente_[veiculo-]campanha-N_..._veiculo_PI
// Ex.: "fev_calia_ministerio-da-saude_moovit-campanha-de-carnaval-1_..." -> "Campanha de carnaval"
const deriveCampanha = (campaignName: string, veiculo: string): string => {
  let segment = campaignName.split('_')[3] || '';
  const vehiclePrefix = `${toSlug(veiculo)}-`;
  if (segment.startsWith(vehiclePrefix)) segment = segment.slice(vehiclePrefix.length);
  const name = segment
    .replace(/-\d(?=-|$)/g, '') // remove o número da linha ("-1", "-2")
    .replace(/-/g, ' ')
    .trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// Mapeia uma linha do formato "Consolidado" para ProcessedCampaignData,
// localizando cada campo pelo nome (normalizado) da coluna no cabeçalho.
// Colunas usadas: Data, Campaign Name, Ad Group Name, Ad Name, Ad Final URL,
// Impressions, Clicks, Video View(s), Views 25/50/75/100%, Agência, Veículo,
// Número PI, Tipo de Compra, Investimento, Campanha, Localização, Cliente.
// Obs.: a coluna Cost(Spend) vem vazia; o gasto está em "Investimento".
const mapConsolidatedRow = (row: string[], columns: Map<string, number>): ProcessedCampaignData => {
  // Aceita aliases para colunas grafadas de forma diferente entre planilhas
  const col = (...names: string[]): string => {
    for (const name of names) {
      const i = columns.get(name);
      if (i !== undefined && row[i]) return row[i];
    }
    return '';
  };

  const tipoDeCompra = col('tipodecompra');
  const completeViews = parseNumber(col('views100'));
  // CPCV (custo por complete view): a unidade de entrega/cobrança é a
  // visualização completa (Views100%), então "views" usa essa coluna.
  // Nos demais tipos, "views" segue a coluna Video View.
  const isCPCV = tipoDeCompra.toUpperCase().includes('CPCV');
  const campaignName = col('campaignname');
  const veiculo = normalizeVeiculo(col('veiculo'));
  return {
    date: parseDate(col('data')),
    campaignName,
    adSetName: col('adgroupname'),
    adName: col('adname'),
    cost: parseCurrency(col('investimento')),
    impressions: parseNumber(col('impressions')),
    reach: 0,
    clicks: parseNumber(col('clicks')),
    videoViews: isCPCV ? completeViews : parseNumber(col('videoviews', 'videoview')),
    videoViews25: parseNumber(col('views25')),
    videoViews50: parseNumber(col('views50')),
    videoViews75: parseNumber(col('views75')),
    videoCompletions: completeViews,
    totalEngagements: 0,
    veiculo,
    tipoDeCompra,
    videoEstaticoAudio: '',
    image: col('adfinalurl'),
    campanha: col('campanha') || deriveCampanha(campaignName, veiculo),
    numeroPi: col('numeropi'),
    localizacao: col('localizacao'),
    cliente: col('cliente'),
    agencia: col('agencia')
  };
};

export const fetchConsolidatedData = async (): Promise<ProcessedCampaignData[]> => {
  try {
    const responses = await Promise.all(
      CONSOLIDATED_API_URLS.map(url => axios.get<ApiResponse>(url))
    );

    const allData: ProcessedCampaignData[] = [];

    responses.forEach(response => {
      if (response.data.success && response.data.data.values.length > 1) {
        const [header, ...rows] = response.data.data.values;
        const columns = new Map(header.map((name, i) => [normalizeHeader(name), i] as [string, number]));
        rows.forEach(row => {
          // A API omite células vazias no fim da linha: linhas mais curtas
          // que o cabeçalho estão incompletas (sem Cliente) e são ignoradas.
          if (row.length >= header.length) {
            allData.push(mapConsolidatedRow(row, columns));
          }
        });
      }
    });

    return allData;
  } catch (error) {
    console.error('Erro ao buscar dados consolidados:', error);
    throw error;
  }
};

export const fetchSearchTermsData = async (): Promise<ProcessedSearchData[]> => {
  try {
    const responses = await Promise.all(
      SEARCH_API_URLS.map(url => axios.get<ApiResponse>(url))
    );

    const allData: ProcessedSearchData[] = [];

    responses.forEach(response => {
      if (response.data.success && response.data.data.values.length > 1) {
        const rows = response.data.data.values.slice(1);

        rows.forEach(row => {
          if (row.length >= 6) {
            const impressions = parseNumber(row[4]);
            const clicks = parseNumber(row[5]);
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

            const dataRow: ProcessedSearchData = {
              date: parseSearchDate(row[0]),
              campaignName: row[1] || '',
              searchTerm: row[2] || '',
              cost: parseNumber(row[3]),
              impressions,
              clicks,
              veiculo: row[6] || 'Google Search',
              campanha: row[7] || '',
              ctr
            };
            allData.push(dataRow);
          }
        });
      }
    });

    return allData;
  } catch (error) {
    console.error('Erro ao buscar dados de termos de busca:', error);
    throw error;
  }
};

export const fetchPricingTable = async (): Promise<PricingTableRow[]> => {
  try {
    const response = await axios.get<ApiResponse>(PRICING_API_URL);

    if (response.data.success && response.data.data.values.length > 1) {
      const rows = response.data.data.values.slice(1); // Pula o header

      const pricingData: PricingTableRow[] = rows.map(row => ({
        veiculo: row[0] || '',
        canal: row[1] || '',
        formato: row[2] || '',
        tipoDeCompra: row[3] || '',
        valorUnitario: parseCurrency(row[4]),
        desconto: parsePercentage(row[5]),
        valorFinal: parseCurrency(row[6])
      }));

      return pricingData;
    }

    return [];
  } catch (error) {
    console.error('Erro ao buscar tabela de preços:', error);
    throw error;
  }
};

/**
 * Converte dados do Google Search para o formato ProcessedCampaignData
 */
export const convertSearchDataToCampaignData = (searchData: ProcessedSearchData[]): ProcessedCampaignData[] => {
  return searchData.map(item => ({
    date: item.date,
    campaignName: item.campaignName,
    adSetName: item.searchTerm,
    adName: item.searchTerm,
    cost: item.cost,
    impressions: item.impressions,
    reach: 0,
    clicks: item.clicks,
    videoViews: 0,
    videoViews25: 0,
    videoViews50: 0,
    videoViews75: 0,
    videoCompletions: 0,
    totalEngagements: 0,
    veiculo: 'Google Search',
    tipoDeCompra: 'CPC',
    videoEstaticoAudio: '',
    image: '',
    campanha: item.campanha,
    numeroPi: '',
    localizacao: '',
    cliente: '',
    agencia: ''
  }));
};

/**
 * Busca informações de um PI específico (nas abas "base" e "representacao")
 */
export const fetchPIInfo = async (numeroPi: string) => {
  try {
    const normalizedPi = numeroPi.replace(/^0+/, '').replace(/\./g, '').replace(',', '.');

    const [baseRes, reprRes] = await Promise.allSettled([
      axios.get(PI_INFO_API_URL),
      axios.get(PI_INFO_REPRESENTACAO_URL)
    ]);

    const piInfo: ReturnType<typeof mapBaseRow>[] = [];

    // Aba "base" — PI está na coluna [2]
    if (baseRes.status === 'fulfilled' && baseRes.value.data.success && baseRes.value.data.data.values) {
      const rows: string[][] = baseRes.value.data.data.values.slice(1);
      rows
        .filter(row => (row[2] || '').replace(/^0+/, '').replace(/\./g, '').replace(',', '.') === normalizedPi)
        .forEach(row => piInfo.push(mapBaseRow(row)));
    }

    // Aba "representacao"
    if (reprRes.status === 'fulfilled' && reprRes.value.data.success && reprRes.value.data.data.values) {
      const rows: string[][] = reprRes.value.data.data.values.slice(1);
      rows
        .filter(row => (row[2] || '').replace(/^0+/, '').replace(/\./g, '').replace(',', '.') === normalizedPi)
        .forEach(row => piInfo.push(mapRepresentacaoRow(row)));
    }

    return piInfo.length > 0 ? piInfo : null;
  } catch (error) {
    console.error('Erro ao buscar informações do PI:', error);
    return null;
  }
};

// Colunas aba "base":
// [0] Agência, [1] Cliente, [2] Número PI, [3] Veículo, [4] Canal, [5] Formato,
// [6] Modelo Compra, [7] Valor Uni, [8] Desconto, [9] Valor Negociado, [10] Qtd,
// [11] TT Bruto, [12] Reaplicação, [13] Status, [14] Segmentação, [15] Alcance,
// [16] Inicio, [17] Fim, [18] Público, [19] Praça, [20] Objetivo
const mapBaseRow = (row: string[]) => ({
  numeroPi: row[2] || '',
  veiculo: row[3] || '',
  canal: row[4] || '',
  formato: row[5] || '',
  modeloCompra: row[6] || '',
  valorNegociado: row[9] || '',
  quantidade: row[10] || '',
  totalBruto: row[11] || '',
  status: row[13] || '',
  segmentacao: row[14] || '',
  alcance: row[15] || '',
  inicio: row[16] || '',
  fim: row[17] || '',
  publico: row[18] || '',
  praca: row[19] || '',
  objetivo: row[20] || ''
});

const mapRepresentacaoRow = (row: string[]) => ({
  numeroPi: row[2] || '',
  veiculo: row[3] || '',
  canal: '',
  formato: row[4] || '',
  modeloCompra: row[5] || '',
  valorNegociado: row[12] || '',
  quantidade: row[10] || '',
  totalBruto: row[14] || '',
  status: '',
  segmentacao: row[6] || '',
  alcance: row[7] || '',
  inicio: row[8] || '',
  fim: row[9] || '',
  publico: '',
  praca: row[15] || '',
  objetivo: row[16] || ''
});
