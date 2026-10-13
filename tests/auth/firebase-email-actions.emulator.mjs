// Run with loopback-only Auth config: firebase emulators:exec --only auth --project demo-care-on-board --log-verbosity SILENT "node tests/auth/firebase-email-actions.emulator.mjs"
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { deleteApp, initializeApp } from 'firebase/app';
// Node's SDK captures fetch on import; this dispatcher permits a synthetic transport check later.
const originalSdkFetch = globalThis.fetch;
let sdkFetchOverride = null;
globalThis.fetch = (...args) => (sdkFetchOverride || originalSdkFetch)(...args);
const {
  ActionCodeOperation,
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  initializeAuth,
  isSignInWithEmailLink,
  multiFactor,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
  updateEmail,
  verifyBeforeUpdateEmail,
  verifyPasswordResetCode,
} = await import('firebase/auth');
globalThis.fetch = originalSdkFetch;

const projectId = 'demo-care-on-board';
const emulator = 'http://127.0.0.1:9099';
const apiKey = 'fake-api-key';
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099', 'Run through emulators:exec with the loopback-only Auth config.');
assert.equal(process.env.GCLOUD_PROJECT, projectId, 'Refusing a non-demo project.');
const app = initializeApp({ projectId, apiKey }, 'email-actions-emulator-' + randomUUID());
const auth = initializeAuth(app, { persistence: inMemoryPersistence });
connectAuthEmulator(auth, emulator, { disableWarnings: true });
const email = 'action-' + randomUUID() + '@example.test';
const changedEmail = 'changed-' + randomUUID() + '@example.test';
const password = randomUUID() + 'Aa1!';
const newPassword = randomUUID() + 'Bb2!';
const settings = { url: 'https://app.joincareonboard.com/auth/login', handleCodeInApp: false };
let userId;
let step = 'setup';

async function api(path, body, method = 'POST') {
  const response = await fetch(emulator + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error('Local emulator request failed.');
    error.code = result.error?.message?.split(' : ')[0] || 'emulator/request-failed';
    throw error;
  }
  return result;
}

async function oobs() {
  return (await api('/emulator/v1/projects/' + projectId + '/oobCodes', undefined, 'GET')).oobCodes;
}

async function action(requestType, address = email) {
  const record = (await oobs()).findLast((item) => item.requestType === requestType && item.email === address);
  assert.ok(record, 'Expected local email action was generated.');
  const url = new URL(record.oobLink);
  assert.equal(url.searchParams.get('apiKey'), apiKey);
  assert.ok(url.searchParams.get('oobCode'), 'Generated link retains its one-time code.');
  assert.equal(url.searchParams.get('lang'), 'en');
  if (requestType !== 'RECOVER_EMAIL') assert.equal(url.searchParams.get('continueUrl'), settings.url);
  return record;
}

async function rejectsCode(callback, expected = 'auth/invalid-action-code') {
  await assert.rejects(callback, (error) => error.code === expected, 'Expected Firebase rejection: ' + expected);
}

function pass(name) {
  console.log('AUTH_ACTION_PASS ' + name);
}

async function verifyMfaSdkTransport() {
  await signOut(auth);
  const requests = [];
  let includeFactor = true;
  auth.tenantId = 'synthetic-test-tenant';
  sdkFetchOverride = async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, emulator, 'Synthetic test must never call a real service.');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { oobCode: 'synthetic-reversal-code', tenantId: auth.tenantId });
    assert.equal(auth.currentUser, null);
    const operation = url.pathname.split(':').at(-1);
    assert.ok(['resetPassword', 'update'].includes(operation));
    requests.push(operation);
    return new Response(JSON.stringify(operation === 'update' ? {} : {
      requestType: 'REVERT_SECOND_FACTOR_ADDITION', email: 'synthetic@example.test',
      ...(includeFactor ? { mfaInfo: {
        mfaEnrollmentId: 'synthetic-factor', displayName: 'Synthetic factor',
        enrolledAt: '2026-10-13T00:00:00.000Z', phoneInfo: '+15555550123',
      } } : {}),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const info = await checkActionCode(auth, 'synthetic-reversal-code');
    assert.equal(info.operation, ActionCodeOperation.REVERT_SECOND_FACTOR_ADDITION);
    assert.equal(info.data.multiFactorInfo.uid, 'synthetic-factor');
    assert.equal(info.data.multiFactorInfo.factorId, 'phone');
    await applyActionCode(auth, 'synthetic-reversal-code');
    includeFactor = false;
    await rejectsCode(() => checkActionCode(auth, 'synthetic-reversal-code'), 'auth/internal-error');
    assert.deepEqual(requests, ['resetPassword', 'update', 'resetPassword']);
    pass('revertSecondFactorAddition SDK transport ONLY: metadata parsed, missing factor rejected, code+tenant sent signed out; server response synthetic');
  } finally {
    sdkFetchOverride = null;
    auth.tenantId = null;
  }
}

try {
  userId = (await createUserWithEmailAndPassword(auth, email, password)).user.uid;

  step = 'resetPassword';
  await sendPasswordResetEmail(auth, email, settings);
  const reset = await action('PASSWORD_RESET');
  assert.equal(new URL(reset.oobLink).searchParams.get('mode'), 'resetPassword');
  await signOut(auth);
  assert.equal(auth.currentUser, null);
  assert.equal((await checkActionCode(auth, reset.oobCode)).operation, ActionCodeOperation.PASSWORD_RESET);
  assert.equal(await verifyPasswordResetCode(auth, reset.oobCode), email);
  await rejectsCode(() => confirmPasswordReset(auth, reset.oobCode, 'x'), 'auth/weak-password');
  assert.equal(await verifyPasswordResetCode(auth, reset.oobCode), email, 'Weak password must not consume code.');
  await confirmPasswordReset(auth, reset.oobCode, newPassword);
  await rejectsCode(() => verifyPasswordResetCode(auth, reset.oobCode));
  await rejectsCode(() => confirmPasswordReset(auth, reset.oobCode, newPassword));
  await rejectsCode(() => checkActionCode(auth, 'invalid-local-test-code'));
  await signInWithEmailAndPassword(auth, email, newPassword);
  pass('resetPassword: signed-out validation, weak password, confirm, reused/invalid rejection');

  // The emulator marks email verified on reset; use a separate unverified account.
  step = 'verifyEmail';
  await signOut(auth);
  const verifyEmailAddress = 'verify-' + randomUUID() + '@example.test';
  const verifyUser = (await createUserWithEmailAndPassword(auth, verifyEmailAddress, password)).user;
  const verifyUserId = verifyUser.uid;
  try {
    await sendEmailVerification(verifyUser, settings);
    const verification = await action('VERIFY_EMAIL', verifyEmailAddress);
    assert.equal(new URL(verification.oobLink).searchParams.get('mode'), 'verifyEmail');
    await signOut(auth);
    const info = await checkActionCode(auth, verification.oobCode);
    assert.equal(info.operation, ActionCodeOperation.VERIFY_EMAIL);
    assert.equal(info.data.email, verifyEmailAddress);
    // SDK validation returns the email for other operations; callers must check operation themselves.
    assert.equal(await verifyPasswordResetCode(auth, verification.oobCode), verifyEmailAddress);
    await rejectsCode(() => confirmPasswordReset(auth, verification.oobCode, newPassword));
    assert.equal((await checkActionCode(auth, verification.oobCode)).operation, ActionCodeOperation.VERIFY_EMAIL, 'Operation mismatch must not redeem code.');
    await applyActionCode(auth, verification.oobCode);
    await rejectsCode(() => applyActionCode(auth, verification.oobCode));
    assert.equal((await signInWithEmailAndPassword(auth, verifyEmailAddress, password)).user.emailVerified, true);
    pass('verifyEmail: signed-out check/apply, wrong operation and reused rejection');
  } finally {
    await api('/identitytoolkit.googleapis.com/v1/accounts:delete?key=' + apiKey, { localId: verifyUserId });
  }

  step = 'recoverEmail';
  await signOut(auth);
  const recoveryUser = (await signInWithEmailAndPassword(auth, email, newPassword)).user;
  // Stage a notification on the throwaway account; restoration below uses only the email action code.
  await updateEmail(recoveryUser, changedEmail);
  const recovery = await action('RECOVER_EMAIL');
  assert.equal(new URL(recovery.oobLink).searchParams.get('mode'), 'recoverEmail');
  await signOut(auth);
  const recoveryInfo = await checkActionCode(auth, recovery.oobCode);
  assert.equal(recoveryInfo.operation, ActionCodeOperation.RECOVER_EMAIL);
  assert.equal(recoveryInfo.data.email, email);
  await applyActionCode(auth, recovery.oobCode);
  await rejectsCode(() => applyActionCode(auth, recovery.oobCode));
  assert.equal((await signInWithEmailAndPassword(auth, email, newPassword)).user.uid, userId);
  pass('recoverEmail: signed-out check/apply restores original address, reused rejection');

  step = 'verifyAndChangeEmail';
  const changeUser = auth.currentUser;
  await verifyBeforeUpdateEmail(changeUser, changedEmail, settings);
  const change = await action('VERIFY_AND_CHANGE_EMAIL');
  assert.equal(new URL(change.oobLink).searchParams.get('mode'), 'verifyAndChangeEmail');
  await signOut(auth);
  const changeInfo = await checkActionCode(auth, change.oobCode);
  assert.equal(changeInfo.operation, ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL);
  assert.equal(changeInfo.data.email, changedEmail);
  assert.equal(changeInfo.data.previousEmail, email);
  await applyActionCode(auth, change.oobCode);
  await rejectsCode(() => applyActionCode(auth, change.oobCode));
  assert.equal((await signInWithEmailAndPassword(auth, changedEmail, newPassword)).user.uid, userId);
  pass('verifyAndChangeEmail: signed-out check/apply, email changed, reused rejection');

  step = 'signIn';
  await sendSignInLinkToEmail(auth, changedEmail, { ...settings, handleCodeInApp: true });
  const signIn = await action('EMAIL_SIGNIN', changedEmail);
  assert.equal(new URL(signIn.oobLink).searchParams.get('mode'), 'signIn');
  await signOut(auth);
  assert.ok(isSignInWithEmailLink(auth, signIn.oobLink));
  assert.equal((await checkActionCode(auth, signIn.oobCode)).operation, ActionCodeOperation.EMAIL_SIGNIN);
  assert.equal((await signInWithEmailLink(auth, changedEmail, signIn.oobLink)).user.uid, userId);
  await signOut(auth);
  await rejectsCode(() => signInWithEmailLink(auth, changedEmail, signIn.oobLink));
  pass('signIn: signed-out email-link SDK redemption, reused rejection');

  step = 'revertSecondFactorAddition';
  const mfaUser = (await signInWithEmailAndPassword(auth, changedEmail, newPassword)).user;
  await reload(mfaUser);
  assert.ok(mfaUser.emailVerified);
  const phoneNumber = '+15555550123';
  const start = await api('/identitytoolkit.googleapis.com/v2/accounts/mfaEnrollment:start?key=' + apiKey, {
    idToken: await mfaUser.getIdToken(), phoneEnrollmentInfo: { phoneNumber },
  });
  const sms = (await api('/emulator/v1/projects/' + projectId + '/verificationCodes', undefined, 'GET'))
    .verificationCodes.findLast((item) => item.phoneNumber === phoneNumber);
  assert.ok(sms, 'Local emulator generated an SMS enrollment challenge.');
  // Phone enrollment SDK requires a browser, so stage its challenge through loopback emulator REST.
  await api('/identitytoolkit.googleapis.com/v2/accounts/mfaEnrollment:finalize?key=' + apiKey, {
    idToken: await mfaUser.getIdToken(), displayName: 'Emulator test factor',
    phoneVerificationInfo: { sessionInfo: start.phoneSessionInfo.sessionInfo, code: sms.code },
  });
  await reload(mfaUser);
  assert.equal(multiFactor(mfaUser).enrolledFactors.length, 1);
  const revert = (await oobs()).findLast((item) => item.requestType === 'REVERT_SECOND_FACTOR_ADDITION' && item.email === changedEmail);
  if (revert) {
    await signOut(auth);
    assert.equal((await checkActionCode(auth, revert.oobCode)).operation, ActionCodeOperation.REVERT_SECOND_FACTOR_ADDITION);
    await applyActionCode(auth, revert.oobCode);
    await rejectsCode(() => applyActionCode(auth, revert.oobCode));
    assert.equal(multiFactor((await signInWithEmailAndPassword(auth, changedEmail, newPassword)).user).enrolledFactors.length, 0);
    pass('revertSecondFactorAddition: signed-out check/apply, enrolled factor removed, reused rejection');
  } else {
    console.log('AUTH_ACTION_UNSUPPORTED revertSecondFactorAddition: emulator enrolls MFA but generates no reversal code; real reversal needs an authorized non-production test account');
    await verifyMfaSdkTransport();
  }
  // shortcut: emulator stores no code expiry, test expired-code UI with mocked Firebase errors until an authorized test project is available.
  console.log('AUTH_ACTION_UNSUPPORTED expired codes: Auth emulator does not implement expiration');
  console.log('AUTH_ACTION_COMPLETE Firebase SDK ' + app.options.projectId + ': no production accounts or settings used');
} catch (error) {
  // Firebase errors can contain request context, so output only the step and safe error identifier.
  const location = error.stack?.split('\n').filter((line) => line.includes(import.meta.url)).map((line) => line.trim()).join(' ') || '';
  console.error('AUTH_ACTION_FAIL ' + step + ': ' + (error.code || error.name || 'unknown-error') + ' ' + location);
  process.exitCode = 1;
} finally {
  if (userId) await api('/identitytoolkit.googleapis.com/v1/accounts:delete?key=' + apiKey, { localId: userId });
  await deleteApp(app);
}
