'use client';

export default function TermoFundador() {
  return (
    <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
      <section>
        <h4 className="font-semibold text-gray-900 mb-1">1. O Programa</h4>
        <p>
          O <strong>Programa Premium Fundador</strong> é uma iniciativa do SutoGas
          para selecionar até 50 (cinquenta) depósitos parceiros que ajudarão a
          construir o produto junto com a nossa equipe. As vagas são limitadas e
          preenchidas por ordem de adesão.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 mb-1">2. Benefícios</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>50% de desconto</strong> sobre o valor do plano escolhido
            (Básico ou Pro), por <strong>12 meses consecutivos</strong>, contados
            a partir da data do primeiro pagamento.
          </li>
          <li>
            <strong>Suporte prioritário</strong> via WhatsApp com tempo de
            resposta reduzido.
          </li>
          <li>
            Acesso antecipado a novos recursos e influência direta no roadmap do
            produto.
          </li>
        </ul>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 mb-1">3. Seus compromissos</h4>
        <p className="mb-2">
          Para fazer parte do programa, você concorda em cumprir os 3
          compromissos abaixo durante a vigência do desconto:
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>
            <strong>Dar feedback</strong> sobre o uso da plataforma sempre que
            solicitado pela equipe SutoGas (pesquisas, formulários e mensagens
            no WhatsApp), respondendo em até 7 dias.
          </li>
          <li>
            <strong>Gravar um vídeo curto de depoimento</strong> (até 2 minutos)
            sobre sua experiência com o SutoGas, em até 60 dias após a entrada
            no programa, autorizando o uso desse material em ações de marketing.
          </li>
          <li>
            <strong>Indicar 2 (duas) pessoas</strong> que conhece e que poderiam
            se beneficiar do SutoGas, informando nome e WhatsApp delas no
            formulário enviado dentro do painel, em até 30 dias após a entrada.
          </li>
        </ol>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 mb-1">4. Perda do benefício</h4>
        <p>
          O descumprimento de qualquer dos compromissos acima, após
          notificação por escrito e prazo de 15 dias para regularização, dá ao
          SutoGas o direito de encerrar o desconto e retornar o plano ao valor
          cheio. O acesso ao serviço continua, apenas o desconto deixa de ser
          aplicado.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 mb-1">5. Cancelamento e reembolso</h4>
        <p>
          Você pode cancelar a assinatura a qualquer momento, seguindo o fluxo
          padrão da plataforma de pagamentos. Reembolsos seguem a política do
          plano contratado. O cancelamento encerra automaticamente sua
          participação no programa.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 mb-1">6. Privacidade</h4>
        <p>
          Os dados das pessoas indicadas serão utilizados <strong>apenas</strong>{' '}
          para contato comercial pelo SutoGas, em conformidade com a LGPD. Você
          declara ter consentimento dos indicados para fornecer esses dados.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-900 mb-1">7. Vigência</h4>
        <p>
          O desconto tem duração de 12 meses contados do primeiro pagamento
          confirmado. Após esse período, o plano segue automaticamente no valor
          cheio, mantida a recorrência mensal.
        </p>
      </section>
    </div>
  );
}
