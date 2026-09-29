import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { parseExperienceProfile, type ExperienceScenario } from '../living/experience';
export type RoomProfile = 'original' | ExperienceScenario | `${ExperienceScenario}#${number}`;

const databases = new Map<string, Promise<SQLiteDatabase>>();

/**
 * The database belongs to the JS process, not an Activity-backed component.
 * Reusing one open promise avoids accumulating native references when Android
 * recreates the Activity for configuration changes such as font scaling.
 */
export function openAruconDatabase(name: 'arucon-dev.db' | 'arucon-life-experience.db' = 'arucon-dev.db'): Promise<SQLiteDatabase> {
  const existing = databases.get(name);
  if (existing) return existing;
  const opening = openDatabaseAsync(name).catch((error: unknown) => {
    if (databases.get(name) === opening) databases.delete(name);
    throw error;
  });
  databases.set(name, opening);
  return opening;
}

async function profileDatabase() {
  const db = await openAruconDatabase();
  await db.execAsync('CREATE TABLE IF NOT EXISTS presentation_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  return db;
}
export async function readExperienceProfile(): Promise<RoomProfile> {
  const db = await profileDatabase();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM presentation_settings WHERE key = 'experience'");
  if (row?.value === 'yes') return 'normal';
  return row && parseExperienceProfile(row.value) ? row.value as RoomProfile : 'original';
}
export async function saveExperienceProfile(profile: RoomProfile): Promise<void> {
  const db = await profileDatabase();
  await db.runAsync("INSERT INTO presentation_settings (key, value) VALUES ('experience', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", profile);
}
