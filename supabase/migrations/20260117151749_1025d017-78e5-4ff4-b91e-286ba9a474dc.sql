-- Create storage bucket for health reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('health-reports', 'health-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own reports
CREATE POLICY "Users can upload their own health reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'health-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view their own reports
CREATE POLICY "Users can view their own health reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'health-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own reports
CREATE POLICY "Users can delete their own health reports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'health-reports' AND auth.uid()::text = (storage.foldername(name))[1]);