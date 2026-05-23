import Link from 'next/link';

export default function MetaApiTutorialPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <Link href="/dashboard/conexao" className="text-sm text-blue-600 hover:underline">
          &larr; Voltar para Conexão
        </Link>

        <h1 className="text-2xl font-bold">Como obter Phone Number ID e Token (Meta)</h1>

        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Acesse <a className="text-blue-600 hover:underline" href="https://developers.facebook.com" target="_blank" rel="noreferrer">developers.facebook.com</a> e abra seu app de WhatsApp.</li>
          <li>Em <strong>WhatsApp &rarr; API Setup</strong>, copie o <strong>Phone Number ID</strong> do número que você conectou.</li>
          <li>Gere um <strong>token de acesso permanente</strong> em <strong>Business Settings &rarr; System Users</strong>, dando permissão de <code>whatsapp_business_messaging</code>.</li>
          <li>Cole os dois valores na tela de Conexão e clique em <strong>Conectar</strong>.</li>
        </ol>

        <p className="text-xs text-gray-500">
          O token de acesso pode ser revogado a qualquer momento pelo Business Manager da Meta.
        </p>
      </div>
    </main>
  );
}
