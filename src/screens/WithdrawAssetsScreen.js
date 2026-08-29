import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

const functionsInstance = getFunctions();

const VIP_TIERS = [
  { id: 10, minCapital: 20000 },
  { id: 9,  minCapital: 10000 },
  { id: 8,  minCapital: 5000 },
  { id: 7,  minCapital: 3000 },
  { id: 6,  minCapital: 1500 },
  { id: 5,  minCapital: 1000 },
  { id: 4,  minCapital: 500 },
  { id: 3,  minCapital: 300 },
  { id: 2,  minCapital: 150 },
  { id: 1,  minCapital: 70 },
];

const calculateVipLockedCapital = (balance) => {
  for (const tier of VIP_TIERS) {
    if (balance >= tier.minCapital) return tier.minCapital;
  }
  return 0;
};

export default function WithdrawAssetsScreen({ navigation, route }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [incomingBalance, setIncomingBalance] = useState(route?.params?.totalBalance || 0.00);
  const [completedTaskCount, setCompletedTaskCount] = useState(route?.params?.taskCount || 0);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletNetwork, setWalletNetwork] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPendingWithdrawal, setHasPendingWithdrawal] = useState(false);

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const otpIntervalRef = useRef(null);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.totalBalance !== undefined) setIncomingBalance(data.totalBalance);
          if (data.taskCount !== undefined) setCompletedTaskCount(data.taskCount);
          if (data.walletAddress) {
            setWalletAddress(data.walletAddress);
            setWalletNetwork(data.walletNetwork || "TRC20");
          } else {
            setWalletAddress("");
            setWalletNetwork("");
          }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const pendingQuery = query(
        collection(db, "withdrawals"),
        where("userId", "==", currentUser.uid),
        where("status", "==", "pending")
      );
      const unsubscribe = onSnapshot(pendingQuery, (snap) => {
        setHasPendingWithdrawal(!snap.empty);
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    return () => stopOtpTimer();
  }, []);

  const startOtpTimer = () => {
    stopOtpTimer();
    setOtpTimer(60);
    setCanResendOtp(false);
    otpIntervalRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(otpIntervalRef.current);
          setCanResendOtp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopOtpTimer = () => {
    if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
  };

  const vipLockedCapital = calculateVipLockedCapital(incomingBalance);
  const withdrawableBalance = incomingBalance > vipLockedCapital ? parseFloat((incomingBalance - vipLockedCapital).toFixed(2)) : 0.00;

  const currentStyles = isDarkMode ? darkStyles : lightStyles;
  const parsedAmount = parseFloat(withdrawAmount) || 0;
  const hasWallet = walletAddress.trim() !== "";

  const operationalFee = parsedAmount > 0 ? Number((parsedAmount * 0.07).toFixed(2)) : 0;
  const netPayoutPreview = parsedAmount > 0 ? Number((parsedAmount - operationalFee).toFixed(2)) : 0;

  const isTaskCompleted = completedTaskCount >= 5;
  const isValidAmount = parsedAmount >= 15 && parsedAmount <= withdrawableBalance;
  const isButtonEnabled = hasWallet && isTaskCompleted && isValidAmount && !loading;

  const executeWithdrawal = async () => {
    const finalPayout = netPayoutPreview;

    setLoading(true);
    try {
      const requestWithdrawal = httpsCallable(functionsInstance, 'requestWithdrawal');
      const res = await requestWithdrawal({
        amount: parsedAmount,
        fee: operationalFee,
        netPayout: finalPayout,
        walletAddress: walletAddress
      });

      setOtpModalVisible(false);
      stopOtpTimer();
      setOtpCode('');

      Alert.alert(
        "Payout Request Received",
        `Your withdrawal request has been verified & submitted successfully.\n\nNet Settlement: $${res.data?.netPayout ? res.data.netPayout.toFixed(2) : finalPayout.toFixed(2)}\n\nProcessing timeline is 0 to 48 hours. Thank you for your cooperation.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to process withdrawal request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawInitiate = async () => {
    if (!hasWallet) {
      Alert.alert(
        "Wallet Address Required",
        "You have not configured a wallet address yet. Please navigate to Me > Settlement Config to securely save your wallet address before initiating a withdrawal."
      );
      return;
    }

    if (!isTaskCompleted) {
      Alert.alert(
        "Tasks Incomplete",
        "You must complete at least 5 tasks before submitting a withdrawal request. Please complete your daily tasks first."
      );
      return;
    }

    if (parsedAmount < 15) {
      Alert.alert("Invalid Amount", "Minimum liquidity settlement threshold is $15.00 USDT.");
      return;
    }

    if (parsedAmount > withdrawableBalance) {
      Alert.alert("Insufficient Balance", "Requested amount exceeds available withdrawable profit limits.");
      return;
    }

    if (hasPendingWithdrawal) {
      Alert.alert(
        "Withdrawal Already Pending",
        "You already have a pending withdrawal request. Please wait until it is completed before submitting another withdrawal request."
      );
      return;
    }

    await sendWithdrawOtp();
  };

  const sendWithdrawOtp = async () => {
    setOtpSending(true);
    try {
      const sendOtp = httpsCallable(functionsInstance, 'requestWithdrawalOtp');
      await sendOtp();
      setOtpCode('');
      setOtpModalVisible(true);
      startOtpTimer();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to send verification code.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleResendWithdrawOtp = async () => {
    if (!canResendOtp) return;
    setOtpSending(true);
    try {
      const sendOtp = httpsCallable(functionsInstance, 'requestWithdrawalOtp');
      await sendOtp();
      startOtpTimer();
      Alert.alert("Code Resent", "A new verification code has been sent to your registered email.");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to resend the code.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyWithdrawOtp = async () => {
    if (otpCode.length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit code sent to your email.");
      return;
    }

    setOtpVerifying(true);
    try {
      const verifyOtp = httpsCallable(functionsInstance, 'verifyEmailOTP');
      await verifyOtp({ email: auth.currentUser?.email, code: otpCode, purpose: 'WITHDRAWAL' });

      await executeWithdrawal();
    } catch (err) {
      Alert.alert("Verification Failed", err.message || "The code entered is invalid or has expired.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleOtpCancel = () => {
    setOtpModalVisible(false);
    setOtpCode('');
    stopOtpTimer();
  };

  const handleWalletBoxPress = () => {
    if (hasWallet) return;
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Settlement');
    }
  };

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#0B0E14" : "#FFFFFF"}
      />

      <View style={currentStyles.header}>
        <TouchableOpacity style={currentStyles.backButton} onPress={() => { if (navigation) navigation.goBack(); }}>
          <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Withdraw Assets</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

          <View style={currentStyles.balanceCard}>
            <View style={styles.balanceColumn}>
              <Text style={styles.balanceLabel}>WITHDRAWABLE PROFIT</Text>
              <Text style={currentStyles.balanceValue}>${withdrawableBalance.toFixed(2)}</Text>
            </View>
            <View style={styles.balanceDividerLine} />
            <View style={styles.balanceColumn}>
              <Text style={styles.balanceLabelLocked}>VIP STAKE LOCKED</Text>
              <Text style={styles.balanceValueLocked}>${vipLockedCapital.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              DESTINATION WALLET ({hasWallet ? walletNetwork : 'TRC20 / BEP20'})
            </Text>
            <TouchableOpacity
              activeOpacity={hasWallet ? 1 : 0.7}
              onPress={handleWalletBoxPress}
              style={[currentStyles.disabledInputWrapper, !hasWallet && { borderColor: '#EF4444', backgroundColor: isDarkMode ? '#241215' : '#FEF2F2' }]}
            >
              <MaterialCommunityIcons
                name="wallet"
                size={18}
                color={!hasWallet ? "#EF4444" : (isDarkMode ? "#484F58" : "#94A3B8")}
                style={{ marginRight: 10 }}
              />
              <Text
                style={[currentStyles.disabledInputText, !hasWallet && { color: '#EF4444', fontWeight: '700' }]}
                numberOfLines={1}
              >
                {hasWallet ? walletAddress : "No Wallet Configured — Tap to Add"}
              </Text>
              {hasWallet ? (
                <Feather name="lock" size={14} color="#10B981" style={{ marginLeft: 'auto' }} />
              ) : (
                <Feather name="chevron-right" size={16} color="#EF4444" style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PAYOUT AMOUNT (USDT)</Text>
            <TextInput
              style={currentStyles.textInput}
              placeholder="Minimum $15.00"
              placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {parsedAmount > 0 && parsedAmount < 15 && (
              <Text style={styles.errorText}>Minimum liquidity settlement threshold is $15.00 USDT.</Text>
            )}
            {parsedAmount > withdrawableBalance && (
              <Text style={styles.errorText}>Requested amount exceeds available withdrawable profit limits.</Text>
            )}
            {!isTaskCompleted && (
              <Text style={styles.errorText}>You must complete 5 tasks before withdrawing (Current: {completedTaskCount}/5).</Text>
            )}
          </View>

          {parsedAmount > 0 && (
            <View style={currentStyles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Withdrawal Amount:</Text>
                <Text style={currentStyles.summaryValue}>${parsedAmount.toFixed(2)} USDT</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Handling Fee (7%):</Text>
                <Text style={styles.feeValue}>-${operationalFee.toFixed(2)} USDT</Text>
              </View>
              <View style={[styles.summaryRow, currentStyles.totalRowBorder]}>
                <Text style={styles.totalLabel}>You Will Receive:</Text>
                <Text style={currentStyles.totalValue}>${netPayoutPreview.toFixed(2)} USDT</Text>
              </View>
            </View>
          )}

          <View style={currentStyles.termsBox}>
            <View style={styles.termsHeaderRow}>
              <MaterialCommunityIcons name="text-box-check-outline" size={18} color={isDarkMode ? "#E2E8F0" : "#1E293B"} />
              <Text style={currentStyles.termsTitle}>REGULATORY COMPLIANCE & TERMS</Text>
            </View>

            <View style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Minimum liquidity settlement threshold is set at $15.00 USDT.</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>A 7% operational configuration fee applies to all external global node transfers.</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Verification and security clearance queue ranges from 0 to 48 hours for final settlement.</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Completion of at least 5 daily execution tasks is strictly mandatory prior to payout eligibility.</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Only fully verified daily execution commissions and profits are eligible for external withdrawal.</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>In the event of unexpected network congestion or protocol synchronization lag, delays may occur. Core participants are requested to maintain professional patience.</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[currentStyles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.actionButton, isButtonEnabled ? styles.activeButtonColor : currentStyles.disabledButtonColor]}
          onPress={handleWithdrawInitiate}
          disabled={!isButtonEnabled || loading || otpSending}
        >
          {(loading || otpSending) ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.actionButtonText}>Confirm Payout Request</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={otpModalVisible} transparent animationType="fade" onRequestClose={handleOtpCancel}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={currentStyles.otpModalCard}>
              <Text style={currentStyles.otpModalTitle}>Verify Your Identity</Text>
              <Text style={styles.otpModalSubtitle}>
                We sent a 6-digit code to {auth.currentUser?.email}. Enter it below to confirm this withdrawal request.
              </Text>
              <TextInput
                style={currentStyles.otpModalInput}
                placeholder="Enter 6-digit code"
                placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, ''))}
              />
              <View style={styles.otpTimerRow}>
                {canResendOtp ? (
                  <TouchableOpacity onPress={handleResendWithdrawOtp} disabled={otpSending}>
                    <Text style={styles.resendActiveText}>Resend Code</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.resendDisabledText}>Resend code in 0:{otpTimer < 10 ? `0${otpTimer}` : otpTimer}</Text>
                )}
              </View>
              <View style={styles.otpModalActions}>
                <TouchableOpacity style={styles.otpCancelBtn} onPress={handleOtpCancel} disabled={otpVerifying}>
                  <Text style={styles.otpCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.otpConfirmBtn} onPress={handleVerifyWithdrawOtp} disabled={otpVerifying}>
                  {otpVerifying ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.otpConfirmText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  balanceCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  balanceValue: { fontSize: 24, fontWeight: '800', color: '#2563EB', marginTop: 4 },
  disabledInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, height: 54, paddingHorizontal: 16 },
  disabledInputText: { color: '#64748B', fontSize: 13, fontWeight: '600', width: '80%' },
  textInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, height: 54, paddingHorizontal: 16, fontSize: 14, color: '#1E293B', fontWeight: '600' },
  summaryBox: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1', marginTop: 4, marginBottom: 20, gap: 10 },
  summaryValue: { color: '#1E293B', fontSize: 14, fontWeight: '600' },
  totalRowBorder: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10, marginTop: 4 },
  totalValue: { color: '#2563EB', fontSize: 16, fontWeight: 'bold' },
  termsBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginTop: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  termsTitle: { fontSize: 11, fontWeight: '700', color: '#1E293B', letterSpacing: 0.5 },
  footer: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  disabledButtonColor: { backgroundColor: '#CBD5E1' },
  otpModalCard: { width: '88%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20 },
  otpModalTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  otpModalInput: { backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, color: '#1E293B', fontSize: 16, fontWeight: '700', marginTop: 14, textAlign: 'center', letterSpacing: 4 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  balanceCard: { flexDirection: 'row', backgroundColor: '#161B22', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#21262D', alignItems: 'center' },
  balanceValue: { fontSize: 24, fontWeight: '800', color: '#3B82F6', marginTop: 4 },
  disabledInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D1117', borderWidth: 1, borderColor: '#21262D', borderRadius: 16, height: 54, paddingHorizontal: 16 },
  disabledInputText: { color: '#8B949E', fontSize: 13, fontWeight: '600', width: '80%' },
  textInput: { backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D', borderRadius: 16, height: 54, paddingHorizontal: 16, fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  summaryBox: { backgroundColor: '#161B22', borderRadius: 15, padding: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#334155', marginTop: 4, marginBottom: 20, gap: 10 },
  summaryValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  totalRowBorder: { borderTopWidth: 1, borderTopColor: '#21262D', paddingTop: 10, marginTop: 4 },
  totalValue: { color: '#60A5FA', fontSize: 16, fontWeight: 'bold' },
  termsBox: { backgroundColor: '#161B22', borderRadius: 16, padding: 18, marginTop: 10, borderWidth: 1, borderColor: '#21262D' },
  termsTitle: { fontSize: 11, fontWeight: '700', color: '#E2E8F0', letterSpacing: 0.5 },
  footer: { backgroundColor: '#161B22', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#21262D' },
  disabledButtonColor: { backgroundColor: '#21262D' },
  otpModalCard: { width: '88%', backgroundColor: '#161B22', borderRadius: 18, padding: 20 },
  otpModalTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  otpModalInput: { backgroundColor: '#0D1117', borderRadius: 10, borderWidth: 1, borderColor: '#21262D', padding: 12, color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 14, textAlign: 'center', letterSpacing: 4 }
});

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 40 },
  balanceColumn: { flex: 1, justifyContent: 'center' },
  balanceDividerLine: { width: 1, height: 40, backgroundColor: 'rgba(148, 163, 184, 0.2)', marginHorizontal: 15 },
  balanceLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  balanceLabelLocked: { fontSize: 9, fontWeight: '700', color: '#F87171', letterSpacing: 0.5 },
  balanceValueLocked: { fontSize: 22, fontWeight: '800', color: '#94A3B8', marginTop: 4 },
  inputGroup: { marginBottom: 24 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 10, paddingLeft: 4 },
  errorText: { fontSize: 11, color: '#EF4444', fontWeight: '600', marginTop: 8, paddingLeft: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#94A3B8', fontSize: 13 },
  feeValue: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  totalLabel: { fontSize: 14, fontWeight: 'bold', color: '#94A3B8' },
  termsHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  bulletRow: { flexDirection: 'row', marginBottom: 10, paddingHorizontal: 2 },
  bullet: { color: '#94A3B8', fontSize: 14, marginRight: 8, marginTop: -2 },
  bulletText: { flex: 1, fontSize: 11, color: '#94A3B8', lineHeight: 16, fontWeight: '500', textAlign: 'justify' },
  actionButton: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', width: '100%' },
  activeButtonColor: { backgroundColor: '#2563EB' },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  otpModalSubtitle: { fontSize: 12, color: '#94A3B8', fontWeight: '500', lineHeight: 17 },
  otpTimerRow: { alignItems: 'center', marginTop: 14, marginBottom: 6 },
  resendActiveText: { color: '#3B82F6', fontSize: 13, fontWeight: '700' },
  resendDisabledText: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },
  otpModalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  otpCancelBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(148,163,184,0.15)' },
  otpCancelText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  otpConfirmBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2563EB' },
  otpConfirmText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' }
});