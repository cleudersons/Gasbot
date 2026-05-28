import Logo from '@/components/Logo';

export default function Footer() {
  return (
    <footer className="bg-[#1A1A2E] text-gray-400 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo variant="row" size={28} />
        <p className="text-xs">
          © {new Date().getFullYear()} SutoGas — Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
