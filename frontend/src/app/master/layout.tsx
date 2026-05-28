import { auth, signOut } from '@/lib/auth';
import Link from 'next/link';
import { Building2, BarChart3, Settings, LogOut, CreditCard, Bell, Crown } from 'lucide-react';
import Logo from '@/components/Logo';

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userName = session?.user?.name ?? 'Admin';

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-gray-900 text-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between gap-3">
          <Logo variant="row" size={36} dark />
          <span className="text-[10px] bg-yellow-500 text-gray-900 px-1.5 py-0.5 rounded font-semibold">ADMIN</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <MasterLink href="/master" icon={<Building2 size={18} />} label="Agências" />
          <MasterLink href="/master/planos" icon={<CreditCard size={18} />} label="Planos" />
          <MasterLink href="/master/metricas" icon={<BarChart3 size={18} />} label="Métricas" />
          <MasterLink href="/master/notificacoes" icon={<Bell size={18} />} label="Notificações" />
          <MasterLink href="/master/fundador-feedback" icon={<Crown size={18} />} label="Fundadores" />
          <MasterLink href="/master/configuracoes" icon={<Settings size={18} />} label="Configurações" />
        </nav>

        <form
          action={async () => {
            'use server';
            const baseUrl = process.env.NEXTAUTH_URL ?? 'https://sutogas.com.br';
            await signOut({ redirectTo: `${baseUrl}/login` });
          }}
          className="p-3 border-t border-gray-800"
        >
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </form>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Painel Master</h2>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/dashboard" className="text-gray-600 hover:text-orange-600">
              Ir para Dashboard
            </Link>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">👤 {userName}</span>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function MasterLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
