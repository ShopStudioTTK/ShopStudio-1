import { autenticar, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_VIDEOS, caminhoNoBucket, validadeDaUrlAssinada } from "@/lib/video";

export const runtime = "nodejs";

/**
 * Vídeos de um capítulo (?capitulo=<slug>). Os Campeões têm tabela e rota próprias (/api/campeoes).
 * Arquivo do bucket (privado) sai com URL assinada; a validade vem de VIDEO_URL_VALIDADE_SEGUNDOS.
 * Dentro desse prazo a URL pode ser repassada: prazo menor = menos tempo de link vazado.
 */
export async function GET(req: Request) {
  const auth = await autenticar(req, "videos", "Faça login.");
  if (auth instanceof Response) return auth;

  const params = new URL(req.url).searchParams;
  const capitulo = params.get("capitulo");
  if (!capitulo) return erro("Pedido inválido.", 400);
  const linhas = await db()`select id, chapter_slug, titulo, descricao, url, ordem, updated_at from public.chapter_videos where chapter_slug = ${capitulo} order by ordem, updated_at`;

  const caminhos = linhas.map((v) => caminhoNoBucket(v.url)).filter((c): c is string => c !== null);
  let assinadas = new Map<string, string>();
  if (caminhos.length) {
    const validade = validadeDaUrlAssinada(process.env.VIDEO_URL_VALIDADE_SEGUNDOS);
    const { data, error } = await createAdminClient().storage.from(BUCKET_VIDEOS).createSignedUrls(caminhos, validade);
    if (error) throw error;
    assinadas = new Map(data.map((d) => [d.path ?? "", d.signedUrl ?? ""]));
  }
  const videos = linhas
    .map((v) => {
      const caminho = caminhoNoBucket(v.url);
      return caminho ? { ...v, url: assinadas.get(caminho) ?? "" } : v;
    })
    .filter((v) => v.url);
  return Response.json({ videos }, { headers: { "Cache-Control": "private, no-store" } });
}
