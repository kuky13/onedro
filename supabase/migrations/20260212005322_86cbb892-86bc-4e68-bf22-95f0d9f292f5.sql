-- Fix LID phone numbers: update conversations where phone_number looks like a LID (not a real phone)
-- The number 20311101718763 is known to be a LID for the real phone 556499486306
UPDATE public.whatsapp_conversations 
SET phone_number = '556499486306' 
WHERE phone_number = '20311101718763';
