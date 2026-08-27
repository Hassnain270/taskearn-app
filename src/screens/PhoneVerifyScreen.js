import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import {
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCustomToken,
  linkWithCredential,
  reauthenticateWithCredential,
  updateEmail
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from '../firebaseConfig';

const functionsInstance = getFunctions();

// This page is only ever reached for two purposes now:
// - "email_change": verifies the user's CURRENT registered phone before
//   changing their email (Security screen).
// - "forgot_password": the rare phone fallback in Login > Forgot Password,
//   only offered after 5 failed email attempts.
// ("phone_change" was removed — Phone Number changes now use Email OTP
// only, no SMS at all, to conserve the monthly SMS quota.)

const postResultToApp = (result) => {
  if (typeof window !== 'undefined' && window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(result));
  }
};

export default function PhoneVerifyScreen({ route }) {
  const params = route?.params || {};
  const { purpose, token, phone, newEmail } = params;

  const [status, setStatus] = useState('signing_in');
  const [errorMsg, setErrorMsg] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const verifierRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        if (!token) {
          setStatus('error');
          setErrorMsg('Missing session token. Please go back and try again.');
          return;
        }
        await signInWithCustomToken(auth, token);
        setStatus('ready');
      } catch (err) {
        setStatus('error');
        setErrorMsg('Could not start a secure session. Please try again from the app.');
      }
    };
    init();
  }, [token]);

  useEffect(() => {
    if (status === 'ready') {
      sendOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const sendOtp = async () => {
    setStatus('sending');
    setErrorMsg('');
    try {
      if (!verifierRef.current) {
        verifierRef.current = new RecaptchaVerifier(auth, 'phone-verify-recaptcha', { size: 'invisible' });
      }
      const phoneProvider = new PhoneAuthProvider(auth);
      const vId = await phoneProvider.verifyPhoneNumber(phone, verifierRef.current);
      setVerificationId(vId);
      setStatus('awaiting_code');
    } catch (err) {
      setStatus('ready');
      setErrorMsg(err.message || 'Failed to send the code.');
    }
  };

  const verifyAndBindPhoneCredential = async (credential) => {
    const user = auth.currentUser;
    try {
      await linkWithCredential(user, credential);
    } catch (linkErr) {
      if (linkErr.code === 'auth/provider-already-linked') {
        await reauthenticateWithCredential(user, credential);
      } else if (
        linkErr.code === 'auth/credential-already-in-use' ||
        linkErr.code === 'auth/phone-number-already-exists' ||
        linkErr.code === 'auth/account-exists-with-different-credential'
      ) {
        throw new Error('This phone number is already associated with a different account.');
      } else {
        throw linkErr;
      }
    }
  };

  const handleVerify = async () => {
    if (otpCode.length !== 6) {
      setErrorMsg('Please enter the 6-digit code.');
      return;
    }
    setStatus('verifying');
    setErrorMsg('');
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otpCode);

      if (purpose === 'forgot_password') {
        await verifyAndBindPhoneCredential(credential);
        const issueToken = httpsCallable(functionsInstance, 'issuePasswordResetTokenForPhone');
        const res = await issueToken();
        setStatus('done');
        postResultToApp({ success: true, purpose, resetToken: res.data.resetToken });
        return;
      }

      if (purpose === 'email_change') {
        await verifyAndBindPhoneCredential(credential);
        const user = auth.currentUser;
        await updateEmail(user, newEmail);
        await updateDoc(doc(db, 'users', user.uid), { email: newEmail });
        setStatus('done');
        postResultToApp({ success: true, purpose });
        return;
      }

      throw new Error('Unknown verification purpose.');
    } catch (err) {
      setStatus('awaiting_code');
      if (err.code === 'auth/invalid-verification-code') {
        setErrorMsg('Incorrect code. Please try again.');
      } else if (err.code === 'auth/code-expired') {
        setErrorMsg('This code has expired. Please request a new one.');
      } else {
        setErrorMsg(err.message || 'Verification failed.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0E14" />
      <View style={styles.content}>
        <Text style={styles.title}>Phone Verification</Text>

        {(status === 'signing_in' || status === 'sending') && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.subText}>
              {status === 'signing_in' ? 'Preparing secure session...' : `Sending code to ${phone}...`}
            </Text>
          </View>
        )}

        {status === 'awaiting_code' && (
          <View style={styles.centerBox}>
            <Text style={styles.subText}>Enter the 6-digit code sent to {phone}</Text>
            <TextInput
              style={styles.input}
              placeholder="123456"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              maxLength={6}
              value={otpCode}
              onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, ''))}
            />
            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
            <TouchableOpacity style={styles.button} onPress={handleVerify}>
              <Text style={styles.buttonText}>Verify</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'verifying' && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.subText}>Verifying...</Text>
          </View>
        )}

        {status === 'done' && (
          <View style={styles.centerBox}>
            <Text style={styles.successText}>✓ Verified successfully</Text>
            <Text style={styles.subText}>You can close this window.</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View nativeID="phone-verify-recaptcha" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 24 },
  centerBox: { alignItems: 'center', width: '100%' },
  subText: { color: '#94A3B8', fontSize: 14, marginTop: 12, textAlign: 'center' },
  input: { backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D', borderRadius: 12, color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', letterSpacing: 8, textAlign: 'center', width: 200, height: 56, marginTop: 20 },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 12, textAlign: 'center' },
  button: { backgroundColor: '#3B82F6', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', width: 200, marginTop: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  successText: { color: '#22C55E', fontSize: 18, fontWeight: 'bold' }
});