import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.',
  );
  process.exit(1);
}

// These accounts exist only to let visitors try each role on the demo
// project. The password is public on purpose and must never be reused.
const demoPassword = 'TrustLens-Demo-2026';

const accounts = [
  { email: 'member@demo.trustlens.example', name: 'Demo Member', role: 'user' },
  {
    email: 'researcher@demo.trustlens.example',
    name: 'Demo Researcher',
    role: 'researcher',
  },
  { email: 'admin@demo.trustlens.example', name: 'Demo Administrator', role: 'admin' },
  // A second admin is required because nobody may approve their own submission.
  { email: 'editor@demo.trustlens.example', name: 'Demo Editor', role: 'admin' },
];

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserId(email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => user.email === email);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
}

async function upsertAccount({ email, name, role }) {
  let id = await findUserId(email);

  if (id) {
    const { error } = await admin.auth.admin.updateUserById(id, {
      password: demoPassword,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error) throw error;
    id = data.user.id;
  }

  const { error } = await admin
    .from('profiles')
    .update({ role, display_name: name })
    .eq('id', id);
  if (error) throw error;
  console.log(`${role.padEnd(10)} ${email}`);
}

for (const account of accounts) {
  await upsertAccount(account);
}
console.log(`Done. Shared demo password: ${demoPassword}`);
