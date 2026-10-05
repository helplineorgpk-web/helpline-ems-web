function isLocalMongo(url?: string) {
  if (!url) return true;
  return /127\.0\.0\.1|localhost/.test(url);
}

export function getDatabaseUrl() {
  const atlas = process.env.ATLAS_DATABASE_URL?.trim();
  const url = process.env.DATABASE_URL?.trim();
  const hosted = Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";

  if (hosted) {
    if (atlas) return atlas;
    if (url && !isLocalMongo(url)) return url;
    if (url && isLocalMongo(url)) {
      throw new Error("Production DATABASE_URL points to localhost. Set Atlas DATABASE_URL on Vercel.");
    }
    throw new Error("DATABASE_URL is not set");
  }

  return url || atlas || "";
}

export function hasJwtSecret() {
  return Boolean(process.env.JWT_SECRET?.trim());
}
