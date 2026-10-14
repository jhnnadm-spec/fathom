/**
 * Photos of the company from its Wikipedia article (Wikimedia Commons, freely
 * licensed), laid out as one large photo and up to three small ones. Each photo
 * credits its author and licence, as the licences ask.
 */
import type { Photo } from "@/lib/profile/wiki";

export function PhotoMosaic({ photos, company }: { photos: Photo[]; company: string }) {
  const shown = photos.slice(0, 3);
  if (shown.length === 0) return null;
  const [main, ...rest] = shown;
  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className={`grid gap-2 ${rest.length > 0 ? "grid-cols-[2fr_1fr] grid-rows-2" : ""}`} style={{ aspectRatio: rest.length > 0 ? "16 / 10" : "16 / 9" }}>
        <Tile photo={main} company={company} className={rest.length > 0 ? "row-span-2" : ""} />
        {rest.map((p, i) => (
          <Tile key={p.src} photo={p} company={company} className={rest.length === 1 ? "row-span-2" : ""} index={i + 1} />
        ))}
      </div>
      <figcaption className="text-[12px] leading-snug text-muted">
        Photos from Wikimedia Commons:{" "}
        {shown.map((p, i) => (
          <span key={p.page}>
            {i > 0 && " · "}
            <a href={p.page} target="_blank" rel="noopener noreferrer" className="text-muted underline decoration-line underline-offset-2 hover:text-ocean">
              {p.credit}
              {p.license ? `, ${p.license}` : ""}
            </a>
          </span>
        ))}
        . Background only.
      </figcaption>
    </figure>
  );
}

function Tile({ photo, company, className = "", index = 0 }: { photo: Photo; company: string; className?: string; index?: number }) {
  return (
    <a
      href={photo.page}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block min-h-0 overflow-hidden rounded-2xl bg-panel-2 ${className}`}
      title={photo.caption ?? `Photo related to ${company}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={photo.caption ?? `Photo related to ${company}`}
        loading={index === 0 ? "eager" : "lazy"}
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
      />
      {photo.caption && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2.5 pt-8 text-[12px] leading-snug text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          {photo.caption}
        </span>
      )}
    </a>
  );
}
