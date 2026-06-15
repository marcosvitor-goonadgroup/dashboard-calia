import logoCalia from '../images/calia-logo-black.svg';

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumb: Crumb[];
  agencia: string;
  clientName?: string;
  clientLogo?: string;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

const PageHeader = ({
  breadcrumb,
  agencia,
  clientName,
  clientLogo,
  onOpenFilters,
  onClearFilters,
  activeFiltersCount
}: PageHeaderProps) => {
  return (
    <header className="bg-white shadow-sm border border-gray-200 rounded-lg px-4 sm:px-6 py-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <a href="/" title="Visão da agência" className="shrink-0">
            <img src={logoCalia} alt="Calia" className="h-8 sm:h-10 w-auto" />
          </a>

          <div className="border-l border-gray-300 pl-3 sm:pl-4 min-w-0 flex items-center gap-3">
            {clientLogo && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 shrink-0 hidden sm:flex items-center">
                <img src={clientLogo} alt={clientName || ''} className="h-7 w-auto max-w-[160px] object-contain" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {breadcrumb.map((c, i) => {
                  const isLast = i === breadcrumb.length - 1;
                  return (
                    <span key={i} className="flex items-center gap-1.5">
                      {i > 0 && <span className="text-gray-300">/</span>}
                      {isLast ? (
                        <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate max-w-[200px] sm:max-w-[420px]">
                          {c.label}
                        </h1>
                      ) : c.href ? (
                        <a href={c.href} className="text-xs sm:text-sm font-medium text-gray-500 hover:text-blue-600 truncate max-w-[140px] sm:max-w-[260px]">
                          {c.label}
                        </a>
                      ) : (
                        <span className="text-xs sm:text-sm font-medium text-gray-500 truncate max-w-[140px] sm:max-w-[260px]">
                          {c.label}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Painel de Campanhas
                {agencia && <span className="text-gray-400"> | {agencia}</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
              title="Limpar filtros"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            onClick={onOpenFilters}
            className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
