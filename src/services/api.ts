import axios from 'axios';
import { ApiResponse, ProcessedCampaignData, ProcessedSearchData, PricingTableRow } from '../types/campaign';
import { parse } from 'date-fns';

const CAMPAIGN_API_URLS = [
  'https://nmbcoamazonia-api.vercel.app/google/sheets/11wHR3ygl6w52Lfy6riucnxkH0IWYEy-Pd_6qryqo7OY/data?range=Meta'
];

const SEARCH_API_URLS = [
  'https://nmbcoamazonia-api.vercel.app/google/sheets/1abcar-ESRB_f8ytKGQ_ru_slZ67cXhjxKt8gL7TrEVw/data?range=Search',
  'https://nmbcoamazonia-api.vercel.app/google/sheets/1HykUxjCGGdveDS_5vlLOOkAq7Wkl058453xkYGTAzNM/data?range=Search'
];

const PRICING_API_URL = 'https://nmbcoamazonia-api.vercel.app/google/sheets/1zgRBEs_qi_9DdYLqw-cEedD1u66FS88ku6zTZ0gV-oU/data?range=base';

const PI_INFO_BASE_URL = 'https://nmbcoamazonia-api.vercel.app/google/sheets/1T35Pzw9ZA5NOTLHsTqMGZL5IEedpSGdZHJ2ElrqLs1M/data';
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
              cliente: cliente
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
    cliente: ''
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
