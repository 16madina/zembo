-- Add reply_to_message_id column to messages table
ALTER TABLE public.messages 
ADD COLUMN reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Create index for efficient lookup of replies
CREATE INDEX idx_messages_reply_to ON public.messages(reply_to_message_id);
