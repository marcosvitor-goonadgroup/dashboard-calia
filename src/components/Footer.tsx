import logoCalia from '../images/calia-logo-black.svg';

const Footer = () => {
  return (
    <footer className="w-full bg-white rounded-lg shadow border border-gray-200 px-6 py-4 mt-6 flex items-center justify-between">
      <p className="text-gray-400 text-xs">
        © {new Date().getFullYear()} Calia — Painel de Campanhas
      </p>
      <img
        src={logoCalia}
        alt="Calia"
        className="h-6 w-auto opacity-60"
      />
    </footer>
  );
};

export default Footer;
