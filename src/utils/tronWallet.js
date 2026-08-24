import { getFunctions, httpsCallable } from 'firebase/functions';

// Every call generates a BRAND NEW, unique deposit address derived from the
// master wallet, along with a server-side pending deposit record that the
// scheduled Cloud Function verifies automatically, even if the app is
// closed. No blockchain checking happens on the client anymore, and no API
// key is ever exposed in the app — all verification runs server-side.

export const generateDepositAddress = async (amount) => {
  const functions = getFunctions();
  const fn = httpsCallable(functions, 'generateDepositAddress');
  const result = await fn({ amount });
  return result.data; // { address, depositId, expiresAt }
};

export const generateBEP20DepositAddress = async (amount) => {
  const functions = getFunctions();
  const fn = httpsCallable(functions, 'generateBEP20Address');
  const result = await fn({ amount });
  return result.data; // { address, depositId, expiresAt }
};