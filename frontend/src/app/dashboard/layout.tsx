import { auth, signOut } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import Link from 'next/link';
import {
  Home,
  Users,
  Settings,
  LogOut,
  Plug,
  UserCircle,
  Rocket,
} from 'lucide-react';
import TrialBanner from '@/components/TrialBanner';
import Logo from '@/components/Logo';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userName = session?.user?.name ?? 'Usuário';
  const agenciaId = (session?.user as any)?.agenciaId as string | null | undefined;

  let statusConta: string | null = null;
  let trialInicio: string | null = null;
  let trialAtendimentos = 0;
  let promptOk = false;
  let entregadoresOk = false;
  let conexaoOk = false;
  let mostrarInicio = false;
  let passosCompletos = 1; // conta criada

  if (agenciaId) {
    const db = supabaseAdmin();
    const [{ data: ag }, { count: entCount }] = await Promise.all([
      db
        .from('agencias')
        .select(
          'status_conta, trial_inicio, trial_atendimentos, prompt_customizado, provider, criado_em',
        )
        .eq('id', agenciaId)
        .maybeSingle(),
      db
        .from('entregadores')
        .select('id', { count: 'exact', head: true })
        .eq('agencia_id', agenciaId)
        .eq('ativo', true),
    ]);

    if (ag) {
      statusConta = ag.status_conta;
      trialInicio = ag.trial_inicio;
      trialAtendimentos = ag.trial_atendimentos ?? 0;
      promptOk = !!ag.prompt_customizado && ag.prompt_customizado.trim().length > 0;
      conexaoOk = !!ag.provider && ag.provider !== 'demo';

      const inicio = ag.trial_inicio ? new Date(ag.trial_inicio).getTime() : Date.now();
      const dias = (Date.now() - inicio) / (24 * 60 * 60 * 1000);
      mostrarInicio = statusConta === 'trial' || dias <= 7;
    }
    entregadoresOk = (entCount ?? 0) >= 1;

    const testeOk = trialAtendimentos >= 1;
    passosCompletos = [
      true,
      promptOk,
      entregadoresOk,
      conexaoOk,
      testeOk,
    ].filter(Boolean).length;
  }

  const mostrarBadgeConfigure = trialAtendimentos === 0 && passosCompletos < 3;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <Logo variant="row" size={36} />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {mostrarInicio && (
            <NavLink
              href="/dashboard/inicio"
              icon={<Rocket size={18} />}
              label="Início"
              badge={mostrarBadgeConfigure ? 'Configure agora' : undefined}
            />
          )}
          <NavLink href="/dashboard" icon={<Home size={18} />} label="Pedidos" />
          <NavLink href="/dashboard/clientes" icon={<UserCircle size={18} />} label="Clientes" />
          <NavLink href="/dashboard/entregadores" icon={<Users size={18} />} label="Entregadores" />
          <NavLink href="/dashboard/conexao" icon={<Plug size={18} />} label="Conexão" />
          <NavLink href="/dashboard/configuracoes" icon={<Settings size={18} />} label="Configurações" />
        </nav>

        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
          className="p-3 border-t border-gray-200"
        >
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </form>
      </aside>

      <div className="flex-1 flex flex-col">
        <TrialBanner
          statusConta={statusConta}
          trialInicio={trialInicio}
          trialAtendimentos={trialAtendimentos}
        />
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Painel SutoGas</h2>
          <span className="text-sm text-gray-600">👤 {userName}</span>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-[10px] uppercase tracking-wide bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full font-semibold">
          {badge}
        </span>
      )}
    </Link>
  );
}
