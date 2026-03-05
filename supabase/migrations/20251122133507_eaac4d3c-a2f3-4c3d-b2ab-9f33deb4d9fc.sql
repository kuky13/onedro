-- Limpar mensagens duplicadas ou muito antigas (manter últimas 50 por conversa)
WITH ranked_messages AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY user_id, conversation_id ORDER BY created_at DESC) as rn
  FROM chat_messages
)
DELETE FROM chat_messages
WHERE id IN (
  SELECT id FROM ranked_messages WHERE rn > 50
);

-- Deletar registros duplicados com 'default' quando já existe 'drippy'
DELETE FROM chat_mood
WHERE conversation_id = 'default'
AND user_id IN (
  SELECT user_id 
  FROM chat_mood 
  WHERE conversation_id = 'drippy'
);

-- Atualizar conversation_id 'default' para 'drippy' (apenas os que sobraram)
UPDATE chat_messages 
SET conversation_id = 'drippy' 
WHERE conversation_id = 'default';

UPDATE chat_mood 
SET conversation_id = 'drippy' 
WHERE conversation_id = 'default';

-- Remover registros órfãos de chat_mood (usuários que não existem mais)
DELETE FROM chat_mood 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Criar índices para melhorar performance das queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_conversation 
ON chat_messages(user_id, conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_mood_user_conversation 
ON chat_mood(user_id, conversation_id);