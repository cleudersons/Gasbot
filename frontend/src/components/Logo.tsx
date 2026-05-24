import Image from 'next/image';

interface LogoProps {
  variant?: 'icon' | 'row' | 'full';
  size?: number; // tamanho do ícone (px)
  dark?: boolean; // adapta cor do texto para fundo escuro
  className?: string;
}

/**
 * <Logo /> → só o ícone quadrado
 * <Logo variant="row" /> → ícone + "SutoGas" lado a lado
 * <Logo variant="full" /> → ícone + "SutoGas" + tagline embaixo
 */
export default function Logo({
  variant = 'icon',
  size = 40,
  dark = false,
  className = '',
}: LogoProps) {
  const sutoColor = dark ? 'text-white' : 'text-gray-900';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/icon.png"
        alt="SutoGas"
        width={size}
        height={size}
        priority
        className="rounded-lg"
      />
      {variant !== 'icon' && (
        <div className="leading-tight">
          <div
            className={`font-bold ${sutoColor} ${
              variant === 'full' ? 'text-3xl' : 'text-xl'
            }`}
          >
            <span>Suto</span>
            <span className="text-orange-500">Gas</span>
          </div>
          {variant === 'full' && (
            <div
              className={`text-[10px] uppercase tracking-widest mt-0.5 ${
                dark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Seu depósito no piloto automático
            </div>
          )}
        </div>
      )}
    </div>
  );
}
