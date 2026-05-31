import { auth, signOut } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Home,
  Users,
  Settings,
  LogOut,
  Plug,
  UserCircle,
  Rocket,
  CreditCard,
  User,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import TrialBanner from '@/components/TrialBanner';
import Logo from '@/components/Logo';
import HeaderActions from '@/components/HeaderActions';
import { perfilCompleto } from '@/lib/perfil';

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
  let ehFundador = false;
  let perfilOk = true;
  let suporteNaoLidas = 0;

  if (agenciaId) {
    const db = supabaseAdmin();
    const [{ data: ag }, { count: entCount }] = await Promise.all([
      db
        .from('agencias')
        .select(
          'status_conta, trial_inicio, trial_atendimentos, prompt_customizado, provider, criado_em, programa_fundador, nome_deposito, cidade, estado, cpf_cnpj',
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
      ehFundador = !!ag.programa_fundador;
      perfilOk = perfilCompleto(ag);

      const inicio = ag.trial_inicio ? new Date(ag.trial_inicio).getTime() : Date.now();
      const dias = (Date.now() - inicio) / (24 * 60 * 60 * 1000);
      mostrarInicio = statusConta === 'trial' || dias <= 7;
    }
    entregadoresOk = (entCount ?? 0) >= 1;

    // Conta respostas de suporte não-lidas pra badge no menu
    const { data: ticketsAg } = await db
      .from('tickets')
      .select('id')
      .eq('agencia_id', agenciaId);
    const ticketIds = (ticketsAg ?? []).map((t) => t.id);
    if (ticketIds.length > 0) {
      const { count } = await db
        .from('ticket_mensagens')
        .select('id', { count: 'exact', head: true })
        .in('ticket_id', ticketIds)
        .eq('autor', 'admin')
        .eq('lida', false);
      suporteNaoLidas = count ?? 0;
    }

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
          <NavLink href="/dashboard/planos" icon={<CreditCard size={18} />} label="Planos" />
          <NavLink href="/dashboard/minha-conta" icon={<User size={18} />} label="Minha conta" />
          <NavLink
            href="/dashboard/suporte"
            icon={<MessageCircle size={18} />}
            label="Suporte"
            badge={suporteNaoLidas > 0 ? String(suporteNaoLidas) : undefined}
          />
          <NavLink href="/dashboard/configuracoes" icon={<Settings size={18} />} label="Configurações" />
        </nav>

        <form
          action={async () => {
            'use server';
            await signOut({ redirect: false });
            redirect('https://sutogas.com.br/login');
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
        {!perfilOk && (
          <Link
            href="/dashboard/minha-conta"
            className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between gap-3 hover:bg-amber-100 transition"
          >
            <div className="flex items-center gap-2 text-sm text-amber-900">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <span>
                <strong>Complete seu perfil</strong> — nome do depósito, cidade, estado e CPF/CNPJ.
              </span>
            </div>
            <span className="text-xs font-semibold text-amber-900 underline shrink-0">
              Completar agora
            </span>
          </Link>
        )}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Painel SutoGas</h2>
          <HeaderActions ehFundador={ehFundador} userName={userName} />
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
