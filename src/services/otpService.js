import { db } from '../firebaseConfig';
 // آپ کے موجودہ فائر بیس کنفیگ کی فائل
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";

// OTP کو ہیش کرنے کے لیے سیکیور SHA-256 فنکشن
async function hashOTP(otp) {
  const textAsBuffer = new TextEncoder().encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", textAsBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 1. Email OTP جنریٹ کرنا اور Firestore Mail Collection میں ڈالنا
 */
export async function sendEmailOTP(userId, email, actionType) {
  try {
    const otpRef = doc(db, "otp_sessions", userId);
    const existingSnap = await getDoc(otpRef);

    // 60 Seconds Resend Cooldown Check
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      if (data.resendAllowedAt && Date.now() < data.resendAllowedAt) {
        const remainingSeconds = Math.ceil((data.resendAllowedAt - Date.now()) / 1000);
        return { success: false, message: `براہ کرم دوبارہ OTP بھیجنے کے لیے ${remainingSeconds} سیکنڈ انتظار کریں۔` };
      }
    }

    // 6 Digit Random OTP Generation
    const rawOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await hashOTP(rawOTP);
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000; // 5 Minutes Expiry
    const resendAllowedAt = now + 60 * 1000; // 60 Seconds Cooldown

    // Save Hashed Session in otp_sessions
    await setDoc(otpRef, {
      userId,
      otpHash: hashedOTP,
      actionType,
      expiresAt,
      attempts: 0,
      createdAt: now,
      resendAllowedAt,
    });

    // Send Email via Existing Firebase Extension 'mail' Collection
    await addDoc(collection(db, "mail"), {
      to: [email],
      message: {
        subject: `TaskEarn Security Verification Code (${actionType})`,
        text: `Your TaskEarn OTP verification code is ${rawOTP}. This code is valid for 5 minutes. Do not share it with anyone.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>TaskEarn Security Verification</h2>
            <p>Your OTP verification code for <b>${actionType}</b> is:</p>
            <h1 style="color: #4CAF50; letter-spacing: 5px;">${rawOTP}</h1>
            <p>This code is valid for <b>5 minutes</b>.</p>
            <p style="color: red;">If you did not request this, please ignore this email.</p>
          </div>
        `,
      },
    });

    return { success: true, message: "OTP کامیابی سے آپ کی ای میل پر بھیج دیا گیا ہے۔" };

  } catch (error) {
    console.error("Error sending Email OTP:", error);
    return { success: false, message: "OTP بھیجنے میں ناکامی۔ بعد میں کوشش کریں۔" };
  }
}

/**
 * 2. OTP کو وریفائی کرنے کا لاجک (5 Min Expiry, 3 Attempts Max)
 */
export async function verifyOTP(userId, enteredOTP, actionType) {
  try {
    const otpRef = doc(db, "otp_sessions", userId);
    const otpSnap = await getDoc(otpRef);

    if (!otpSnap.exists()) {
      return { success: false, message: "کوئی ایکٹیو OTP سیشن نہیں ملا۔ دوبارہ منگوائیں۔" };
    }

    const session = otpSnap.data();

    // Check Action Type Match
    if (session.actionType !== actionType) {
      return { success: false, message: "غیر معتبر OTP کی درخواست۔" };
    }

    // Check Expiry (5 Minutes Limit)
    if (Date.now() > session.expiresAt) {
      await deleteDoc(otpRef); // Expire Session
      return { success: false, message: "OTP کی میعاد ختم (Expire) ہو چکی ہے۔ نیا OTP منگوائیں۔" };
    }

    // Check Max Attempts (3 Attempts Allowed)
    if (session.attempts >= 3) {
      await deleteDoc(otpRef); // Invalidate Session
      return { success: false, message: "آپ غلط OTP درج کرنے کی حد (3 بار) عبور کر چکے ہیں۔ نیا OTP منگوائیں۔" };
    }

    // Hash the Entered OTP to Compare
    const enteredHash = await hashOTP(enteredOTP);

    if (enteredHash === session.otpHash) {
      // Success! Immediately invalidate/delete session to prevent reuse
      await deleteDoc(otpRef);
      return { success: true, message: "تصدیق کامیاب ہو گئی۔" };
    } else {
      // Increment Attempt Counter
      const newAttempts = session.attempts + 1;
      if (newAttempts >= 3) {
        await deleteDoc(otpRef);
        return { success: false, message: "غلط OTP! آپ کی 3 کوششیں مکمل ہو گئیں، سیشن ختم کر دیا گیا ہے۔" };
      } else {
        await setDoc(otpRef, { attempts: newAttempts }, { merge: true });
        return { success: false, message: `غلط OTP! آپ کے پاس باقی ${3 - newAttempts} کوششیں رہ گئی ہیں۔` };
      }
    }

  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { success: false, message: "تصدیق کے دوران ایرر۔" };
  }
}
