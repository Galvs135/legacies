with target_conversations as (
  select id
  from public.whatsapp_conversations
  order by created_at asc
  limit 5
),
seed_payload as (
  select
    tc.id as conversation_id,
    v.content,
    v.sent_offset_minutes
  from target_conversations tc
  cross join (
    values
      ('Boa tarde, doutor. Quero entender melhor meus direitos nesse caso.', 120),
      ('Estou preocupado com os prazos. Existe risco de perder algum prazo?', 90),
      ('Recebi uma proposta, mas nao sei se vale a pena aceitar agora.', 60),
      ('Voce pode me explicar os proximos passos de forma simples?', 30)
  ) as v(content, sent_offset_minutes)
)
insert into public.whatsapp_messages (conversation_id, from_role, content, sent_at)
select
  sp.conversation_id,
  'cliente',
  sp.content,
  now() - make_interval(mins => sp.sent_offset_minutes)
from seed_payload sp
where not exists (
  select 1
  from public.whatsapp_messages wm
  where wm.conversation_id = sp.conversation_id
    and wm.from_role = 'cliente'
    and wm.content = sp.content
);
