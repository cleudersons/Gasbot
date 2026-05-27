// Skeleton genérico para loading.tsx das rotas. Sem dependências externas.
// Aparece automaticamente enquanto o Server Component da página resolve.

export default function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded" />
      <div className="h-4 w-72 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
        <div className="h-24 bg-gray-100 border border-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-100 border border-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-100 border border-gray-200 rounded-xl" />
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 mt-4">
        <div className="h-5 w-40 bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-5/6 bg-gray-100 rounded" />
        <div className="h-4 w-4/6 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
