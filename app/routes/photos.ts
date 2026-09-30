import { Request, Response, sql } from "@elements/app";

interface PhotoBytes {
  hash: string;
  contentType: string;
  data: Buffer;
}

// Types we are willing to render on our own origin. Anything else goes out
// as an opaque download rather than letting the browser decide what it is.
const INLINE = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

const YEAR = 31536000;

export default function servePhoto(req: Request, res: Response) {
  let photo = sql<PhotoBytes>(
    `select hash, contentType, data from listingPhotos where id::text = ${req.params.id}`,
  ).firstOrThrow("photo not found");

  // The hash names the bytes. A stale one is a request for bytes that no
  // longer exist, so a cache must not store today's bytes under it.
  if (req.params.hash !== photo.hash) {
    res.status(404);
    return res.end();
  }

  if (INLINE.has(photo.contentType)) {
    res.setHeader("Content-Type", photo.contentType);
  } else {
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment");
  }

  res.setHeader("Cache-Control", `public, max-age=${YEAR}, immutable`);

  return photo.data;
}
