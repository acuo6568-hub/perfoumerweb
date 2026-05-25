#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

async function getEnvValue(key) {
  if (process.env[key]) return process.env[key];

  const root = process.cwd();
  const candidates = [path.join(root, '.env.local'), path.join(root, '.env')];
  for (const p of candidates) {
    try {
      const raw = await fs.readFile(p, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const k = trimmed.slice(0, idx).trim();
        let v = trimmed.slice(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (k === key) return v;
      }
    } catch {}
  }
  return '';
}

async function main() {
  const root = process.cwd();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || await getEnvValue('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || await getEnvValue('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    console.error('Missing Supabase config. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env or .env.local');
    process.exit(1);
  }

  const adminDir = path.join(root, 'data', 'admin');
  const perfumesPath = path.join(adminDir, 'perfumes.json');
  const notesPath = path.join(adminDir, 'notes.json');
  const settingsPath = path.join(adminDir, 'site-settings.json');

  const [perfumesRaw, notesRaw, settingsRaw] = await Promise.all([
    fs.readFile(perfumesPath, 'utf8').catch(() => '[]'),
    fs.readFile(notesPath, 'utf8').catch(() => '[]'),
    fs.readFile(settingsPath, 'utf8').catch(() => '{}'),
  ]);

  const perfumes = JSON.parse(perfumesRaw);
  const notes = JSON.parse(notesRaw);
  const settings = JSON.parse(settingsRaw);

  console.log('Updating Supabase admin_data.settings only (preserving perfumes/notes)');

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Fetch existing admin_data row to preserve perfumes/notes
  const { data: existingRow, error: fetchErr } = await supabase
    .from('admin_data')
    .select('data')
    .eq('id', 'admin_data')
    .single();

  if (fetchErr) {
    console.error('Failed to read existing admin_data from Supabase:', fetchErr);
    process.exit(1);
  }

  const existingData = existingRow && existingRow.data ? existingRow.data : { perfumes: [], notes: [], settings: {} };

  // Upsert only the `settings` field to avoid touching perfumes/notes
  const payload = {
    id: 'admin_data',
    data: {
      settings: settings,
    },
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('admin_data').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('Supabase upsert error:', error);
    process.exit(1);
  }

  console.log('Supabase settings update complete.');

  // Read back the saved settings and print the homeHeader for verification
  const { data: savedRow, error: readErr } = await supabase
    .from('admin_data')
    .select('data')
    .eq('id', 'admin_data')
    .single();

  if (readErr) {
    console.warn('Warning: could not read back admin_data:', readErr.message ?? readErr);
    return;
  }

  const savedSettings = savedRow && savedRow.data ? savedRow.data.settings : null;
  console.log('Saved settings.homeHeader:', JSON.stringify(savedSettings?.homeHeader ?? null, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
