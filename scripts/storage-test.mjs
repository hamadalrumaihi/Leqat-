// Live Storage verification against the local stack:
//   staff upload to their group's path → signed URL → fetch bytes back
//   anon cannot sign; staff cannot write outside their group's path.
import { createClient } from '@supabase/supabase-js';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!ANON) { console.error('source .env.local first'); process.exit(1); }

const sb = createClient(URL_, ANON);
const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
  email: 'gsup@leqat.qa', password: 'Leqat@2025',
});
if (authErr) { console.error('login failed', authErr.message); process.exit(1); }
console.log('1. gsup authenticated: OK');

const { data: staffRow } = await sb.from('group_staff').select('group_id').eq('profile_id', auth.user.id).limit(1).single();
const gid = staffRow.group_id;

const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
const path = `${gid}/verify-${auth.user.id.slice(0, 8)}.png`;

const up = await sb.storage.from('gallery').upload(path, bytes, { contentType: 'image/png', upsert: true });
console.log('2. staff upload to own group path:', up.error ? 'FAIL — ' + up.error.message : 'OK');

const signed = await sb.storage.from('gallery').createSignedUrl(path, 60);
console.log('3. signed URL created:', signed.error ? 'FAIL — ' + signed.error.message : 'OK');

const res = await fetch(signed.data.signedUrl);
const body = new Uint8Array(await res.arrayBuffer());
const match = res.status === 200 && body.length === bytes.length && body[0] === 0x89;
console.log('4. signed URL fetch returns the bytes:', match ? 'OK' : `FAIL — ${res.status} len=${body.length}`);

// negative: anon client cannot sign the same object
const anon = createClient(URL_, ANON);
const anonSigned = await anon.storage.from('gallery').createSignedUrl(path, 60);
console.log('5. anon cannot sign:', anonSigned.error ? 'OK (' + anonSigned.error.message + ')' : 'FAIL — anon got a URL');

// negative: unsigned direct object URL is not readable
const direct = await fetch(`${URL_}/storage/v1/object/gallery/${path}`, { headers: { apikey: ANON } });
console.log('6. unsigned direct fetch rejected:', direct.status >= 400 ? `OK (${direct.status})` : 'FAIL — ' + direct.status);

// negative: staff cannot write outside their group's path
const foreign = await sb.storage.from('gallery').upload(`00000000-0000-4000-8000-00000000dead/x.png`, bytes, { contentType: 'image/png' });
console.log('7. write to foreign group path rejected:', foreign.error ? 'OK (' + foreign.error.message + ')' : 'FAIL — write allowed');

// chat-media quick pass
const cm = await sb.storage.from('chat-media').upload(`${gid}/voice-check.webm`, bytes, { contentType: 'audio/webm', upsert: true });
const cmSigned = cm.error ? { error: cm.error } : await sb.storage.from('chat-media').createSignedUrl(`${gid}/voice-check.webm`, 60);
const cmFetch = cmSigned.error ? null : await fetch(cmSigned.data.signedUrl);
console.log('8. chat-media upload + signed fetch:', cmFetch && cmFetch.status === 200 ? 'OK' : 'FAIL — ' + (cm.error?.message ?? cmSigned.error?.message ?? cmFetch?.status));

// cleanup
await sb.storage.from('gallery').remove([path]);
await sb.storage.from('chat-media').remove([`${gid}/voice-check.webm`]);
