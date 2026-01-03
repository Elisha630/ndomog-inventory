-- Create a trigger function to normalize item category to uppercase
CREATE OR REPLACE FUNCTION public.normalize_item_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.category IS NOT NULL THEN
    NEW.category := UPPER(TRIM(NEW.category));
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger on items table
DROP TRIGGER IF EXISTS normalize_item_category_trigger ON public.items;
CREATE TRIGGER normalize_item_category_trigger
BEFORE INSERT OR UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.normalize_item_category();

-- Fix existing data: update all categories to uppercase
UPDATE public.items 
SET category = UPPER(TRIM(category)) 
WHERE category IS NOT NULL AND category != UPPER(TRIM(category));