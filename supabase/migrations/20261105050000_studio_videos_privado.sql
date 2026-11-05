-- Vídeos do bucket são conteúdo pago: o bucket deixa de ser público.
-- Antes, qualquer pessoa sem login abria o arquivo pela URL e listava o bucket inteiro pela API.
-- Agora o arquivo só abre por URL assinada (expira), e só quem está logada consegue gerar uma.
update storage.buckets set public = false where id = 'studio-videos';

drop policy if exists "studio_videos_public_read" on storage.objects;

create policy "studio_videos_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'studio-videos');
