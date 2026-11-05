/**
 * Cabeçalhos de segurança de todas as páginas (aplicados no next.config.ts).
 *
 * A sessão do Supabase fica no localStorage, então um script injetado conseguiria lê-la.
 * A defesa principal é o `connect-src`: a página só conversa com o próprio app e com o Supabase,
 * então nem um script malicioso consegue mandar o token para outro servidor.
 *
 * ponytail: `script-src` precisa de 'unsafe-inline' porque o Next injeta scripts inline na
 * hidratação. Trocar por nonce exige proxy/middleware e renderização dinâmica; vale quando
 * o app tiver conteúdo de terceiros que justifique.
 */
export const cabecalhosDeSeguranca = (supabaseUrl: string, dev: boolean) => {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // imagens dos casos de sucesso vêm de qualquer https (o banco só aceita https)
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseUrl}${dev ? " ws:" : ""}`,
    `media-src 'self' ${supabaseUrl} https:`,
    "frame-src https://www.youtube.com https://player.vimeo.com https://www.tiktok.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  ];
};
