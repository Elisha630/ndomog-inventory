-- Phase 1.1: Create app_role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'viewer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Phase 1.2: Create categories table (normalize categories)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT categories_name_unique UNIQUE (name)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Trigger to uppercase category names
CREATE OR REPLACE FUNCTION public.uppercase_category_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.name = UPPER(TRIM(NEW.name));
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_uppercase_category
BEFORE INSERT OR UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.uppercase_category_name();

-- RLS for categories
CREATE POLICY "Authenticated users can view categories"
ON public.categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert categories"
ON public.categories FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
ON public.categories FOR UPDATE
TO authenticated
USING (true);

-- Phase 1.3: Add category_id to items and migrate data
ALTER TABLE public.items ADD COLUMN category_id UUID REFERENCES public.categories(id);

-- Phase 1.4: Change prices to decimal
ALTER TABLE public.items 
  ALTER COLUMN buying_price TYPE NUMERIC(12,2) USING buying_price::numeric(12,2),
  ALTER COLUMN selling_price TYPE NUMERIC(12,2) USING selling_price::numeric(12,2);

-- Phase 1.5: Add soft delete columns to items
ALTER TABLE public.items 
  ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN deleted_by UUID REFERENCES auth.users(id);

-- Phase 1.6: Create movement_reason enum and item_movements table
CREATE TYPE public.movement_reason AS ENUM ('sale', 'restock', 'adjustment', 'initial', 'return', 'damage', 'transfer');

CREATE TABLE public.item_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  delta INTEGER NOT NULL,
  reason movement_reason NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.item_movements ENABLE ROW LEVEL SECURITY;

-- RLS for item_movements
CREATE POLICY "Authenticated users can view all movements"
ON public.item_movements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert movements"
ON public.item_movements FOR INSERT
TO authenticated
WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_item_movements_item_id ON public.item_movements(item_id);
CREATE INDEX idx_item_movements_created_at ON public.item_movements(created_at DESC);

-- Phase 1.7: Enhance notifications table
CREATE TYPE public.notification_type AS ENUM (
  'LOW_STOCK', 
  'ITEM_UPDATED', 
  'ITEM_DELETED', 
  'ITEM_ADDED', 
  'QUANTITY_CHANGED',
  'ITEM_RESTORED'
);

ALTER TABLE public.notifications 
  ADD COLUMN type notification_type,
  ADD COLUMN entity_id UUID;

-- Phase 1.8: Enhance activity_logs with item_id reference
ALTER TABLE public.activity_logs 
  ADD COLUMN item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  ADD COLUMN snapshot_data JSONB;

-- Index for soft deleted items
CREATE INDEX idx_items_is_deleted ON public.items(is_deleted) WHERE is_deleted = false;

-- Enable realtime for item_movements
ALTER PUBLICATION supabase_realtime ADD TABLE public.item_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;