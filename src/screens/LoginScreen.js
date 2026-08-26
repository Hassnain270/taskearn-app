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
  Image,
  KeyboardAvoidingView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functionsInstance = getFunctions();

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

  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const intervalRef = useRef(null);

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

      const userDocRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userDocRef);
      const existingData = docSnap.exists() ? { uid, ...docSnap.data() } : { uid };

      setIsLoading(false);
      navigateToHome({ userData: existingData });

    } catch (error) {
      setIsLoading(false);
      showAlert("Login Failed", error.message || "Invalid username or password");
    }
  };

  // Forgot password is email-OTP only — phone/SMS OTP was never activated
  // on the backend, so there's no second channel to choose between.
  const handleGetOTP = async () => {
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

      if (!resolved.email) {
        setIsResetLoading(false);
        showAlert("Error", "No registered email found for this user.");
        return;
      }

      setUserData({ uid: resolved.uid, username: resolved.username, email: resolved.email });

      const sendOtp = httpsCallable(functionsInstance, 'sendEmailOTP');
      await sendOtp({ purpose: 'FORGOT_PASSWORD', emailInput: resolved.email });

      setIsResetLoading(false);
      setForgetStep(2);
    } catch (error) {
      setIsResetLoading(false);
      showAlert("Error", error.message || "Failed to send code. Please try again.");
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || !userData) return;

    setIsResetLoading(true);
    try {
      const sendOtp = httpsCallable(functionsInstance, 'sendEmailOTP');
      await sendOtp({ purpose: 'FORGOT_PASSWORD', emailInput: userData.email });
      setIsResetLoading(false);
      startResendTimer();
      showAlert("OTP Resent", "A new verification code has been sent to your email.");
    } catch (error) {
      setIsResetLoading(false);
      showAlert("Error", error.message || "Failed to resend the code.");
    }
  };

  const handleVerifyOTP = async () => {
    if (otpInput.length !== 6) {
      showAlert("Alert", "OTP code must be 6 digits.");
      return;
    }

    setIsResetLoading(true);
    try {
      const verifyOtp = httpsCallable(functionsInstance, 'verifyEmailOTP');
      await verifyOtp({ email: userData.email, code: otpInput, purpose: 'FORGOT_PASSWORD' });
      setIsResetLoading(false);
      setForgetStep(3);
    } catch (error) {
      setIsResetLoading(false);
      showAlert("Error", error.message || "Invalid or expired code.");
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

                  <TouchableOpacity 
                    style={[styles.modalBtn, isResetLoading && styles.disabledBtn]} 
                    onPress={handleGetOTP}
                    disabled={isResetLoading}
                  >
                    {isResetLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalBtnText}>Get OTP</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {forgetStep === 2 && (
                <View style={styles.modalStepWrapper}>
                  <Text style={styles.modalLabel}>
                    Enter the 6-digit code sent to {userData?.email}
                  </Text>
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
        </KeyboardAvoidingView>
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
  timerContainer: { alignItems: 'center', marginBottom: 16, marginTop: -4 },
  resendActiveText: { color: '#3B82F6', fontSize: 14, fontWeight: '700' },
  resendDisabledText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  modalBtn: { backgroundColor: '#3B82F6', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', width: '100%', elevation: 1 },
  modalBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  closeModalBtn: { marginTop: 16, padding: 4 },
  closeModalBtnText: { color: '#64748B', fontSize: 14, fontWeight: '600' }
});