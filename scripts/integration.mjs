import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Prefer loading .env.local for local dev if present, otherwise fallback to default env
const localEnv = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else {
  dotenv.config();
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!URL || !SECRET || !PUBLISHABLE) {
  console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  process.exit(2);
}

const admin = createClient(URL, SECRET);
const client = createClient(URL, PUBLISHABLE, { auth: { persistSession: false } });

async function run() {
  console.log('Integration test started');
  const email = `integ-${Date.now()}@example.com`;
  const password = 'Supabase123!';

  console.log('Creating test user (admin) ...');
  const create = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { test: true } });
  if (create.error) throw create.error;
  const user = create.data.user;
  console.log('Created user:', user.id);

  try {
    console.log('Signing in as test user ...');
    const sign = await client.auth.signInWithPassword({ email, password });
    if (sign.error) throw sign.error;
    const token = sign.data.session?.access_token;
    if (!token) throw new Error('No access token from sign-in');

    const testItem = {
      id: `test-${Date.now()}`,
      product: { id: 'p-test', name: 'Test Product', pricing: {} },
    };

    console.log('Posting item to /api/wishlist ...');
    const post = await fetch('http://localhost:3000/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ item: testItem }),
    }).catch(err => { throw new Error('fetch error: ' + err.message); });
    const postBody = await post.json().catch(() => ({}));
    if (!post.ok) throw new Error('POST failed: ' + (postBody.error ?? post.statusText));

    console.log('Fetching items via /api/wishlist ...');
    const get = await fetch('http://localhost:3000/api/wishlist', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const getBody = await get.json();
    if (!get.ok) throw new Error('GET failed: ' + (getBody.error ?? get.statusText));

    const found = (getBody.items || []).find((i) => i.id === testItem.id);
    if (!found) throw new Error('Inserted item not found in GET response');

    console.log('Integration test succeeded — item persisted and returned by API');

    // Cleanup: remove wishlist row
    await admin.from('wishlist').delete().eq('id', testItem.id);
  } finally {
    console.log('Cleaning up user ...');
    await admin.auth.admin.deleteUser(user.id).catch(() => null);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Integration test failed:', err.message ?? err);
    process.exit(1);
  });
