-- Create table for app releases/versions
CREATE TABLE public.app_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  release_date DATE NOT NULL DEFAULT CURRENT_DATE,
  release_notes TEXT NOT NULL,
  download_url TEXT NOT NULL,
  min_android_version TEXT,
  file_size_bytes BIGINT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

-- Everyone can read published releases
CREATE POLICY "Anyone can view published releases"
ON public.app_releases
FOR SELECT
USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage all releases"
ON public.app_releases
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_app_releases_updated_at
BEFORE UPDATE ON public.app_releases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for APK files
INSERT INTO storage.buckets (id, name, public)
VALUES ('apk-files', 'apk-files', true);

-- Storage policies for APK files
CREATE POLICY "Anyone can view APK files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'apk-files');

CREATE POLICY "Admins can upload APK files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'apk-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update APK files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'apk-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete APK files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'apk-files' AND public.has_role(auth.uid(), 'admin'));