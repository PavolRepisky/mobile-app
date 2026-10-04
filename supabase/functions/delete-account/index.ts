// Settings' Delete account. Deleting the auth user cascades through every
// table, but storage files aren't rows the database can cascade to, so each
// bucket's folder for the account is emptied first — otherwise the photos
// would outlive the person who took them.
//
// Called by the signed-in app with its own access token; it can only ever
// delete the account that token belongs to.

import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKETS = ['avatars', 'challenge-photos', 'task-photos'] as const;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  const { data, error } = token ? await admin.auth.getUser(token) : { data: null, error: true };
  if (error || !data?.user) {
    return new Response('Not signed in', { status: 401 });
  }
  const userId = data.user.id;

  for (const bucket of BUCKETS) {
    const paths = await listAll(admin, bucket, userId);
    // The storage API takes removals in batches.
    for (let i = 0; i < paths.length; i += 100) {
      const { error: removeError } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (removeError) return new Response(removeError.message, { status: 500 });
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return new Response(deleteError.message, { status: 500 });

  return new Response(null, { status: 204 });
});

/** Every file under a folder, however deep — task photos sit three folders
 * down, under membership and day. */
async function listAll(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  folder: string,
): Promise<string[]> {
  const found: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000, offset });
    if (error) throw error;
    for (const entry of data) {
      const path = `${folder}/${entry.name}`;
      // Folders come back without an id.
      if (entry.id) found.push(path);
      else found.push(...(await listAll(admin, bucket, path)));
    }
    if (data.length < 1000) return found;
  }
}
