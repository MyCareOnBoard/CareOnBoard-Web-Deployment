// Run with installed Chrome against the local production preview: node tests/auth/firebase-email-actions.browser.mjs
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const origin = 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ serviceWorkers: 'block' });
const page = await context.newPage();
let operation = 'VERIFY_EMAIL';
let failure = '';
let applied = 0;
let signedIn = 0;
let step = 'startup';
let projectApiKey = '';

// Exercise the actual built routes and Firebase SDK while preventing all remote traffic.
await context.route('**/*', async route => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.origin === origin) return route.continue();
  const headers = { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*' };
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  if (url.hostname !== 'identitytoolkit.googleapis.com') return route.fulfill({ status: 200, headers, body: '' });
  projectApiKey = url.searchParams.get('key') || projectApiKey;
  const body = request.postDataJSON() || {};
  assert.equal(body.idToken, undefined, 'Email action must work without a signed-in identity.');
  if (url.pathname.endsWith('/accounts:update') || body.newPassword) applied++;
  if (url.pathname.endsWith('/accounts:signInWithEmailLink')) signedIn++;
  if (failure) return route.fulfill({ status: 400, headers, json: { error: { code: 400, message: failure } } });
  const response = {
    requestType: operation, email: 'original@example.test', newEmail: 'new@example.test',
    ...(operation === 'REVERT_SECOND_FACTOR_ADDITION' ? { mfaInfo: { mfaEnrollmentId: 'test-factor', displayName: 'Test phone', phoneInfo: '+15555550123', enrolledAt: '2026-10-13T00:00:00Z' } } : {}),
  };
  return route.fulfill({ headers, json: response });
});

try {
  for (const [mode, expected, button, heading] of [
    ['verifyEmail', 'VERIFY_EMAIL', 'Verify email', 'Email verified'],
    ['recoverEmail', 'RECOVER_EMAIL', 'Restore email', 'Email restored'],
    ['revertSecondFactorAddition', 'REVERT_SECOND_FACTOR_ADDITION', 'Remove added factor', 'Added factor removed'],
    ['verifyAndChangeEmail', 'VERIFY_AND_CHANGE_EMAIL', 'Confirm email change', 'Email changed'],
  ]) {
    step = mode;
    operation = expected;
    applied = 0;
    await page.goto(`${origin}/auth/action?${new URLSearchParams({ mode, oobCode: 'synthetic-code', tenantId: 'test-tenant', lang: 'en', continueUrl: 'https://evil.example/phish' })}`);
    await page.getByRole('button', { name: button, exact: true }).waitFor();
    assert.equal(applied, 0, 'Opening the link must not redeem it.');
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
    assert.equal(applied, 1);
    assert.equal(await page.getByRole('link', { name: 'Continue', exact: true }).getAttribute('href'), '/auth/login');
    console.log('AUTH_BROWSER_PASS ' + mode + ': direct signed-out route, explicit SDK confirmation, redirect rejection');
  }
  step = 'resetPassword';
  operation = 'PASSWORD_RESET';
  applied = 0;
  assert.ok(projectApiKey, 'The configured SDK project key was used.');
  const params = new URLSearchParams({ mode: 'resetPassword', oobCode: 'synthetic-code', apiKey: projectApiKey, lang: 'es', tenantId: 'test-tenant', continueUrl: 'https://app.joincareonboard.com/auth/login' });
  await page.goto(`${origin}/auth/action?${params}`);
  await page.getByRole('heading', { name: 'Set New Password', exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, '/auth/reset-password');
  assert.equal(new URL(page.url()).searchParams.toString(), params.toString());
  assert.equal(applied, 0);
  await page.getByLabel('New Password', { exact: true }).fill('SyntheticPassword1');
  await page.getByLabel('Confirm New Password', { exact: true }).fill('SyntheticPassword1');
  await page.getByRole('button', { name: 'Reset Password', exact: true }).click();
  await page.getByRole('heading', { name: 'Password updated', exact: true }).waitFor();
  assert.equal(applied, 1);
  console.log('AUTH_BROWSER_PASS resetPassword: direct navigation, query retention, SDK confirmation');

  step = 'expired';
  operation = 'VERIFY_EMAIL';
  failure = 'EXPIRED_OOB_CODE';
  await page.goto(`${origin}/auth/action?mode=verifyEmail&oobCode=synthetic-expired-code`);
  await page.getByRole('alert').filter({ hasText: /expired/i }).waitFor();
  failure = '';
  console.log('AUTH_BROWSER_PASS expired: SDK error reaches the direct-link UI');

  step = 'signIn';
  operation = 'EMAIL_SIGNIN';
  await page.goto(`${origin}/auth/action?${new URLSearchParams({ mode: 'signIn', oobCode: 'synthetic-code', apiKey: projectApiKey, lang: 'en' })}`);
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Continue to family sign-in', exact: true }).click();
  await page.waitForURL(url => url.pathname === '/auth/family-login');
  await page.getByText(/could not confirm which address/i).waitFor();
  assert.equal(signedIn, 0, 'Canceling recipient confirmation must not redeem the link.');
  console.log('AUTH_BROWSER_PASS signIn: query handoff and canceled confirmation do not sign in');
  console.log('AUTH_BROWSER_COMPLETE isolated signed-out browser; SDK responses simulated, no remote requests');
} catch (error) {
  const text = await page.locator('body').innerText().catch(() => '');
  console.error('AUTH_BROWSER_FAIL ' + step + ': ' + JSON.stringify({ name: error.name, path: new URL(page.url()).pathname, text: text.slice(-700).replaceAll(projectApiKey || '[no-key]', '[redacted]') }));
  process.exitCode = 1;
} finally {
  await browser.close();
}
