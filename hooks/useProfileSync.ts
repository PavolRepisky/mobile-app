import { useEffect } from 'react';

import { useApp } from '@/hooks/useAppState';
import { useSession } from '@/hooks/useSession';
import { fetchProfile } from '@/lib/backend/api';

/**
 * Puts the signed-in account's own name, handle and bio where the app reads
 * them, in place of the demo account's. The rest of the app — the challenge,
 * its days, friends — still runs on the demo data until those move to the
 * backend too; this is the first piece that's really yours.
 */
export function useProfileSync() {
  const { session } = useSession();
  const { setName, setHandle, setBio } = useApp();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let live = true;
    fetchProfile(userId)
      .then((profile) => {
        if (!live) return;
        setName(profile.name || profile.handle);
        setHandle(`@${profile.handle}`);
        setBio(profile.bio);
      })
      // Offline at launch: the page keeps what it had, and the next launch
      // tries again.
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId, setName, setHandle, setBio]);
}
