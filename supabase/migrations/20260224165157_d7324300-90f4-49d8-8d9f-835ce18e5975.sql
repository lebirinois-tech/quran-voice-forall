-- Add collection/reciter column to audio_downloads
ALTER TABLE public.audio_downloads ADD COLUMN collection text;

-- Index for filtering by collection
CREATE INDEX idx_audio_downloads_collection ON public.audio_downloads (collection);