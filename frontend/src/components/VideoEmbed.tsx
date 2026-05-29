interface Props {
  youtubeId: string;
  titulo: string;
}

export default function VideoEmbed({ youtubeId, titulo }: Props) {
  return (
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      <iframe
        className="absolute inset-0 w-full h-full rounded-xl border border-gray-200"
        src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
        title={titulo}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
