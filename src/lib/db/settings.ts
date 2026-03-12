import { db } from "@/lib/db";

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await db.appSettings.get(key);
  return row?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.appSettings.put({ key, value });
}

export async function deleteSetting(key: string): Promise<void> {
  await db.appSettings.delete(key);
}
