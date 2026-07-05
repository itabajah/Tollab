import { getDatabase, ref, get, set, onValue, type Database } from 'firebase/database'
import type { FirebaseApp } from 'firebase/app'
import type { CloudBackend } from './backend'
import type { CloudRecordV3 } from './protocol'

/**
 * Thin Firebase Realtime Database adapter for the sync engine. One node per
 * user at `tollab/users/<uid>/data` (unchanged from the legacy app, so existing
 * cloud data loads). Deliberately excluded from unit coverage — everything
 * above it is tested against the in-memory fake backend.
 */
const dbPathForUser = (uid: string): string => `tollab/users/${uid}/data`

export function createFirebaseBackend(app: FirebaseApp, uid: string): CloudBackend {
  const db: Database = getDatabase(app)
  const nodeRef = ref(db, dbPathForUser(uid))

  return {
    async load() {
      const snapshot = await get(nodeRef)
      return snapshot.exists() ? (snapshot.val() as unknown) : null
    },
    async save(record: CloudRecordV3) {
      await set(nodeRef, record)
    },
    subscribe(onValueChange) {
      return onValue(nodeRef, (snapshot) => {
        onValueChange(snapshot.exists() ? (snapshot.val() as unknown) : null)
      })
    },
  }
}
