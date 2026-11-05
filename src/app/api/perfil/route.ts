import { logada } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { nomeDoPerfil } from "@/lib/nome";

export const runtime = "nodejs";

// O primeiro login vira perfil. Nome e e-mail vêm do token conferido, não do navegador.
export async function POST(req: Request) {
  const auth = await logada(req, "perfil", "Faça login.");
  if (auth instanceof Response) return auth;
  const { user } = auth;
  await db()`
    insert into public.profiles (id, email, nome)
    values (${user.id}, ${user.email ?? null}, ${nomeDoPerfil(user.user_metadata)})
    on conflict (id) do nothing`;
  return new Response(null, { status: 204 });
}
