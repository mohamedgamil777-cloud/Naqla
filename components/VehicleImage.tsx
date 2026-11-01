import Image from "next/image";

/** Renders a vehicle image that may be a local SVG, a remote URL, or an uploaded
 *  data: URL. next/image can't parse data: URLs, so those fall back to <img>. */
export function VehicleImage({
  src,
  alt,
  sizes,
  priority,
}: {
  src: string | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src) return null;
  if (src.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" />;
  }
  return <Image src={src} alt={alt} fill className="object-cover" sizes={sizes} priority={priority} />;
}
