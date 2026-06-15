import logoSenai from '../images/Logo-SENAI.png';
import logoSesi from '../images/sesi_logo.jpg';
import logoSesc from '../images/logo-sesc.png';
import logoEmbratur from '../images/logo_embratur.png';
import { toSlug } from '../utils/slug';

// Mapeia logos por slug do nome do cliente (case/acento-insensível) para casar
// com o roteamento por slug usado nos dashboards.
const logosBySlug: Record<string, string> = {
  [toSlug('SENAI')]: logoSenai,
  [toSlug('SESI')]: logoSesi,
  [toSlug('SESC')]: logoSesc,
  [toSlug('Embratur')]: logoEmbratur
};

export const getClientLogo = (name: string): string | undefined =>
  logosBySlug[toSlug(name || '')];
