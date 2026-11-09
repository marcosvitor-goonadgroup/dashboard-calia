import logoAlia from '../images/logo-alia-fsb-dark.svg';

const Footer = () => {
  return (
    <footer className="w-full bg-white rounded-lg shadow border border-gray-200 px-6 py-4 mt-6 flex items-center justify-between">
      <p className="text-gray-400 text-xs">
        © {new Date().getFullYear()} Alia — Painel de Campanhas
      </p>
      <img
        src={logoAlia}
        alt="Alia"
        className="h-8 w-auto opacity-60"
      />
    </footer>
  );
};

export default Footer;
