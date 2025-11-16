-- Adicionar 'template' como valor permitido no workflow_status
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_workflow_status_check;

ALTER TABLE budgets ADD CONSTRAINT budgets_workflow_status_check 
CHECK (workflow_status IN ('pending', 'approved', 'rejected', 'expired', 'converted', 'template'));