import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import request from 'supertest';
import { boot, creds } from './helpers.js';

process.env.LOG_LEVEL = 'info'; // this file inspects the logs, so turn them on (set before app is imported)

let t;
before(async () => { t = await boot(); });
after(async () => { await t.close(); });
beforeEach(() => t.reset());

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const signup = (n) => request(t.app).post('/api/auth/signup').send(creds(n));

describe('logging never leaks secrets', () => {
  it('omits tokens, cookies, OAuth codes and passwords from logs', async () => {
    const { createApp } = await import('../src/app.js');
    const lines = [];
    const sink = new Writable({ write(chunk, _enc, cb) { lines.push(chunk.toString()); cb(); } });
    const app = createApp(sink);

    const su = await request(app).post('/api/auth/signup').send({ ...creds(20), password: 'S3cretPassw0rd!' });
    const token = su.body.accessToken;
    const refreshCookie = su.headers['set-cookie'][0].match(/hs_refresh=([^;]+)/)[1];

    await request(app).get('/api/me').set(auth(token));
    await request(app).post('/api/auth/refresh').set('Cookie', `hs_refresh=${refreshCookie}`);
    await request(app).get('/api/auth/google/callback?code=SECRET_OAUTH_CODE&state=SECRET_STATE');
    await request(app).post('/api/auth/login').send({ email: 'user20@example.com', password: 'WrongPassw0rd!' });
    await request(app).get('/api/catalog/search?q=private+search+terms');

    const logs = lines.join('');
    assert.ok(lines.length >= 5, 'requests are logged');
    for (const secret of [token, refreshCookie, 'SECRET_OAUTH_CODE', 'SECRET_STATE', 'S3cretPassw0rd!', 'WrongPassw0rd!', 'Bearer ', 'private+search+terms']) {
      assert.ok(!logs.includes(secret), `log must not contain ${secret.slice(0, 12)}…`);
    }
    assert.match(logs, /"url":"\/api\/auth\/google\/callback"/, 'path is logged without its query string');
  });
});

describe('token hardening', () => {
  it('rejects an unsigned (alg:none) JWT', async () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: '000000000000000000000000' })}.`;
    assert.equal((await request(t.app).get('/api/me').set(auth(forged))).status, 401);
  });
});

describe('account safety', () => {
  it('Google sign-in takes over an unverified password account (pre-hijacking defence)', async () => {
    const victim = await signup(21); // "attacker" registered the victim's email with a password
    const stale = victim.headers['set-cookie'][0].match(/hs_refresh=([^;]+)/)[1];

    const { upsertGoogleUser } = await import('../src/services/users.js');
    const linked = await upsertGoogleUser({ sub: 'google-sub-1', email: 'user21@example.com', name: 'Real Owner', picture: null });

    assert.equal(linked.passwordHash, undefined, 'attacker password is gone');
    const login = await request(t.app).post('/api/auth/login').send({ email: 'user21@example.com', password: 'password123' });
    assert.equal(login.status, 401);
    const refresh = await request(t.app).post('/api/auth/refresh').set('Cookie', `hs_refresh=${stale}`);
    assert.equal(refresh.status, 401, 'attacker session is revoked');
  });

  it('deleting a password account requires the password', async () => {
    const { body: { accessToken } } = await signup(22);
    const del = (body) => request(t.app).delete('/api/me').set(auth(accessToken)).send(body);
    assert.equal((await del({})).status, 401);
    assert.equal((await del({ password: 'wrong-password' })).status, 401);
    assert.equal((await del({ password: 'password123' })).status, 204);
    const login = await request(t.app).post('/api/auth/login').send({ email: 'user22@example.com', password: 'password123' });
    assert.equal(login.status, 401);
  });

  it('rejects passwords bcrypt would silently truncate (>72 bytes)', async () => {
    const res = await request(t.app).post('/api/auth/signup').send({ ...creds(23), password: 'a'.repeat(73) });
    assert.equal(res.status, 400);
  });
});

describe('rate limiting', () => {
  it("can't be bypassed by spoofing X-Forwarded-For when no proxy is trusted", async () => {
    let last;
    for (let i = 0; i < 12; i++) {
      last = await request(t.app).post('/api/auth/login')
        .set('X-Forwarded-For', `10.0.0.${i}`).send({ email: 'target@example.com', password: 'guess' });
    }
    assert.equal(last.status, 429);
  });
});
