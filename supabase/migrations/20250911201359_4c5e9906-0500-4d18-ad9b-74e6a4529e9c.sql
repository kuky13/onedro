-- Adicionar foreign key entre budgets e clients
ALTER TABLE public.budgets 
ADD CONSTRAINT fk_budgets_client_id 
FOREIGN KEY (client_id) 
REFERENCES public.clients(id) 
ON DELETE SET NULL;