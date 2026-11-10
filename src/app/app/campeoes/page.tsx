"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clapperboard, ExternalLink, Loader2, Plus, Trash2, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartaoTiktok } from "@/components/video-embed";
import { useAccess } from "@/hooks/use-access";
import { useAuth } from "@/hooks/use-auth";
import { useNichos, type Nicho } from "@/hooks/use-nichos";
import { api } from "@/lib/api-cliente";
import { urlDoTiktok } from "@/lib/video";

type Video = { id: string; url: string; titulo: string };

/** Só aparece para admin; quem bloqueia de verdade é admin() em POST/DELETE /api/campeoes. */
const NovoVideo = ({ nicho }: { nicho: Nicho }) => {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [titulo, setTitulo] = useState("");
  const salvar = useMutation({
    mutationFn: () => api("/api/campeoes", { method: "POST", body: { nicho: nicho.slug, url, titulo } }),
    onSuccess: () => {
      toast.success(`Vídeo adicionado em ${nicho.rotulo}.`);
      setUrl("");
      setTitulo("");
      void queryClient.invalidateQueries({ queryKey: ["campeoes", nicho.slug] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!urlDoTiktok(url)) return toast.error("Cole o link completo do vídeo: https://www.tiktok.com/@perfil/video/…");
    salvar.mutate();
  };
  return (
    <form onSubmit={enviar} className="flex flex-col gap-2 rounded-[22px] border border-dashed border-border p-3 sm:flex-row">
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Link do vídeo no TikTok"
        aria-label="Link do vídeo no TikTok"
        inputMode="url"
        className="h-10 min-w-0 flex-[2] rounded-full bg-card"
      />
      <Input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título (opcional)"
        aria-label="Título do vídeo"
        maxLength={120}
        className="h-10 min-w-0 flex-1 rounded-full bg-card"
      />
      <Button type="submit" disabled={salvar.isPending || !url.trim()}>
        {salvar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Adicionar em {nicho.rotulo}
      </Button>
    </form>
  );
};

const Remover = ({ video, nicho }: { video: Video; nicho: string }) => {
  const queryClient = useQueryClient();
  const remover = useMutation({
    mutationFn: () => api(`/api/campeoes?id=${video.id}`, { method: "DELETE" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["campeoes", nicho] }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button variant="ghost" size="sm" onClick={() => remover.mutate()} disabled={remover.isPending}>
      {remover.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Remover
    </Button>
  );
};

/** Só admin: cria uma aba. Quem bloqueia de verdade é admin() em POST /api/nichos. */
const NovaAba = ({ criada }: { criada: (slug: string) => void }) => {
  const queryClient = useQueryClient();
  const [aberta, setAberta] = useState(false);
  const [rotulo, setRotulo] = useState("");
  const criar = useMutation({
    mutationFn: () => api<{ nicho: Nicho }>("/api/nichos", { method: "POST", body: { rotulo } }),
    // POST responde 201 sem corpo para o api(): busca a lista de novo e abre a aba pelo nome.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nichos"] });
      const nova = queryClient.getQueryData<Nicho[]>(["nichos"])?.find((n) => n.rotulo === rotulo.trim());
      if (nova) criada(nova.slug);
      toast.success(`Aba “${rotulo.trim()}” criada.`);
      setRotulo("");
      setAberta(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!aberta)
    return (
      <button type="button" onClick={() => setAberta(true)} className="chip border-dashed">
        <Plus className="h-3.5 w-3.5" /> Nova aba
      </button>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rotulo.trim()) criar.mutate();
      }}
      className="flex items-center gap-1.5"
    >
      <Input
        autoFocus
        value={rotulo}
        onChange={(e) => setRotulo(e.target.value)}
        placeholder="Nome da aba"
        aria-label="Nome da aba nova"
        maxLength={40}
        className="h-9 w-44 rounded-full bg-card"
      />
      <Button type="submit" size="sm" disabled={criar.isPending || !rotulo.trim()} aria-label="Criar aba">
        {criar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setAberta(false)} aria-label="Cancelar">
        <X className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
};

/** Só admin, só com a aba vazia (o servidor recusa apagar aba com vídeo). */
const ApagarAba = ({ nicho, apagada }: { nicho: Nicho; apagada: () => void }) => {
  const queryClient = useQueryClient();
  const apagar = useMutation({
    mutationFn: () => api(`/api/nichos?slug=${nicho.slug}`, { method: "DELETE" }),
    onSuccess: () => {
      apagada();
      void queryClient.invalidateQueries({ queryKey: ["nichos"] });
      toast.success(`Aba “${nicho.rotulo}” apagada.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button variant="ghost" size="sm" onClick={() => apagar.mutate()} disabled={apagar.isPending} className="mt-4">
      {apagar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Apagar a aba “{nicho.rotulo}”
    </Button>
  );
};

const Champioes = () => {
  const { user } = useAuth();
  const { isAdmin } = useAccess();
  const searchParams = useSearchParams();
  const pedido = searchParams.get("nicho");
  const { data: nichos = [], isLoading: carregandoAbas } = useNichos();
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const nicho =
    nichos.find((n) => n.slug === escolhida) ?? nichos.find((n) => n.slug === pedido) ?? nichos[0];
  const aba = nicho?.slug;
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["campeoes", aba],
    enabled: Boolean(user?.id && aba),
    staleTime: 60 * 60 * 1000,
    queryFn: async () => (await api<{ videos: Video[] }>(`/api/campeoes?nicho=${aba}`)).videos,
  });

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">
          <Clapperboard className="h-3 w-3" /> Inspiração
        </p>
        <h1 className="mt-2 font-display text-[40px] font-semibold leading-[1] tracking-[-0.035em] sm:text-[52px]">
          Vídeos <span className="accent-word text-gradient pr-1">campeões</span>
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Vídeos de produto que estão vendendo em cada nicho, escolhidos a dedo pela equipe. Assista, anote
          o gancho e o formato que funcionaram e adapte para o seu produto — modelar não é copiar.
        </p>
      </header>

      <div role="tablist" aria-label="Nichos" className="flex flex-wrap gap-2">
        {nichos.map((n) => (
          <button
            key={n.slug}
            type="button"
            role="tab"
            aria-selected={n.slug === aba}
            onClick={() => setEscolhida(n.slug)}
            data-ativo={n.slug === aba}
            className="chip"
          >
            {n.rotulo}
          </button>
        ))}
        {isAdmin && <NovaAba criada={setEscolhida} />}
      </div>

      {!nicho ? (
        carregandoAbas ? null : (
          <p className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-[14.5px] text-muted-foreground">
            {isAdmin ? "Crie a primeira aba em “Nova aba”." : "Logo entram os primeiros vídeos."}
          </p>
        )
      ) : (
        <section role="tabpanel" aria-label={nicho.rotulo} className="space-y-4">
          {isAdmin && <NovoVideo nicho={nicho} />}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="mx-auto aspect-[9/16] w-full max-w-[320px] animate-pulse rounded-2xl border border-border bg-secondary/40" />
              ))}
            </div>
          ) : videos.length ? (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((v) => (
                <CartaoTiktok key={v.id} url={v.url} titulo={v.titulo}>
                  {isAdmin && <Remover video={v} nicho={nicho.slug} />}
                </CartaoTiktok>
              ))}
            </ul>
          ) : (
            <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-soft text-rose">
                <Trophy className="h-5 w-5" />
              </span>
              <p className="mt-4 font-display text-2xl leading-snug">Ainda não tem vídeos de {nicho.rotulo.toLowerCase()}.</p>
              <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">
                {isAdmin ? "Cole o link de um vídeo do TikTok acima para começar." : "Logo entram novos. Enquanto isso, veja direto no TikTok."}
              </p>
              {isAdmin && <ApagarAba nicho={nicho} apagada={() => setEscolhida(null)} />}
            </div>
          )}
          <a
            href={`https://www.tiktok.com/search?q=${encodeURIComponent(`achadinhos ${nicho.rotulo}`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-foreground/80 hover:text-foreground"
          >
            Ver os mais recentes no TikTok
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>
      )}
    </div>
  );
};

const Page = () => (
  <Suspense fallback={null}>
    <Champioes />
  </Suspense>
);

export default Page;
