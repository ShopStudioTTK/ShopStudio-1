import { autenticar, erro } from "@/lib/api-auth";
import { NICHOS } from "@/content/nichos";
import { buscarCampeoes } from "@/lib/videos-tiktok";

export const runtime = "nodejs";

/** Vídeos campeões de um nicho (?nicho=<slug>), do cache geral de 1 dia ou buscados na hora. */
export async function GET(req: Request) {
  const auth = await autenticar(req, "campeoes", "Faça login.");
  if (auth instanceof Response) return auth;
  const nicho = new URL(req.url).searchParams.get("nicho");
  if (!NICHOS.some((n) => n.slug === nicho)) return erro("Nicho inválido.", 400);
  return Response.json({ videos: await buscarCampeoes(nicho!) });
}
