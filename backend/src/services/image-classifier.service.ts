import OpenAI from 'openai';
import axios from 'axios';

const GRAPH_VERSION = 'v25.0';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY ausente');
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

// Resolve URL pública da imagem a partir do media_id da Meta.
// Z-API já entrega imageUrl direto, então essa função é só para Meta.
export async function resolverImageUrlMeta(
  mediaId: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const res = await axios.get(
      `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 },
    );
    return (res.data?.url as string) ?? null;
  } catch (err: any) {
    console.error('[image] erro ao resolver media meta:', err?.message ?? err);
    return null;
  }
}

// Baixa a imagem da Meta como base64 (URL da Meta exige Authorization header
// pra acessar — não dá pra mandar direto pro OpenAI). Z-API tem URL pública.
export async function downloadImagemMetaComoBase64(
  imageUrl: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const res = await axios.get(imageUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
      timeout: 15000,
    });
    const mime = res.headers['content-type'] ?? 'image/jpeg';
    const base64 = Buffer.from(res.data).toString('base64');
    return `data:${mime};base64,${base64}`;
  } catch (err: any) {
    console.error('[image] erro ao baixar imagem meta:', err?.message ?? err);
    return null;
  }
}

// Classifica se uma imagem é comprovante de pagamento (PIX, transferência, etc).
// Aceita URL pública (Z-API) ou data URL base64 (Meta após download).
// Retorna true se é comprovante, false em qualquer outra coisa (foto aleatória,
// produto, gato, etc) ou em caso de erro (fail safe).
export async function classificarComprovante(imageInput: string): Promise<boolean> {
  try {
    const openai = getOpenAI();
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'A imagem é um COMPROVANTE de pagamento (PIX, transferência, recibo de cartão, boleto pago)? ' +
                'Responda SOMENTE com "sim" ou "nao", sem mais nenhuma palavra.',
            },
            { type: 'image_url', image_url: { url: imageInput } },
          ],
        },
      ],
      max_tokens: 5,
      temperature: 0,
    });
    const resposta = res.choices[0]?.message?.content?.trim().toLowerCase() ?? '';
    return resposta.startsWith('sim');
  } catch (err: any) {
    console.error('[image] erro ao classificar:', err?.message ?? err);
    return false;
  }
}
