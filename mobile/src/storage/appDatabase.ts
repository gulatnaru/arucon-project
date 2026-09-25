import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

let databasePromise: Promise<SQLiteDatabase> | null = null;

/**
 * The database belongs to the JS process, not an Activity-backed component.
 * Reusing one open promise avoids accumulating native references when Android
 * recreates the Activity for configuration changes such as font scaling.
 */
export function openAruconDatabase(): Promise<SQLiteDatabase> {
  if (databasePromise) return databasePromise;
  const opening = openDatabaseAsync('arucon-dev.db').catch((error: unknown) => {
    if (databasePromise === opening) databasePromise = null;
    throw error;
  });
  databasePromise = opening;
  return opening;
}
