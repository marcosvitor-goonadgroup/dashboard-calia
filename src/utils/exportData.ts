import { format } from 'date-fns';
import { ProcessedCampaignData } from '../types/campaign';

// Exporta as linhas diárias exibidas na página (já filtradas) em CSV ou Excel.
// Cada linha do arquivo = uma linha de dado (dia × anúncio), com as colunas
// de hierarquia Agência > Cliente > Campanha > PI.

type ColumnType = 'date' | 'text' | 'integer' | 'currency';

interface ExportColumn {
  header: string;
  type: ColumnType;
  width: number;
  value: (row: ProcessedCampaignData) => Date | string | number;
}

const COLUMNS: ExportColumn[] = [
  { header: 'Data', type: 'date', width: 12, value: r => r.date },
  { header: 'Agência', type: 'text', width: 14, value: r => r.agencia },
  { header: 'Cliente', type: 'text', width: 24, value: r => r.cliente },
  { header: 'Campanha', type: 'text', width: 28, value: r => r.campanha },
  { header: 'Número PI', type: 'text', width: 12, value: r => r.numeroPi },
  { header: 'Veículo', type: 'text', width: 16, value: r => r.veiculo },
  { header: 'Tipo de Compra', type: 'text', width: 14, value: r => r.tipoDeCompra },
  { header: 'Localização', type: 'text', width: 16, value: r => r.localizacao },
  { header: 'Campaign Name', type: 'text', width: 40, value: r => r.campaignName },
  { header: 'Conjunto de Anúncios', type: 'text', width: 30, value: r => r.adSetName },
  { header: 'Anúncio', type: 'text', width: 30, value: r => r.adName },
  // Mesmo valor do card "Investimento" (tabela de preços, com fallback no custo)
  { header: 'Investimento (R$)', type: 'currency', width: 16, value: r => r.realInvestment ?? r.cost },
  { header: 'Impressões', type: 'integer', width: 14, value: r => r.impressions },
  { header: 'Alcance', type: 'integer', width: 12, value: r => r.reach },
  { header: 'Cliques', type: 'integer', width: 10, value: r => r.clicks },
  { header: 'Views', type: 'integer', width: 10, value: r => r.videoViews },
  { header: 'Views 25%', type: 'integer', width: 11, value: r => r.videoViews25 },
  { header: 'Views 50%', type: 'integer', width: 11, value: r => r.videoViews50 },
  { header: 'Views 75%', type: 'integer', width: 11, value: r => r.videoViews75 },
  { header: 'Views 100%', type: 'integer', width: 11, value: r => r.videoCompletions },
  { header: 'Engajamento', type: 'integer', width: 12, value: r => r.totalEngagements }
];

const compareText = (a: string, b: string) =>
  (a || '').localeCompare(b || '', 'pt-BR', { numeric: true, sensitivity: 'base' });

// Ordena na mesma estrutura da tela: Cliente > Campanha > PI, e por data dentro do PI
const sortRows = (rows: ProcessedCampaignData[]) =>
  [...rows].sort(
    (a, b) =>
      compareText(a.cliente, b.cliente) ||
      compareText(a.campanha, b.campanha) ||
      compareText(a.numeroPi, b.numeroPi) ||
      a.date.getTime() - b.date.getTime() ||
      compareText(a.veiculo, b.veiculo)
  );

const roundCurrency = (n: number) => Math.round(n * 100) / 100;

// Nome do arquivo: <base>_<data inicial>_a_<data final>
export const buildExportFileName = (base: string, rows: ProcessedCampaignData[]): string => {
  if (rows.length === 0) return base;
  const times = rows.map(r => r.date.getTime());
  const start = format(new Date(Math.min(...times)), 'yyyy-MM-dd');
  const end = format(new Date(Math.max(...times)), 'yyyy-MM-dd');
  return `${base}_${start}_a_${end}`;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoga depois: revogar na hora pode cancelar o download em alguns navegadores
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// CSV no padrão do Excel pt-BR: separador ";", vírgula decimal e BOM UTF-8 (acentos)
const formatCsvValue = (column: ExportColumn, row: ProcessedCampaignData): string => {
  const value = column.value(row);
  switch (column.type) {
    case 'date':
      return format(value as Date, 'dd/MM/yyyy');
    case 'currency':
      return roundCurrency(value as number).toFixed(2).replace('.', ',');
    case 'integer':
      return String(value).replace('.', ',');
    default: {
      const text = String(value ?? '');
      return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }
  }
};

export const exportToCsv = (rows: ProcessedCampaignData[], fileName: string) => {
  const lines = [
    COLUMNS.map(c => c.header).join(';'),
    ...sortRows(rows).map(row => COLUMNS.map(c => formatCsvValue(c, row)).join(';'))
  ];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${fileName}.csv`);
};

// O Excel converte datas em UTC: usa meia-noite UTC do dia local para não trocar o dia
const toExcelDate = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

export const exportToExcel = async (rows: ProcessedCampaignData[], fileName: string) => {
  // Import dinâmico: a lib só é baixada quando o usuário exporta
  const { default: writeExcelFile } = await import('write-excel-file/browser');

  const header = COLUMNS.map(c => ({
    value: c.header,
    fontWeight: 'bold' as const,
    textColor: '#FFFFFF',
    backgroundColor: '#2563EB'
  }));

  const body = sortRows(rows).map(row =>
    COLUMNS.map(c => {
      const value = c.value(row);
      switch (c.type) {
        case 'date':
          return { type: Date, value: toExcelDate(value as Date), format: 'dd/mm/yyyy' };
        case 'currency':
          return { type: Number, value: roundCurrency(value as number), format: '#,##0.00' };
        case 'integer':
          return { type: Number, value: value as number, format: '#,##0' };
        default:
          return { type: String, value: String(value ?? '') };
      }
    })
  );

  await writeExcelFile([header, ...body], {
    sheet: 'Dados',
    columns: COLUMNS.map(c => ({ width: c.width })),
    stickyRowsCount: 1
  }).toFile(`${fileName}.xlsx`);
};
