-- Add color field to materiais table
ALTER TABLE materiais 
ADD COLUMN IF NOT EXISTS cor TEXT DEFAULT '#808080';

-- Add comment for documentation
COMMENT ON COLUMN materiais.cor IS 'Cor hexadecimal do material para identificação visual';
