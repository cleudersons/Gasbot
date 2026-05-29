import { getSupabase } from '../lib/supabase';
import { enviarEmailFeedbackFundador } from '../lib/email';

// Roda a cada 1h. Pra cada agência fundadora que comprou há >= 2 dias
// e ainda não recebeu a notificação de feedback, cria a notificação,
// define o prazo de 15 dias e marca o envio. Também dispara email
// transacional via Resend com link pro feedback (público + logado).
const INTERVAL_MS = 60 * 60 * 1000;

const DIAS_APOS_COMPRA = 2;
const DIAS_PRAZO_FEEDBACK = 15;
const DURACAO_FUNDADOR_MESES = 12;

function randomToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function processar(): Promise<void> {
  const db = getSupabase();
  const agora = new Date();

  // Janela: a agência é fundadora E comprou >= 2 dias atrás.
  // Como `fundador_desconto_ate = compra + 12 meses`, derivamos:
  // `fundador_desconto_ate <= agora + (12 meses - 2 dias)`
  const limite = new Date(agora);
  limite.setMonth(limite.getMonth() + DURACAO_FUNDADOR_MESES);
  limite.setDate(limite.getDate() - DIAS_APOS_COMPRA);

  const { data: alvos, error } = await db
    .from('agencias')
    .select('id, fundador_feedback_token')
    .eq('programa_fundador', true)
    .is('fundador_notificacao_enviada_em', null)
    .not('fundador_desconto_ate', 'is', null)
    .lte('fundador_desconto_ate', limite.toISOString());

  if (error) {
    console.error('[job:fundador-feedback] erro ao buscar alvos:', error.message);
    return;
  }
  if (!alvos || alvos.length === 0) return;

  const prazo = new Date(agora.getTime() + DIAS_PRAZO_FEEDBACK * 24 * 60 * 60 * 1000);
  const expira = new Date(prazo.getTime() + 30 * 24 * 60 * 60 * 1000); // sininho some 30d após o prazo

  for (const ag of alvos) {
    try {
      // Garante token (caso a agência tenha sido criada antes da migration 017)
      let token = ag.fundador_feedback_token as string | null;
      if (!token) {
        token = randomToken();
        await db.from('agencias').update({ fundador_feedback_token: token }).eq('id', ag.id);
      }

      await db.from('notificacoes').insert({
        agencia_id: ag.id,
        tipo: 'feedback_fundador',
        categoria: 'feedback_fundador',
        titulo: '👑 Programa Premium Fundador',
        mensagem:
          'Você tem 15 dias pra responder a pesquisa, indicar 2 contatos e enviar seu vídeo de depoimento.',
        link: '/dashboard/feedback-fundador',
        expira_em: expira.toISOString(),
      });

      await db
        .from('agencias')
        .update({
          fundador_notificacao_enviada_em: agora.toISOString(),
          fundador_feedback_prazo: prazo.toISOString(),
        })
        .eq('id', ag.id);

      // Email transacional pro dono (lookup do usuário pela agencia_id).
      try {
        const { data: usuario } = await db
          .from('usuarios')
          .select('email')
          .eq('agencia_id', ag.id)
          .eq('is_master', false)
          .eq('ativo', true)
          .limit(1)
          .maybeSingle();

        if (usuario?.email && token) {
          enviarEmailFeedbackFundador({ to: usuario.email, token }).catch((err) => {
            console.error('[job:fundador-feedback] falha email:', err?.message ?? err);
          });
        }
      } catch (err: any) {
        console.error('[job:fundador-feedback] erro ao buscar usuario para email:', err?.message ?? err);
      }

      console.log(`[job:fundador-feedback] notificação criada para agência ${ag.id}`);
    } catch (err: any) {
      console.error(`[job:fundador-feedback] falha em ${ag.id}:`, err?.message ?? err);
    }
  }
}

// Roda 1x na subida + a cada hora
processar().catch((e) => console.error('[job:fundador-feedback] erro inicial:', e));
setInterval(() => {
  processar().catch((e) => console.error('[job:fundador-feedback] erro:', e));
}, INTERVAL_MS);
