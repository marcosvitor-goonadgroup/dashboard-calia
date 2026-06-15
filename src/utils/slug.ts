// Gera um slug estável a partir de um texto (case/acento-insensível).
// Usado pelo roteamento por path: /cliente/campanha/pi
export const toSlug = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const fromSlug = (slug: string): string => slug;
