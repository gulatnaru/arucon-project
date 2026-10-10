import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { parseExperienceProfile, type ExperienceScenario } from '../living/experience';
import { expoSqliteConnection } from './sqlite';
export type RoomProfile = 'original' | 'reboot_review' | 'personality_comparison' | 'personality_playful' | 'personality_warm' | 'personality_poised' | ExperienceScenario | `${ExperienceScenario}#${number}`;

const databases = new Map<string, Promise<SQLiteDatabase>>();

/**
 * The database belongs to the JS process, not an Activity-backed component.
 * Reusing one open promise avoids accumulating native references when Android
 * recreates the Activity for configuration changes such as font scaling.
 */
export function openAruconDatabase(name: 'arucon-dev.db' | 'arucon-life-experience.db' | 'arucon-reboot-review.db' = 'arucon-dev.db'): Promise<SQLiteDatabase> {
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
  const connection = expoSqliteConnection(db);
  await connection.execAsync('CREATE TABLE IF NOT EXISTS presentation_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  return connection;
}
export async function readExperienceProfile(): Promise<RoomProfile> {
  const db = await profileDatabase();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM presentation_settings WHERE key = 'experience'");
  if (row?.value === 'yes') return 'normal';
  if(row && ['personality_comparison','personality_playful','personality_warm','personality_poised'].includes(row.value)) return row.value as RoomProfile;
  if (row?.value === 'reboot_review') return 'reboot_review';
  return row && parseExperienceProfile(row.value) ? row.value as RoomProfile : 'original';
}
export async function saveExperienceProfile(profile: RoomProfile): Promise<void> {
  const db = await profileDatabase();
  await db.runAsync("INSERT INTO presentation_settings (key, value) VALUES ('experience', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [profile]);
}
