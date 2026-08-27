import { auth } from '../firebaseConfig';
import { PhoneAuthProvider } from 'firebase/auth';

// This service only VERIFIES that a phone number is real and reachable —
// it never signs the user in with the phone credential. This matters
// because TaskEarn's accounts are identified by email/password; phone OTP
// here is purely a side-channel security check (e.g. confirming email
// changes, or a Forgot Password fallback), not a login method. Calling
// signInWithCredential would replace the user's current session with a
// brand-new phone-based account, which is NOT what we want.
//
// The caller is responsible for supplying a valid Firebase
// ApplicationVerifier (reCAPTCHA) via `recaptchaVerifier.current`:
//   - On web: a `RecaptchaVerifier` instance from 'firebase/auth', bound
//     to a hidden DOM container.
//   - On native (Android/iOS): a `FirebaseRecaptchaVerifierModal` ref
//     from the 'expo-firebase-recaptcha' package.

/**
 * Sends a 6-digit SMS OTP to the given phone number via Firebase Phone Auth.
 * @param {string} phoneNumber - E.164 format, e.g. "+923001234567"
 * @param {React.RefObject} recaptchaVerifier - platform-appropriate reCAPTCHA ref (see note above)
 * @returns {Promise<{success: boolean, verificationId?: string, message: string}>}
 */
export async function sendSMSOTP(phoneNumber, recaptchaVerifier) {
  try {
    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      return {
        success: false,
        message: 'Phone number must be in international format, e.g. +923001234567.',
      };
    }

    if (!recaptchaVerifier?.current) {
      return {
        success: false,
        message: 'Security verification is not ready yet. Please wait a moment and try again.',
      };
    }

    const phoneProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneProvider.verifyPhoneNumber(
      phoneNumber,
      recaptchaVerifier.current
    );

    return {
      success: true,
      verificationId,
      message: 'A 6-digit code has been sent to your phone number.',
    };
  } catch (error) {
    console.error('Error sending Phone OTP:', error);

    let errorMsg = 'Failed to send the SMS code. Please try again.';
    if (error.code === 'auth/invalid-phone-number') {
      errorMsg = 'Invalid phone number format (expected e.g. +923001234567).';
    } else if (error.code === 'auth/too-many-requests') {
      errorMsg = 'Too many attempts. Please wait a while before trying again.';
    } else if (error.code === 'auth/quota-exceeded') {
      errorMsg = 'SMS sending limit reached for now. Please try again later.';
    } else if (error.code === 'auth/captcha-check-failed') {
      errorMsg = 'Security verification failed. Please refresh and try again.';
    }

    return { success: false, message: errorMsg };
  }
}

/**
 * Verifies a 6-digit SMS OTP against the verificationId from sendSMSOTP.
 * Does NOT sign the user in — it only confirms the code was correct and
 * returns the resulting credential for the caller's own bookkeeping
 * (e.g. marking a pending action as authorized) if ever needed.
 * @param {string} verificationId
 * @param {string} enteredOTP - 6-digit code the user typed
 * @returns {Promise<{success: boolean, credential?: object, message: string}>}
 */
export async function verifySMSOTP(verificationId, enteredOTP) {
  try {
    if (!enteredOTP || enteredOTP.length !== 6) {
      return { success: false, message: 'Please enter the 6-digit code.' };
    }

    const credential = PhoneAuthProvider.credential(verificationId, enteredOTP);

    return {
      success: true,
      credential,
      message: 'Phone number verified successfully.',
    };
  } catch (error) {
    console.error('Error verifying Phone OTP:', error);

    let errorMsg = 'The code entered is invalid or has expired.';
    if (error.code === 'auth/code-expired') {
      errorMsg = 'This code has expired. Please request a new one.';
    } else if (error.code === 'auth/invalid-verification-code') {
      errorMsg = 'Incorrect code. Please check and try again.';
    }

    return { success: false, message: errorMsg };
  }
}