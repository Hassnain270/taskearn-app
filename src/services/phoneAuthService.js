import { auth } from '../firebaseConfig';
// آپ کی موجودہ Firebase کنفیگ فائل
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";

/**
 * 1. Firebase Phone Auth کے ذریعے SMS OTP بھیجنا
 * @param {string} phoneNumber - صارف کا فون نمبر E.164 فارمیٹ میں (+923xxxxxxxxx)
 * @param {React.RefObject} recaptchaVerifier - Firebase Recaptcha Verifier کا Ref (Expo/React Native)
 */
export async function sendSMSOTP(phoneNumber, recaptchaVerifier) {
  try {
    const phoneProvider = new PhoneAuthProvider(auth);
    
    // Firebase Native Phone Auth SMS Trigger
    const verificationId = await phoneProvider.verifyPhoneNumber(
      phoneNumber,
      recaptchaVerifier.current
    );

    return { 
      success: true, 
      verificationId, 
      message: "SMS OTP کامیابی سے آپ کے فون نمبر پر بھیج دیا گیا ہے۔" 
    };

  } catch (error) {
    console.error("Error sending Phone OTP:", error);
    let errorMsg = "SMS OTP بھیجنے میں ناکامی۔";
    
    if (error.code === 'auth/invalid-phone-number') {
      errorMsg = "فون نمبر کا فارمیٹ غلط ہے۔ (مثلاً: +923001234567)";
    } else if (error.code === 'auth/too-many-requests') {
      errorMsg = "بہت زیادہ درخواستیں۔ کچھ دیر بعد کوشش کریں۔";
    }

    return { success: false, message: errorMsg };
  }
}

/**
 * 2. SMS OTP وریفائی کرنا
 * @param {string} verificationId - sendSMSOTP سے حاصل ہونے والی ID
 * @param {string} enteredOTP - صارف کا درج کردہ 6 ہندسوں کا OTP
 */
export async function verifySMSOTP(verificationId, enteredOTP) {
  try {
    // Firebase Phone Auth Credential Creation
    const credential = PhoneAuthProvider.credential(
      verificationId,
      enteredOTP
    );

    return { 
      success: true, 
      credential, 
      message: "SMS OTP تصدیق کامیاب ہو گئی۔" 
    };

  } catch (error) {
    console.error("Error verifying Phone OTP:", error);
    return { 
      success: false, 
      message: "غلط یا ایکسپائرڈ SMS OTP درج کیا گیا ہے۔" 
    };
  }
}
