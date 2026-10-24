import * as Linking from 'expo-linking';
import { Share } from 'react-native';

/**
 * A profile out through the phone's share sheet, with a link that opens it
 * in the app — the same kind of link an era's invite carries, so whoever it
 * reaches has somewhere to tap rather than a name to search for.
 */
export function shareProfile(person: { id: string; name: string; handle: string }) {
  const url = Linking.createURL(`friend/${person.id}`);
  Share.share({ message: `${person.name} (${person.handle}) on Selfera: ${url}` }).catch(() => {});
}
