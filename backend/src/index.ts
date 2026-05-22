import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { appendMessage, getHistory } from './services/conversationStore';
import { generateReply } from './services/ai.service';
import { sendWhatsAppText } from './services/metaSender';
import { TenantAIConfig } from './types/ai.types';

const aiConfig: TenantAIConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: null, // por enquanto usa chave do .env
};

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Meta webhook verification (GET)
app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.META_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[webhook] Verified by Meta');
    return res.status(200).send(challenge);
  }

  console.warn('[webhook] Verification failed');
  return res.sendStatus(403);
});

// Meta webhook receiver (POST)
app.post('/webhook', async (req: Request, res: Response) => {
  // Responde rápido para a Meta não retransmitir
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      console.log('[webhook] Sem mensagem no payload (provavelmente status update)');
      return;
    }

    const from: string = message.from;
    const text: string | undefined =
      message.text?.body ?? message.button?.text ?? message.interactive?.button_reply?.title;

    if (!from || !text) {
      console.log('[webhook] Mensagem sem texto suportado, ignorando');
      return;
    }

    console.log(`[webhook] Mensagem de ${from}: ${text}`);

    const history = getHistory(from);
    const reply = await generateReply(aiConfig, history, text);

    appendMessage(from, 'user', text);
    appendMessage(from, 'assistant', reply);

    if (reply.startsWith('PEDIDO_CONFIRMADO:')) {
      console.log(`[pedido] ${from} → ${reply}`);
    }

    await sendWhatsAppText(from, reply);
    console.log(`[webhook] Resposta enviada para ${from}`);
  } catch (err: any) {
    console.error('[webhook] Erro processando mensagem:', err?.response?.data ?? err?.message ?? err);
  }
});

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`GasBot backend running on http://localhost:${PORT}`);
});
