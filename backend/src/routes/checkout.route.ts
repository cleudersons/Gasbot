import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getSupabase } from '../lib/supabase';
import { enviarEmailBoasVindasComSenha } from '../lib/email';

const router_ = Router();
// Endpoint TEMPORÁRIO de teste de SMTP. Remover depois que validar Item 0.
// Uso: curl -X POST -H "X-SutoGas-Secret: $SECRET" -H "Content-Type: application/json" \
//   -d '{"to":"cleudersons@gmail.com"}' https://sutogas-backend-production.up.railway.app/webhook/test-email
router_.post('/webhook/test-email', async (req: Request, res: Response) => {
  const secretEsperado = process.env.SUTOGAS_WEBHOOK_SECRET;
  if (!secretEsperado || req.header('X-SutoGas-Secret') !== secretEsperado) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const to = String(req.body?.to ?? '').trim().toLowerCase();
  if (!to) return res.status(400).json({ error: 'to obrigatório' });

  // Diagnóstico: expõe se as env vars estão definidas e captura erro de SMTP
  const env = {
    SMTP_HOST: !!process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT ?? null,
    SMTP_USER: !!process.env.SMTP_USER,
    SMTP_PASSWORD: !!process.env.SMTP_PASSWORD,
    SMTP_FROM: !!process.env.SMTP_FROM,
    APP_URL: !!process.env.APP_URL,
  };

  const envResend = {
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    SMTP_FROM: !!process.env.SMTP_FROM,
    APP_URL: !!process.env.APP_URL,
  };

  try {
    const ok = await enviarEmailBoasVindasComSenha({ to, senhaTemporaria: 'teste-1234' });
    return res.json({ ok, to, env: envResend });
  } catch (err: any) {
    return res.json({ ok: false, to, env: envResend, erro: err?.message ?? String(err) });
  }
});

// Mapeamento oferta → plano vem da tabela `planos` no Supabase.
// Cadastrado pelo Painel Master em /master/planos.

const router = Router();

/**
 * POST /webhook/checkout
 * Recebido pela Sutofly após confirmação de pagamento no Asaas.
 *
 * Header obrigatório: X-SutoGas-Secret
 * Payload:
 *   {
 *     evento: 'pagamento_confirmado',
 *     email, agencia_id?, oferta,
 *     valor, recorrente, proxima_cobranca?, asaas_id
 *   }
 */
router.post('/webhook/checkout', async (req: Request, res: Response) => {
  try {
    const secretEsperado = process.env.SUTOGAS_WEBHOOK_SECRET;
    if (!secretEsperado) {
      console.error('[webhook/checkout] SUTOGAS_WEBHOOK_SECRET não configurado');
      return res.status(500).json({ error: 'Servidor mal configurado' });
    }
    const secretRecebido = req.header('X-SutoGas-Secret');
    if (secretRecebido !== secretEsperado) {
      console.warn('[webhook/checkout] secret inválido');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body ?? {};
    const evento: string = body.evento;
    const email: string | undefined = body.email?.toString().trim().toLowerCase();
    const agenciaIdRecebida: string | undefined = body.agencia_id;
    const oferta: string | undefined = body.oferta;
    const valor: number | null = body.valor != null ? Number(body.valor) : null;
    const recorrente: boolean = body.recorrente === true;
    const proximaCobranca: string | null = body.proxima_cobranca ?? null;
    const asaasId: string | null = body.asaas_id ?? null;

    if (evento !== 'pagamento_confirmado') {
      return res.status(400).json({ error: `Evento não suportado: ${evento}` });
    }
    if (!oferta) {
      return res.status(400).json({ error: 'oferta obrigatória' });
    }
    if (!email && !agenciaIdRecebida) {
      return res.status(400).json({ error: 'email ou agencia_id obrigatório' });
    }

    const db = getSupabase();

    // Lookup do plano pela tabela `planos` (cadastro dinâmico via /master/planos)
    const { data: planoCfg, error: errPlano } = await db
      .from('planos')
      .select('categoria, limite_atendimentos, duracao_dias, fundador')
      .eq('slug', oferta)
      .eq('ativo', true)
      .maybeSingle();

    if (errPlano) {
      console.error('[webhook/checkout] erro ao buscar plano:', errPlano);
      return res.status(500).json({ error: 'Erro ao buscar plano' });
    }
    if (!planoCfg) {
      return res.status(400).json({ error: `Plano não cadastrado: ${oferta}` });
    }
    const mapping = {
      plano: planoCfg.categoria as 'basico' | 'pro',
      limite: planoCfg.limite_atendimentos as number | null,
      duracaoDias: planoCfg.duracao_dias as number,
      fundador: !!planoCfg.fundador,
    };

    // Localiza a agência — por id se vier, senão pelo email do usuário
    let agenciaId = agenciaIdRecebida ?? null;
    let criadaAgora = false;
    let senhaTemp: string | null = null;

    if (!agenciaId && email) {
      const { data: usuario } = await db
        .from('usuarios')
        .select('agencia_id')
        .eq('email', email)
        .maybeSingle();
      if (usuario?.agencia_id) {
        agenciaId = usuario.agencia_id;
      } else {
        // Compra por link externo, sem conta prévia → criar agência + usuário (seção 11)
        senhaTemp = Math.random().toString(36).slice(-10);
        const { data: novaAg, error: errAg } = await db
          .from('agencias')
          .insert({
            nome: `Depósito de ${email}`,
            plano: mapping.plano,
            status_conta: 'ativo',
            provider: 'demo',
          })
          .select('id')
          .single();
        if (errAg || !novaAg) {
          console.error('[webhook/checkout] erro ao criar agência:', errAg);
          return res.status(500).json({ error: errAg?.message ?? 'Erro ao criar agência' });
        }
        agenciaId = novaAg.id;
        const { error: errUser } = await db.from('usuarios').insert({
          email,
          senha_hash: bcrypt.hashSync(senhaTemp, 10),
          nome: email.split('@')[0],
          agencia_id: agenciaId,
          is_master: false,
          ativo: true,
        });
        if (errUser) {
          await db.from('agencias').delete().eq('id', agenciaId);
          console.error('[webhook/checkout] erro ao criar usuário:', errUser);
          return res.status(500).json({ error: errUser.message });
        }
        criadaAgora = true;
      }
    }

    if (!agenciaId) {
      return res.status(404).json({ error: 'Agência não encontrada' });
    }

    // Atualiza a agência com plano, vencimento e dados de pagamento
    const agora = new Date();
    const vencimento = new Date(agora.getTime() + mapping.duracaoDias * 24 * 60 * 60 * 1000);
    const updatePayload: Record<string, unknown> = {
      plano: mapping.plano,
      plano_slug: oferta,
      status_conta: 'ativo',
      limite_atendimentos: mapping.limite,
      vencimento_plano: vencimento.toISOString(),
      ultimo_pagamento_valor: valor,
      ultimo_pagamento_asaas: asaasId,
      recorrencia_ativa: recorrente,
      proxima_cobranca: proximaCobranca,
    };
    if (mapping.fundador) {
      const ate = new Date(agora);
      ate.setMonth(ate.getMonth() + 12);
      updatePayload.programa_fundador = true;
      updatePayload.fundador_desconto_ate = ate.toISOString();
    }

    const { error: errUp } = await db
      .from('agencias')
      .update(updatePayload)
      .eq('id', agenciaId);

    if (errUp) {
      console.error('[webhook/checkout] erro ao atualizar agência:', errUp);
      return res.status(500).json({ error: errUp.message });
    }

    // Contador de vagas do programa fundador
    if (mapping.fundador) {
      try {
        const { data: cfg } = await db
          .from('programa_fundador_config')
          .select('id, vagas_usadas')
          .eq('ativo', true)
          .maybeSingle();
        if (cfg) {
          await db
            .from('programa_fundador_config')
            .update({ vagas_usadas: (cfg.vagas_usadas ?? 0) + 1, updated_at: new Date().toISOString() })
            .eq('id', cfg.id);
        }
      } catch (e: any) {
        console.error('[webhook/checkout] falha ao incrementar vagas fundador:', e?.message ?? e);
      }
    }

    console.log(
      `[webhook/checkout] OK agencia=${agenciaId} plano=${mapping.plano} fundador=${mapping.fundador} criada=${criadaAgora}`,
    );

    // Item 0 do roadmap: cliente que paga via link externo precisa receber a senha por email
    if (criadaAgora && senhaTemp && email) {
      enviarEmailBoasVindasComSenha({ to: email, senhaTemporaria: senhaTemp }).catch((err) => {
        console.error('[webhook/checkout] falha ao enviar email de boas-vindas:', err?.message ?? err);
      });
    }

    return res.json({
      ok: true,
      agencia_id: agenciaId,
      criada_agora: criadaAgora,
      senha_temporaria: senhaTemp, // só presente quando agência foi criada agora
    });
  } catch (err: any) {
    console.error('[webhook/checkout] erro:', err?.message ?? err);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// Une as duas rotas (checkout principal + endpoint temporário de teste)
router.use(router_);

export default router;
