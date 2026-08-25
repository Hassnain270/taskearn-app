import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { sendEmailOTP, verifyOTP } from '../services/otpService';
import { sendSMSOTP, verifySMSOTP } from '../services/phoneAuthService';

const functionsInstance = getFunctions();

// Cross-Platform Alert Function
const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      const confirmAction = window.confirm(`${title}\n\n${message}`);
      if (confirmAction) {
        const primaryBtn = buttons.find(b => b.onPress);
        if (primaryBtn) primaryBtn.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

// Cross-Platform Storage Helper
const setSecureItem = async (key, value) => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getSecureItem = async (key) => {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [forgetModalVisible, setForgetModalVisible] = useState(false);
  const [forgetStep, setForgetStep] = useState(1);
  const [recoverUsername, setRecoverUsername] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);

  const [userData, setUserData] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState('email');
  const [verificationId, setVerificationId] = useState(null);
  const recaptchaVerifier = useRef(null);

  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const intervalRef = useRef(null);

  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    const fetchDeviceId = async () => {
      let id = 'web-browser-device';
      if (Platform.OS === 'android') {
        id = Application.androidId || 'android-device';
      } else if (Platform.OS === 'ios') {
        const iosId = await Application.getIosIdForVendorAsync();
        id = iosId || 'ios-device';
      }
      setDeviceId(id);
    };
    fetchDeviceId();
  }, []);

  useEffect(() => {
    if (forgetModalVisible && forgetStep === 2) {
      startResendTimer();
    } else {
      stopResendTimer();
    }
    return () => stopResendTimer();
  }, [forgetModalVisible, forgetStep]);

  const startResendTimer = () => {
    stopResendTimer();
    setTimer(60);
    setCanResend(false);
    intervalRef.current = setInterval(() => {
      setTimer((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(intervalRef.current);
          setCanResend(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  const stopResendTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const verifyPasskeyHardware = async () => {
    if (Platform.OS === 'web') return true; // Web par passkey optional bypass

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        showAlert(
          "Passkey Security Required",
          "Please enable screen lock or biometric security in your device settings to proceed with Passkey."
        );
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authorize Passkey Security",
        fallbackLabel: "Use Device PIN",
        cancelLabel: "Cancel",
        disableDeviceFallback: false
      });

      return result.success;
    } catch (error) {
      showAlert("Authentication Error", "Passkey verification failed.");
      return false;
    }
  };

  const navigateToHome = (params = {}) => {
    if (navigation) {
      if (typeof navigation.reset === 'function') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home', params: params }],
        });
      } else if (typeof navigation.replace === 'function') {
        navigation.replace('Home', params);
      } else if (typeof navigation.navigate === 'function') {
        navigation.navigate('Home', params);
      }
    }
  };

  // Looks up the account's email (and other non-sensitive metadata) via a
  // Cloud Function, since this must run BEFORE the user is signed in — the
  // client cannot query other users' Firestore documents directly.
  const handleLogin = async () => {
    const inputIdentifier = username.trim();
    const cleanPassword = password.trim();

    if (!inputIdentifier || !cleanPassword) {
      showAlert("Login Failed", "Invalid username or password");
      return;
    }

    setIsLoading(true);

    try {
      const resolveIdentifier = httpsCallable(functionsInstance, 'resolveLoginIdentifier');
      let resolved;
      try {
        const res = await resolveIdentifier({ identifier: inputIdentifier });
        resolved = res.data;
      } catch (resolveErr) {
        setIsLoading(false);
        showAlert("Login Failed", "Invalid username or password");
        return;
      }

      const userEmail = resolved?.email;
      if (!userEmail) {
        setIsLoading(false);
        showAlert("Login Failed", "Invalid username or password");
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, userEmail, cleanPassword);
      const uid = userCredential.user.uid;

      // Safe cross-platform storage
      await setSecureItem(`passkey_email_${uid}`, userEmail);
      await setSecureItem(`passkey_pass_${uid}`, cleanPassword);

      // Now that we're authenticated as this exact uid, we're allowed to
      // read our own document directly.
      const userDocRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userDocRef);
      let existingData = docSnap.exists() ? { uid, ...docSnap.data() } : { uid };

      if (existingData?.username) {
        await setSecureItem(`passkey_user_${existingData.username}`, uid);
      }

      if (!existingData?.passkeyRegistered && Platform.OS !== 'web') {
        setIsLoading(false);
        showAlert(
          "Register Passkey Required",
          "First-time setup: You must add your device screen lock Passkey for account protection.",
          [
            {
              text: "Setup Passkey Now",
              onPress: async () => {
                setIsLoading(true);
                const isVerified = await verifyPasskeyHardware();
                if (isVerified) {
                  await updateDoc(userDocRef, {
                    passkeyRegistered: true,
                    registeredDeviceId: deviceId
                  });
                  setIsLoading(false);
                  showAlert("Passkey Bound", "Your device Passkey has been successfully registered!");
                  navigateToHome({ userData: { ...existingData, passkeyRegistered: true, registeredDeviceId: deviceId } });
                } else {
                  setIsLoading(false);
                  showAlert("Setup Cancelled", "Passkey enrollment is compulsory to continue.");
                }
              }
            }
          ]
        );
      } else {
        setIsLoading(false);
        navigateToHome({ userData: existingData });
      }

    } catch (error) {
      setIsLoading(false);
      showAlert("Login Failed", error.message || "Invalid username or password");
    }
  };

  const handleLoginWithPasskey = async () => {
    const inputIdentifier = username.trim();

    if (!inputIdentifier) {
      showAlert("Passkey Login", "Please enter your username first.");
      return;
    }

    setIsLoading(true);

    try {
      const resolveIdentifier = httpsCallable(functionsInstance, 'resolveLoginIdentifier');
      let resolved;
      try {
        const res = await resolveIdentifier({ identifier: inputIdentifier });
        resolved = res.data;
      } catch (resolveErr) {
        setIsLoading(false);
        showAlert("Passkey Failed", "User not found.");
        return;
      }

      const targetUid = resolved?.uid;
      if (!targetUid) {
        setIsLoading(false);
        showAlert("Passkey Failed", "User not found.");
        return;
      }

      if (!resolved.passkeyRegistered) {
        setIsLoading(false);
        showAlert("Passkey Not Configured", "Please log in with your password first to bind your Passkey.");
        return;
      }

      if (resolved.registeredDeviceId && deviceId && resolved.registeredDeviceId !== deviceId && Platform.OS !== 'web') {
        setIsLoading(false);
        showAlert(
          "Unauthorized Device",
          "Passkey mismatch! Your registered Passkey is bound to another device. Please login with Password."
        );
        return;
      }

      const isVerified = await verifyPasskeyHardware();
      if (isVerified) {
        const savedEmail = await getSecureItem(`passkey_email_${targetUid}`);
        const savedPass = await getSecureItem(`passkey_pass_${targetUid}`);

        if (!savedEmail || !savedPass) {
          setIsLoading(false);
          showAlert(
            "Passkey Setup Required",
            "Please log in with your password once on this device to activate Passkey authentication."
          );
          return;
        }

        await signInWithEmailAndPassword(auth, savedEmail, savedPass);

        const freshSnap = await getDoc(doc(db, 'users', targetUid));
        const freshData = freshSnap.exists() ? freshSnap.data() : {};
        const fullProfileData = { uid: targetUid, id: targetUid, ...freshData };

        setIsLoading(false);
        showAlert("Passkey Authorized", "Device authentication successful!");
        navigateToHome({ userData: fullProfileData });
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
      showAlert("Passkey Failed", "Unable to authenticate Passkey.");
    }
  };

  const handleVerifyUsername = async () => {
    const cleanUsername = recoverUsername.trim();
    if (!cleanUsername || cleanUsername.length < 5) {
      showAlert("Alert", "Username must be at least 6 characters.");
      return;
    }

    setIsResetLoading(true);

    try {
      const resolveIdentifier = httpsCallable(functionsInstance, 'resolveLoginIdentifier');
      let resolved;
      try {
        const res = await resolveIdentifier({ identifier: cleanUsername });
        resolved = res.data;
      } catch (resolveErr) {
        setIsResetLoading(false);
        showAlert("Error", "Username does not exist.");
        return;
      }

      const fetchedUserData = {
        uid: resolved.uid,
        username: resolved.username,
        email: resolved.email,
        phone: resolved.phone
      };

      setUserData(fetchedUserData);

      if (selectedChannel === 'email') {
        if (!fetchedUserData.email) {
          setIsResetLoading(false);
          showAlert("Error", "No registered email found for this user.");
          return;
        }

        const res = await sendEmailOTP(fetchedUserData.uid, fetchedUserData.email, "forgot_password");
        setIsResetLoading(false);

        if (res.success) {
          showAlert("OTP Sent", res.message);
          setForgetStep(2);
        } else {
          showAlert("Error", res.message);
        }
      } else {
        if (!fetchedUserData.phone) {
          setIsResetLoading(false);
          showAlert("Error", "No registered phone number found for this user.");
          return;
        }

        const res = await sendSMSOTP(fetchedUserData.phone, recaptchaVerifier);
        setIsResetLoading(false);

        if (res.success) {
          setVerificationId(res.verificationId);
          showAlert("OTP Sent", res.message);
          setForgetStep(2);
        } else {
          showAlert("Error", res.message);
        }
      }

    } catch (error) {
      setIsResetLoading(false);
      showAlert("Error", "Failed to send code. Please try again.");
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || !userData) return;

    setIsResetLoading(true);
    if (selectedChannel === 'email') {
      const res = await sendEmailOTP(userData.uid, userData.email, "forgot_password");
      setIsResetLoading(false);
      if (res.success) {
        showAlert("OTP Resent", res.message);
        startResendTimer();
      } else {
        showAlert("Error", res.message);
      }
    } else {
      const res = await sendSMSOTP(userData.phone, recaptchaVerifier);
      setIsResetLoading(false);
      if (res.success) {
        setVerificationId(res.verificationId);
        showAlert("OTP Resent", res.message);
        startResendTimer();
      } else {
        showAlert("Error", res.message);
      }
    }
  };

  const handleVerifyOTP = async () => {
    if (otpInput.length !== 6) {
      showAlert("Alert", "OTP code must be 6 digits.");
      return;
    }

    setIsResetLoading(true);

    if (selectedChannel === 'email') {
      const res = await verifyOTP(userData.uid, otpInput, "forgot_password");
      setIsResetLoading(false);

      if (res.success) {
        setForgetStep(3);
      } else {
        showAlert("Error", res.message);
      }
    } else {
      const res = await verifySMSOTP(verificationId, otpInput);
      setIsResetLoading(false);

      if (res.success) {
        setForgetStep(3);
      } else {
        showAlert("Error", res.message);
      }
    }
  };

  const handleBypassViaPasskey = async () => {
    if (!userData) return;

    if (!userData.passkeyRegistered) {
      showAlert("Passkey Unavailable", "Passkey was never configured on this account. Please verify via OTP.");
      return;
    }

    if (userData.registeredDeviceId !== deviceId && Platform.OS !== 'web') {
      showAlert(
        "Unauthorized Device Passkey",
        "Your account Passkey is bound to a different mobile device. Cannot reset password using this device's Passkey."
      );
      return;
    }

    const isVerified = await verifyPasskeyHardware();
    if (isVerified) {
      showAlert("Passkey Verified", "Device Passkey authorization successful!");
      setForgetStep(3);
    }
  };

  const handleSaveNewPassword = async () => {
    if (newPassword.length < 6) {
      showAlert("Alert", "Password must be at least 6 characters.");
      return;
    }

    setIsResetLoading(true);

    try {
      const resetPasswordFunc = httpsCallable(functionsInstance, 'resetUserPassword');
      await resetPasswordFunc({ uid: userData.uid, newPassword: newPassword });

      if (userData?.uid) {
        await setSecureItem(`passkey_pass_${userData.uid}`, newPassword);
      }

      setIsResetLoading(false);
      showAlert("Success", "Your password has been changed successfully.");
      resetModal();
    } catch (error) {
      setIsResetLoading(false);
      showAlert("Error", "Failed to update password. Please try again.");
    }
  };

  const resetModal = () => {
    setForgetModalVisible(false);
    setForgetStep(1);
    setRecoverUsername('');
    setOtpInput('');
    setNewPassword('');
    setUserData(null);
    setSelectedChannel('email');
    setVerificationId(null);
    setIsResetLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.logoText}>TaskEarn</Text>
          <Text style={styles.subtitleText}>Secure Task & Financial Platform</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Username</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="account-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor="#94A3B8"
              value={username}
              onChangeText={(text) => setUsername(text)}
              maxLength={40}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="lock-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => setPassword(text)}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <MaterialCommunityIcons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.forgetContainer}
          onPress={() => setForgetModalVisible(true)}
        >
          <Text style={styles.forgetText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginBtn, isLoading && styles.disabledBtn]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.loginBtnText}>Login</Text>
          )}
        </TouchableOpacity>

        {Platform.OS !== 'web' && (
  <TouchableOpacity
    style={styles.passkeyLoginBtn}
    onPress={handleLoginWithPasskey}
    disabled={isLoading}
  >
    <MaterialCommunityIcons name="fingerprint" size={22} color="#3B82F6" />
    <Text style={styles.passkeyLoginBtnText}>Login with Passkey</Text>
  </TouchableOpacity>
)}

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Register Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={forgetModalVisible}
        onRequestClose={resetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>

            {forgetStep === 1 && (
              <View style={styles.modalStepWrapper}>
                <Text style={styles.modalLabel}>Enter Username</Text>
                <View style={styles.modalInputWrapper}>
                  <MaterialCommunityIcons name="account-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Username"
                    placeholderTextColor="#94A3B8"
                    value={recoverUsername}
                    onChangeText={(text) => setRecoverUsername(text)}
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Text style={styles.modalLabel}>Send OTP via:</Text>
                <View style={styles.channelRow}>
                  <TouchableOpacity
                    style={[styles.channelBtn, selectedChannel === 'email' && styles.channelBtnActive]}
                    onPress={() => setSelectedChannel('email')}
                  >
                    <MaterialCommunityIcons
                      name="email-outline"
                      size={18}
                      color={selectedChannel === 'email' ? '#3B82F6' : '#64748B'}
                    />
                    <Text style={[styles.channelText, selectedChannel === 'email' && styles.channelTextActive]}>Email</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.channelBtn, selectedChannel === 'phone' && styles.channelBtnActive]}
                    onPress={() => setSelectedChannel('phone')}
                  >
                    <MaterialCommunityIcons
                      name="cellphone"
                      size={18}
                      color={selectedChannel === 'phone' ? '#3B82F6' : '#64748B'}
                    />
                    <Text style={[styles.channelText, selectedChannel === 'phone' && styles.channelTextActive]}>Phone</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={[styles.modalBtn, isResetLoading && styles.disabledBtn]} 
                  onPress={handleVerifyUsername}
                  disabled={isResetLoading}
                >
                  {isResetLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalBtnText}>Send OTP Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {forgetStep === 2 && (
              <View style={styles.modalStepWrapper}>
                <Text style={styles.modalLabel}>Enter 6-Digit OTP</Text>
                <View style={styles.modalInputWrapper}>
                  <MaterialCommunityIcons name="cellphone-key" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Verification Code"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otpInput}
                    onChangeText={(text) => setOtpInput(text.replace(/[^0-9]/g, ''))}
                  />
                </View>

                <View style={styles.timerContainer}>
                  {canResend ? (
                    <TouchableOpacity onPress={handleResendOTP} disabled={isResetLoading}>
                      <Text style={styles.resendActiveText}>Resend OTP</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.resendDisabledText}>Resend OTP in 0:{timer < 10 ? `0${timer}` : timer}</Text>
                  )}
                </View>

                <TouchableOpacity 
                  style={[styles.modalBtn, isResetLoading && styles.disabledBtn]} 
                  onPress={handleVerifyOTP}
                  disabled={isResetLoading}
                >
                  {isResetLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalBtnText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.passkeyAltBtn}
                  onPress={handleBypassViaPasskey}
                  disabled={isResetLoading}
                >
                  <MaterialCommunityIcons name="shield-key-outline" size={18} color="#059669" />
                  <Text style={styles.passkeyAltBtnText}>Didn't get OTP? Reset via Passkey</Text>
                </TouchableOpacity>
              </View>
            )}

            {forgetStep === 3 && (
              <View style={styles.modalStepWrapper}>
                <Text style={styles.modalLabel}>New Password</Text>
                <View style={styles.modalInputWrapper}>
                  <MaterialCommunityIcons name="lock-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="New Password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={(text) => setNewPassword(text)}
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                    <MaterialCommunityIcons
                      name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={[styles.modalBtn, isResetLoading && styles.disabledBtn]} 
                  onPress={handleSaveNewPassword}
                  disabled={isResetLoading}
                >
                  {isResetLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalBtnText}>Save Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={resetModal}
              disabled={isResetLoading}
            >
              <Text style={styles.closeModalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoImage: { width: 80, height: 80, borderRadius: 18 },
  logoText: { fontSize: 28, fontWeight: 'bold', color: '#1E293B', marginTop: 10 },
  subtitleText: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '500' },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, height: 50 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#1E293B', fontSize: 14, fontWeight: '500', height: '100%' },
  eyeIcon: { padding: 4 },
  forgetContainer: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgetText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  loginBtn: { backgroundColor: '#3B82F6', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 2, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4 },
  passkeyLoginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#3B82F6', backgroundColor: '#EFF6FF', marginTop: 12, gap: 8 },
  passkeyLoginBtnText: { color: '#3B82F6', fontSize: 15, fontWeight: '700' },
  disabledBtn: { backgroundColor: '#93C5FD' },
  loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  registerLink: { fontSize: 14, color: '#3B82F6', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '88%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 20 },
  modalStepWrapper: { width: '100%' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  modalInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, height: 50, marginBottom: 16 },
  modalInput: { flex: 1, color: '#1E293B', fontSize: 14, fontWeight: '500', height: '100%' },
  channelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  channelBtn: { flex: 0.48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingVertical: 10 },
  channelBtnActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  channelText: { fontSize: 13, fontWeight: '600', color: '#64748B', marginLeft: 6 },
  channelTextActive: { color: '#3B82F6' },
  timerContainer: { alignItems: 'center', marginBottom: 16, marginTop: -4 },
  resendActiveText: { color: '#3B82F6', fontSize: 14, fontWeight: '700' },
  resendDisabledText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  modalBtn: { backgroundColor: '#3B82F6', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', width: '100%', elevation: 1 },
  modalBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  passkeyAltBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingVertical: 10, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 10, gap: 6 },
  passkeyAltBtnText: { color: '#059669', fontSize: 13, fontWeight: '700' },
  closeModalBtn: { marginTop: 16, padding: 4 },
  closeModalBtnText: { color: '#64748B', fontSize: 14, fontWeight: '600' }
});