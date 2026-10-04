-- Faces and challenge covers could be uploaded and removed, but storage only
-- removes what the person asking is also allowed to read through its own
-- API — and with no read policy on these two buckets, every removal quietly
-- removed nothing: a replaced profile photo or a deleted challenge's covers
-- stayed behind. Both buckets are public — anyone with a link already sees
-- them — so reading them through the API gives nothing new away.

create policy "faces and covers are public" on storage.objects for select to authenticated
  using (bucket_id in ('avatars', 'challenge-photos'));
