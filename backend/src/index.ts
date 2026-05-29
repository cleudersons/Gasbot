import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { getSupabase } from './lib/supabase';
import { buscarHistorico, salvarHistorico, Message } from './services/conversas.service';
import { generateReply } from './services/ai.service';
import {
  salvarPedido,
  buscarPedidosPendentes,
  buscarPedidoPorPrefixo,
  buscarPedidosAtivosDoEntregador,
  buscarPedidoAtivoDoCliente,
  buscarUltimoPedidoEntregue,
  marcarContatoEntregador,
  atualizarStatus,
  contarPedidosUltimos30Dias,
  registrarRejeicao,
  Pedido,
} from './services/pedidos.service';
import { parsePedidoConfirmado, removerTokenPedido, resumoItens } from './services/pedido-parser';
import {
  buscarEntregadorPorWhatsapp,
  buscarEntregadoresAtivos,
} from './services/entregadores.service';
import * as whatsappService from './services/whatsapp/whatsapp.service';
import { getQRCode, getStatus } from './services/qrcode.service';
import { enviarRelatorio } from './services/relatorio.service';
import {
  resolverAgenciaFromMeta,
  resolverAgenciaFromZapi,
  avaliarTrial,
  incrementarAtendimentoTrial,
  Agencia,
} from './services/agencia-routing';
import { estaNoHorario, proximaAbertura, janelaHorarioStr } from './services/horario.service';
import {
  distribuirPedido,
  repassarAposRejeicao,
  notificarDonoSemEntregador,
} from './services/distribuicao.service';
import {
  buscarCliente,
  upsertCliente,
  montarContextoCliente,
} from './services/cliente.service';
import { TenantAIConfig } from './types/ai.types';
import checkoutRoute from './routes/checkout.route';

// inicia jobs (auto-start ao importar)
import './jobs/entrega.job';
import './jobs/relatorio.job';
import './jobs/agendamento.job';
import './jobs/lembrete.job';
import './jobs/fundador-feedback.job';
import './jobs/lembrete-inicio-expediente.job';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const aiConfig: TenantAIConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: null,
};

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(checkoutRoute);

// Meta webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/**
 * Núcleo do processamento de uma mensagem recebida — chamado pelos webhooks
 * (Meta e Z-API) depois que cada um já parseou o payload no seu formato.
 */
async function processarMensagemRecebida(
  agencia: Agencia,
  from: string,
  text: string,
): Promise<void> {
  try {
    const agenciaId = agencia.id;

    // Conta suspensa: ignorar
    if (agencia.status_conta === 'suspenso') {
      console.warn(`[webhook] Agência ${agenciaId} suspensa — mensagem ignorada`);
      return;
    }

    // Agente pausado pelo dono ou pelo master: ignorar silenciosamente
    if (agencia.agente_ativo === false) {
      console.warn(`[webhook] Agente PAUSADO para agência ${agenciaId} — mensagem ignorada`);
      return;
    }

    // Trial expirado: avisar cliente e parar
    const trial = avaliarTrial(agencia);
    if (trial.ativo && trial.expirado) {
      console.warn(`[webhook] Trial expirado para agência ${agenciaId}`);
      try {
        await whatsappService.sendMessage(
          agenciaId,
          from,
          '⏰ Seu período de teste encerrou!\n' +
            'Acesse https://sutogas.com.br para assinar e continuar atendendo seus clientes.',
        );
      } catch (e: any) {
        console.error('[webhook] falha ao avisar trial expirado:', e?.message ?? e);
      }
      return;
    }

    // É um entregador?
    const entregador = await buscarEntregadorPorWhatsapp(from);
    if (entregador) {
      console.log(`[webhook] Mensagem do entregador ${entregador.nome}: ${text}`);

      const comando = text.trim().toUpperCase();

      if (comando === 'PEDIDOS') {
        const pendentes = await buscarPedidosPendentes(entregador.agencia_id);
        const resposta = pendentes.length
          ? `📋 *Pedidos pendentes (${pendentes.length}):*\n\n` +
            pendentes
              .map((p, i) => {
                const idCurto = p.id.slice(0, 8);
                return (
                  `${i + 1}. ID: ${idCurto}\n` +
                  `   📦 ${p.produto} x${p.quantidade}\n` +
                  `   📍 ${p.endereco}\n` +
                  `   👉 Para aceitar: *aceito ${idCurto}*`
                );
              })
              .join('\n\n')
          : '✅ Nenhum pedido pendente no momento.';
        await whatsappService.sendMessage(entregador.agencia_id, from, resposta);
        return;
      }

      async function aplicarStatus(pedido: Pedido, cmd: 'aceito' | 'entregue') {
        try {
          await atualizarStatus(pedido.id, cmd, entregador!.id);
          const msg =
            cmd === 'aceito'
              ? `✅ Pedido aceito (${pedido.id.slice(0, 8)})! Boa entrega! 🛵`
              : `✅ Entrega confirmada (${pedido.id.slice(0, 8)})! Obrigado, ${entregador!.nome}! 🙌`;
          await whatsappService.sendMessage(entregador!.agencia_id, from, msg);
        } catch (err: any) {
          console.error(`[entregador] erro ao ${cmd}:`, err?.message ?? err);
          await whatsappService.sendMessage(
            entregador!.agencia_id,
            from,
            `⚠️ Não consegui ${cmd === 'aceito' ? 'aceitar' : 'confirmar'} esse pedido.`,
          );
        }
      }

      async function pedirEscolha(candidatos: Pedido[], cmd: 'aceito' | 'entregue') {
        const lista = candidatos
          .map((p, i) => `${i + 1}. ${p.id.slice(0, 8)} — ${p.produto} x${p.quantidade}, ${p.endereco}`)
          .join('\n');
        await whatsappService.sendMessage(
          entregador!.agencia_id,
          from,
          `Você tem ${candidatos.length} pedidos. Use *${cmd} {id curto}* para escolher:\n\n${lista}`,
        );
      }

      async function processarPorPrefixo(cmd: 'aceito' | 'entregue', prefixo: string) {
        const { pedido, ambiguo } = await buscarPedidoPorPrefixo(entregador!.agencia_id, prefixo);
        if (ambiguo) {
          await whatsappService.sendMessage(
            entregador!.agencia_id,
            from,
            '⚠️ Mais de um pedido bate com esse ID. Use mais caracteres (mínimo 8).',
          );
          return;
        }
        if (!pedido) {
          await whatsappService.sendMessage(
            entregador!.agencia_id,
            from,
            '⚠️ Não encontrei esse pedido. Verifique o ID.',
          );
          return;
        }
        await aplicarStatus(pedido, cmd);
      }

      async function processarRejeicao(pedido: Pedido) {
        try {
          const rejeitadoPor = await registrarRejeicao(pedido.id, entregador!.id);
          await whatsappService.sendMessage(
            entregador!.agencia_id,
            from,
            `👍 Ok, pedido ${pedido.id.slice(0, 8)} repassado para os outros entregadores.`,
          );

          // Buscar info da agência (modo + whatsapp_dono) pra decidir o próximo passo
          const { data: ag } = await getSupabase()
            .from('agencias')
            .select('id, distribuicao_modo, distribuicao_ultimo_entregador, whatsapp_dono')
            .eq('id', entregador!.agencia_id)
            .maybeSingle();

          if (!ag) return;

          const ativos = await buscarEntregadoresAtivos(ag.id);
          const todosRejeitaram = ativos.length > 0 && ativos.every((e) => rejeitadoPor.includes(e.id));

          if (todosRejeitaram) {
            await notificarDonoSemEntregador(ag, pedido);
          } else if (ag.distribuicao_modo === 'revezamento') {
            await repassarAposRejeicao(pedido, ag, rejeitadoPor);
          }
        } catch (err: any) {
          console.error('[entregador] erro ao rejeitar:', err?.message ?? err);
          await whatsappService.sendMessage(
            entregador!.agencia_id,
            from,
            '⚠️ Não consegui registrar a recusa. Tente novamente.',
          );
        }
      }

      async function processarRejeicaoPorPrefixo(prefixo: string) {
        const { pedido, ambiguo } = await buscarPedidoPorPrefixo(entregador!.agencia_id, prefixo);
        if (ambiguo) {
          await whatsappService.sendMessage(
            entregador!.agencia_id,
            from,
            '⚠️ Mais de um pedido bate com esse ID. Use mais caracteres (mínimo 8).',
          );
          return;
        }
        if (!pedido) {
          await whatsappService.sendMessage(
            entregador!.agencia_id,
            from,
            '⚠️ Não encontrei esse pedido. Verifique o ID.',
          );
          return;
        }
        await processarRejeicao(pedido);
      }

      // NÃO ACEITO {id?} — entregador recusa o pedido
      // IMPORTANTE: checar antes de ACEITO pra não dar match parcial.
      const isRejeicao =
        comando === 'NÃO ACEITO' ||
        comando === 'NAO ACEITO' ||
        comando.startsWith('NÃO ACEITO ') ||
        comando.startsWith('NAO ACEITO ');
      if (isRejeicao) {
        const semPrefixo = comando.replace(/^N[ÃA]O ACEITO\s*/, '').trim();
        if (semPrefixo) {
          await processarRejeicaoPorPrefixo(semPrefixo);
        } else {
          const pendentes = await buscarPedidosPendentes(entregador.agencia_id);
          // Filtra os que esse entregador ainda não rejeitou
          const naoRejeitados = pendentes.filter(
            (p) => !(p.rejeitado_por ?? []).includes(entregador!.id),
          );
          if (naoRejeitados.length === 0) {
            await whatsappService.sendMessage(
              entregador.agencia_id,
              from,
              '✅ Nenhum pedido pendente para recusar.',
            );
          } else if (naoRejeitados.length === 1) {
            await processarRejeicao(naoRejeitados[0]);
          } else {
            await pedirEscolha(naoRejeitados, 'aceito'); // reusa diálogo de escolha
          }
        }
        return;
      }

      // ACEITO {id?} — sem ID, pega o único pendente
      if (comando === 'ACEITO' || comando.startsWith('ACEITO ')) {
        const prefixo = comando === 'ACEITO' ? '' : text.trim().slice('ACEITO '.length).trim();
        if (prefixo) {
          await processarPorPrefixo('aceito', prefixo);
        } else {
          const pendentes = await buscarPedidosPendentes(entregador.agencia_id);
          if (pendentes.length === 0) {
            await whatsappService.sendMessage(
              entregador.agencia_id,
              from,
              '✅ Nenhum pedido pendente no momento.',
            );
          } else if (pendentes.length === 1) {
            await aplicarStatus(pendentes[0], 'aceito');
          } else {
            await pedirEscolha(pendentes, 'aceito');
          }
        }
        return;
      }

      // ENTREGUE {id?} — sem ID, pega o único aceito/em_entrega do entregador
      if (comando === 'ENTREGUE' || comando.startsWith('ENTREGUE ')) {
        const prefixo = comando === 'ENTREGUE' ? '' : text.trim().slice('ENTREGUE '.length).trim();
        if (prefixo) {
          await processarPorPrefixo('entregue', prefixo);
        } else {
          const ativos = await buscarPedidosAtivosDoEntregador(
            entregador.agencia_id,
            entregador.id,
          );
          if (ativos.length === 0) {
            await whatsappService.sendMessage(
              entregador.agencia_id,
              from,
              '⚠️ Você não tem nenhum pedido em andamento agora.',
            );
          } else if (ativos.length === 1) {
            await aplicarStatus(ativos[0], 'entregue');
          } else {
            await pedirEscolha(ativos, 'entregue');
          }
        }
        return;
      }

      const ajuda =
        `Olá ${entregador.nome}! 👋\n` +
        `Para ver pedidos pendentes: responda *pedidos*\n` +
        `Para aceitar: *aceito* (ou *aceito {id curto}* se tiver mais de um)\n` +
        `Para recusar: *não aceito* (ou *não aceito {id curto}*)\n` +
        `Para confirmar entrega: *entregue* (ou *entregue {id curto}* se tiver mais de um)`;
      await whatsappService.sendMessage(entregador.agencia_id, from, ajuda);
      return;
    }

    console.log(`[webhook] Mensagem de ${from} → agência ${agenciaId}: ${text}`);

    // (Contador de atendimentos virou contador de pedidos confirmados —
    //  incremento foi movido para o bloco PEDIDO_CONFIRMADO abaixo.)

    // Horário de atendimento — injeta marca no texto se fora do horário
    const dentroHorario = estaNoHorario(agencia as any);
    const marcas: string[] = [];
    if (!dentroHorario) {
      const janela = janelaHorarioStr(agencia as any);
      marcas.push(
        `[SISTEMA: fora do horário (${janela}). Pergunte se o cliente quer agendar para a abertura.]`,
      );
    }

    // Contexto do cliente (histórico de pedidos)
    const cliente = await buscarCliente(agenciaId, from);
    const contextoCliente = montarContextoCliente(cliente);
    if (contextoCliente) marcas.push(contextoCliente);

    // Pedido ativo desse cliente — memória persistente além dos 30 min de conversa
    const pedidoAtivo = await buscarPedidoAtivoDoCliente(agenciaId, from);
    if (pedidoAtivo) {
      const slaMin = agencia.sla_minutos ?? 60;
      const idadeMin = (Date.now() - new Date(pedidoAtivo.criado_em).getTime()) / 60000;
      const atrasado = idadeMin > slaMin;
      const cooldownMin = pedidoAtivo.ultimo_contato_entregador
        ? (Date.now() - new Date(pedidoAtivo.ultimo_contato_entregador).getTime()) / 60000
        : Infinity;
      const podeContatar = cooldownMin > 15;
      marcas.push(
        `[PEDIDO_ATIVO: id_curto=${pedidoAtivo.id.slice(0, 8)}, ` +
          `status=${pedidoAtivo.status}, ` +
          `produto=${pedidoAtivo.produto} x${pedidoAtivo.quantidade}, ` +
          `criado_ha_min=${Math.round(idadeMin)}, ` +
          `entregador=${pedidoAtivo.entregador_nome ?? 'aguardando'}, ` +
          `entregador_whatsapp=${pedidoAtivo.entregador_whatsapp ?? ''}, ` +
          `atrasado=${atrasado}, pode_contatar_entregador=${podeContatar}]`,
      );
    }

    // Último pedido ENTREGUE recente (janela 2h) — só injeta se não há pedido ativo,
    // assim o agente sabe que a entrega terminou e pode responder/abrir novo pedido.
    if (!pedidoAtivo) {
      const recente = await buscarUltimoPedidoEntregue(agenciaId, from, 120);
      if (recente) {
        marcas.push(
          `[PEDIDO_ENTREGUE_RECENTE: id_curto=${recente.id.slice(0, 8)}, ` +
            `produto=${recente.produto} x${recente.quantidade}, ` +
            `entregue_ha_min=${recente.entregue_ha_min}, ` +
            `entregador=${recente.entregador_nome ?? 'entregador'}]`,
        );
      }
    }

    const textoParaIA = marcas.length ? `${marcas.join('\n')}\n\n${text}` : text;

    const historico = await buscarHistorico(agenciaId, from);
    const reply = await generateReply(
      aiConfig,
      historico,
      textoParaIA,
      agencia.prompt_customizado,
    );

    const novoHistorico: Message[] = [
      ...historico,
      { role: 'user', content: text },
      { role: 'assistant', content: reply },
    ];
    await salvarHistorico(agenciaId, from, novoHistorico);

    // Detectar PEDIDO_CONFIRMADO (multi-item) — parser isolado em pedido-parser.ts
    let mensagemCliente = reply;
    const parsed = parsePedidoConfirmado(reply);
    let pedidoCriadoId: string | null = null;

    if (parsed) {
      // Enforcement do limite mensal do plano
      // Trial: usa trial_atendimentos (job avaliarTrial já bloqueia em 20)
      // Pago: conta pedidos não-cancelados nos últimos 30 dias vs agencia.limite_atendimentos
      let bloqueado = false;
      if (!trial.ativo && agencia.limite_atendimentos != null) {
        const usados = await contarPedidosUltimos30Dias(agenciaId);
        if (usados >= agencia.limite_atendimentos) {
          bloqueado = true;
          console.warn(
            `[limite] agencia=${agenciaId} atingiu ${usados}/${agencia.limite_atendimentos} pedidos no mês`,
          );
        }
      }

      if (bloqueado) {
        mensagemCliente =
          'Estamos com volume alto de pedidos no momento e meu sistema travou pra anotar mais. ' +
          'Pode tentar de novo em alguns minutos? 🙏';
      } else {
        const { produto: produtoResumo, quantidade: qtdResumo } = resumoItens(parsed.itens);
        const abertura = dentroHorario ? null : proximaAbertura(agencia as any);
        const pedido = await salvarPedido(
          agenciaId,
          from,
          produtoResumo,
          qtdResumo,
          parsed.endereco,
          {
            status: dentroHorario ? 'pendente' : 'agendado',
            agendadoPara: abertura ?? undefined,
            formaPagamento: parsed.formaPagamento,
            itens: parsed.itens,
            valorTotal: parsed.valorTotal,
          },
        );
        pedidoCriadoId = pedido.id;
        console.log(
          `[pedido] salvo: ${pedido.id} itens=${parsed.itens.length} total=${parsed.valorTotal ?? '-'} status=${dentroHorario ? 'pendente' : 'agendado'}`,
        );

        // Atualiza preferências do cliente com o item principal (primeiro da lista)
        try {
          await upsertCliente(agenciaId, from, parsed.itens[0].produto, parsed.endereco);
        } catch (e: any) {
          console.error('[cliente] upsert falhou:', e?.message ?? e);
        }

        // Trial: 1 PEDIDO_CONFIRMADO = 1 atendimento
        if (trial.ativo) {
          await incrementarAtendimentoTrial(agenciaId, trial.atendimentos);
        }

        if (dentroHorario) {
          await distribuirPedido(pedido, agencia as any);
        } else {
          console.log(`[pedido] aguardando abertura em ${abertura?.toISOString()}`);
        }

        mensagemCliente = removerTokenPedido(reply);

        if (!dentroHorario) {
          // Sobrescreve QUALQUER texto que a IA tenha colocado: ela tende a dizer
          // "entregador a caminho" mesmo agendado, confundindo o cliente.
          const tz = agencia.timezone ?? 'America/Sao_Paulo';
          const horaAbertura = abertura
            ? abertura.toLocaleString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: tz,
              })
            : '';
          mensagemCliente = horaAbertura
            ? `✅ Pedido agendado pra ${horaAbertura}! Te aviso quando o entregador estiver a caminho.`
            : '✅ Pedido agendado pra abertura! Te aviso quando o entregador sair.';
        } else if (!mensagemCliente) {
          mensagemCliente = '✅ Pedido confirmado! Já avisei o entregador. 🛵';
        }
      }
    }

    // Detectar NOME_CLIENTE:{primeiro_nome}
    const nomeMatch = reply.match(/NOME_CLIENTE:\s*([^\n]+)/i);
    if (nomeMatch) {
      const primeiroNome = nomeMatch[1].trim().split(/\s+/)[0];
      if (primeiroNome) {
        try {
          await upsertCliente(agenciaId, from, null, null, undefined, primeiroNome);
          console.log(`[cliente] nome salvo: ${primeiroNome}`);
        } catch (err: any) {
          console.error('[cliente] erro ao salvar nome:', err?.message ?? err);
        }
      }
      mensagemCliente = mensagemCliente.replace(/^NOME_CLIENTE:[^\n]*\n?/im, '').trim();
    }

    // Detectar CONTATAR_ENTREGADOR:{whatsapp_entregador}
    const contatoMatch = reply.match(/CONTATAR_ENTREGADOR:\s*(\d+)/);
    if (contatoMatch && pedidoAtivo && pedidoAtivo.entregador_id) {
      const whatsEnt = contatoMatch[1].trim();
      try {
        await whatsappService.sendMessage(
          agenciaId,
          whatsEnt,
          `⚠️ O cliente ${pedidoAtivo.cliente_whatsapp} está perguntando sobre o pedido #${pedidoAtivo.id.slice(0, 8)} (${pedidoAtivo.produto} x${pedidoAtivo.quantidade}). Qual o status atual?`,
        );
        await marcarContatoEntregador(pedidoAtivo.id);
        console.log(
          `[contato] entregador ${whatsEnt} notificado sobre pedido ${pedidoAtivo.id.slice(0, 8)}`,
        );
      } catch (err: any) {
        console.error('[contato] falha:', err?.response?.data ?? err?.message ?? err);
      }
      mensagemCliente = mensagemCliente.replace(/^CONTATAR_ENTREGADOR:[^\n]*\n?/m, '').trim();
    }

    // Detectar LEMBRETE_CONFIRMADO:{dias}  (formato flexível)
    const lembreteMatch = reply.match(/LEMBRETE_CONFIRMADO:?\s*(\d+)?/);
    if (lembreteMatch) {
      const dias = parseInt(lembreteMatch[1] ?? '30', 10) || 30;
      try {
        const enviarEm = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
        await getSupabase().from('lembretes').insert({
          agencia_id: agenciaId,
          cliente_whatsapp: from,
          pedido_id: pedidoCriadoId,
          enviar_em: enviarEm.toISOString(),
          dias_escolhidos: dias,
        });
        console.log(`[lembrete] agendado para ${dias} dias (${enviarEm.toISOString()})`);

        // Atualiza preferência de recarga do cliente
        await upsertCliente(agenciaId, from, null, null, dias);
      } catch (err: any) {
        console.error('[lembrete] falha ao inserir:', err?.message ?? err);
      }
      mensagemCliente = mensagemCliente.replace(/^LEMBRETE_CONFIRMADO[^\n]*\n?/m, '').trim();
    }

    if (mensagemCliente) {
      // Suporta múltiplas mensagens separadas por [NOVA_MENSAGEM] (ex.: enviar chave Pix sozinha)
      const partes = mensagemCliente
        .split(/\[NOVA_MENSAGEM\]/i)
        .map((p) => p.trim())
        .filter(Boolean);
      for (const parte of partes) {
        await whatsappService.sendMessage(agenciaId, from, parte);
      }
    }
    console.log(`[webhook] Resposta enviada para ${from}`);
  } catch (err: any) {
    console.error('[webhook] Erro:', err?.response?.data ?? err?.message ?? err);
  }
}

// Meta webhook receiver
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message) return;

    const from: string = message.from;
    const text: string | undefined =
      message.text?.body ?? message.button?.text ?? message.interactive?.button_reply?.title;
    if (!from || !text) return;
    if (from.endsWith('@g.us') || from.includes('-')) {
      console.log('[webhook meta] mensagem de grupo ignorada');
      return;
    }

    const phoneNumberIdRecebedor: string | undefined = value?.metadata?.phone_number_id;

    const agencia = await resolverAgenciaFromMeta(phoneNumberIdRecebedor, from);
    if (!agencia) {
      console.error(
        `[webhook] Nenhuma agência encontrada para phone_number_id=${phoneNumberIdRecebedor}`,
      );
      return;
    }

    await processarMensagemRecebida(agencia, from, text);
  } catch (err: any) {
    console.error('[webhook meta] erro no parser:', err?.message ?? err);
  }
});

// Z-API webhook receiver — POST /webhook/zapi
// Formato do payload Z-API (resumido):
//   { instanceId, phone, fromMe, type, text: { message }, ... }
// Configure no painel Z-API:
//   Webhook ao receber: https://<seu-host>/webhook/zapi
app.post('/webhook/zapi', async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body ?? {};
    if (body.fromMe === true) return; // ignora ecos de mensagens enviadas por nós
    if (body.isGroup === true || body.participantPhone) {
      console.log('[webhook zapi] mensagem de grupo ignorada');
      return;
    }

    const instanceId: string | undefined = body.instanceId;
    const from: string | undefined = body.phone;
    const text: string | undefined =
      body.text?.message ??
      body.buttonsResponseMessage?.message ??
      body.listResponseMessage?.message ??
      body.message;

    if (!from || !text) return;

    const agencia = await resolverAgenciaFromZapi(instanceId, from);
    if (!agencia) {
      console.error(
        `[webhook zapi] Nenhuma agência encontrada para instanceId=${instanceId}`,
      );
      return;
    }

    await processarMensagemRecebida(agencia, from, text);
  } catch (err: any) {
    console.error('[webhook zapi] erro no parser:', err?.message ?? err);
  }
});

// QR Code da agência (Z-API)
app.get('/api/agencias/:id/qrcode', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: agencia, error } = await getSupabase()
      .from('agencias')
      .select('zapi_instance_id, zapi_token, zapi_client_token')
      .eq('id', id)
      .single();

    if (error || !agencia) return res.status(404).json({ error: 'Agência não encontrada' });
    if (!agencia.zapi_instance_id || !agencia.zapi_token) {
      return res.status(400).json({ error: 'Agência sem credenciais Z-API' });
    }

    const [qrcode, status] = await Promise.all([
      getQRCode(agencia.zapi_instance_id, agencia.zapi_token, agencia.zapi_client_token),
      getStatus(agencia.zapi_instance_id, agencia.zapi_token, agencia.zapi_client_token),
    ]);

    res.json({ qrcode, status });
  } catch (err: any) {
    console.error('[qrcode]', err?.message ?? err);
    res.status(500).json({ error: 'Falha ao obter QR code' });
  }
});

// Enviar relatório (teste manual)
app.post('/api/agencias/:id/relatorio/teste', async (req, res) => {
  try {
    await enviarRelatorio(req.params.id);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[relatorio/teste]', err?.message ?? err);
    res.status(500).json({ error: err?.message ?? 'Erro interno' });
  }
});

// Configurar Z-API da agência
app.post('/api/agencias/:id/zapi', async (req, res) => {
  try {
    const { id } = req.params;
    const { instanceId, token, clientToken } = req.body ?? {};
    if (!instanceId || !token) {
      return res.status(400).json({ error: 'instanceId e token são obrigatórios' });
    }

    const update: Record<string, unknown> = {
      zapi_instance_id: instanceId,
      zapi_token: token,
      zapi_status: 'aguardando_qr',
    };
    if (clientToken !== undefined) {
      update.zapi_client_token = clientToken || null;
    }

    const { error } = await getSupabase()
      .from('agencias')
      .update(update)
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    whatsappService.invalidateAgenciaCache(id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? 'Erro interno' });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`SutoGas backend running on http://localhost:${PORT}`);
});
