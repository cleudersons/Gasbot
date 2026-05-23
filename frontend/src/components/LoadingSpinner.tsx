export default function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-block border-2 border-current border-r-transparent rounded-full animate-spin"
      style={{ width: size, height: size }}
      aria-label="carregando"
    />
  );
}
