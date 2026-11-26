/* تهشير الأرقام السرية (SHA-256) بـ Web Crypto. */
export async function sha256Hex(t) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
