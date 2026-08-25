import React, { useState, useEffect, useContext } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

const functionsInstance = getFunctions();

export default function SettlementConfigScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [network, setNetwork] = useState('TRC20');
  const [walletAddress, setWalletAddress] = useState('');
  const [isWalletSaved, setIsWalletSaved] = useState(false);
  const [isEditable, setIsEditable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  useEffect(() => {
    const fetchFirestoreWallet = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.walletAddress) {
              setWalletAddress(data.walletAddress);
              setNetwork(data.walletNetwork || 'TRC20');
              setIsWalletSaved(true);
              setIsEditable(false);
              setInitialLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.log("Error fetching wallet address:", err);
      }

      setWalletAddress('');
      setNetwork('TRC20');
      setIsWalletSaved(false);
      setIsEditable(true);
      setInitialLoading(false);
    };

    fetchFirestoreWallet();
  }, []);

  const validateAddress = (address, selectedNetwork) => {
    if (selectedNetwork === 'TRC20') {
      return /^T[a-zA-Z0-9]{33}$/.test(address);
    } else if (selectedNetwork === 'BEP20') {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    return false;
  };

  const handleWalletTextChange = (text) => {
    let filteredText = text.trim();
    if (network === 'TRC20') {
      filteredText = filteredText.replace(/[^a-zA-Z0-9]/g, '');
      if (filteredText.length <= 34) {
        setWalletAddress(filteredText);
      }
    } else if (network === 'BEP20') {
      filteredText = filteredText.replace(/[^a-fA-F0-9xX]/g, '');
      if (filteredText.length <= 42) {
        setWalletAddress(filteredText);
      }
    }
  };

  const verifyDeviceSecurity = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          "Passkey Required",
          "Please enable screen lock or biometric security in your device settings to proceed with wallet authorization."
        );
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to authorize wallet address change",
        fallbackLabel: "Use Screen Lock PIN",
        cancelLabel: "Cancel",
        disableDeviceFallback: false
      });

      return result.success;
    } catch (authError) {
      Alert.alert("Authentication Error", "Failed to verify device passkey.");
      return false;
    }
  };

  const handleActionClick = async () => {
    const trimmedAddress = walletAddress.trim();

    if (isWalletSaved && !isEditable) {
      const isVerified = await verifyDeviceSecurity();
      if (isVerified) {
        setIsEditable(true);
        setIsWalletSaved(false);
      } else {
        Alert.alert("Authorization Failed", "Device authentication was not completed.");
      }
      return;
    }

    if (!trimmedAddress) {
      Alert.alert('Error', 'Please enter a valid wallet address first.');
      return;
    }

    if (network === 'TRC20') {
      if (!trimmedAddress.startsWith('T')) {
        Alert.alert('Invalid TRC20 Address', 'TRC20 address must start with the letter "T".');
        return;
      }
      if (trimmedAddress.length !== 34) {
        Alert.alert('Invalid Length', `TRC20 address must be exactly 34 characters. (Entered: ${trimmedAddress.length})`);
        return;
      }
    } else if (network === 'BEP20') {
      if (!trimmedAddress.startsWith('0x') && !trimmedAddress.startsWith('0X')) {
        Alert.alert('Invalid BEP20 Address', 'BEP20 (BSC) address must start with "0x".');
        return;
      }
      if (trimmedAddress.length !== 42) {
        Alert.alert('Invalid Length', `BEP20 address must be exactly 42 characters. (Entered: ${trimmedAddress.length})`);
        return;
      }
    }

    if (!validateAddress(trimmedAddress, network)) {
      Alert.alert('Invalid Format', `The entered address does not conform to standard ${network} format.`);
      return;
    }

    setLoading(true);

    const isVerified = await verifyDeviceSecurity();
    if (!isVerified) {
      setLoading(false);
      Alert.alert("Authorization Cancelled", "Action aborted due to unverified security check.");
      return;
    }

    try {
      // The uniqueness check (no two accounts sharing the same wallet) and
      // the actual write both happen server-side, atomically — the client
      // can no longer write walletAddress directly (blocked by Firestore
      // security rules).
      const updateWallet = httpsCallable(functionsInstance, 'updateWalletAddress');
      await updateWallet({ walletAddress: trimmedAddress, network: network });

      setIsWalletSaved(true);
      setIsEditable(false);

      Alert.alert(
        'Success',
        `${network} Settlement Address saved successfully!`,
        [
          {
            text: "OK",
            onPress: () => {
              if (navigation && typeof navigation.goBack === 'function') {
                navigation.goBack();
              }
            }
          }
        ]
      );
    } catch (err) {
      const message = err.code === 'functions/already-exists'
        ? 'This wallet address is already linked with another user account.'
        : (err.message || 'Failed to update wallet address.');
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackAction = () => {
    if (navigation && typeof navigation.goBack === 'function') {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#0B0E14" : "#FFFFFF"}
      />

      <View style={currentStyles.header}>
        <TouchableOpacity style={currentStyles.backButton} onPress={handleBackAction}>
          <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Settlement Config</Text>
        <View style={{ width: 36 }} />
      </View>

      {initialLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

          <View style={currentStyles.alertBox}>
            <View style={styles.alertHeaderRow}>
              <MaterialCommunityIcons name="shield-check" size={20} color="#34D399" />
              <Text style={currentStyles.alertTitle}>Secure Settlement Protocol</Text>
            </View>
            <Text style={currentStyles.alertDescription}>
              Withdrawals will be transferred exclusively to this address. Select your preferred blockchain network and ensure the input is accurate.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={currentStyles.inputLabel}>SELECT BLOCKCHAIN NETWORK</Text>
            <View style={styles.networkSelectorRow}>
              <TouchableOpacity
                style={[
                  currentStyles.networkButton,
                  network === 'TRC20' && currentStyles.activeNetworkButton,
                  !isEditable && styles.disabledSelector
                ]}
                disabled={!isEditable}
                onPress={() => {
                  setNetwork('TRC20');
                  setWalletAddress('');
                }}
              >
                <Text style={[currentStyles.networkButtonText, network === 'TRC20' && currentStyles.activeNetworkText]}>
                  USDT - TRC20
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  currentStyles.networkButton,
                  network === 'BEP20' && currentStyles.activeNetworkButton,
                  !isEditable && styles.disabledSelector
                ]}
                disabled={!isEditable}
                onPress={() => {
                  setNetwork('BEP20');
                  setWalletAddress('');
                }}
              >
                <Text style={[currentStyles.networkButtonText, network === 'BEP20' && currentStyles.activeNetworkText]}>
                  USDT - BEP20 (BSC)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={currentStyles.inputLabel}>
              {network} SETTLEMENT ADDRESS
            </Text>
            <TextInput
              style={[currentStyles.textInput, !isEditable && currentStyles.disabledInput]}
              placeholder={network === 'TRC20' ? "Enter 34-char address starting with 'T'" : "Enter 42-char address starting with '0x'"}
              placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
              value={walletAddress}
              onChangeText={handleWalletTextChange}
              editable={isEditable}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={network === 'TRC20' ? 34 : 42}
            />
          </View>

          <View style={currentStyles.termsBox}>
            <View style={styles.termsHeaderRow}>
              <Feather name="info" size={14} color="#F87171" />
              <Text style={currentStyles.termsTitle}>{network} NETWORK PROTOCOL TERMS</Text>
            </View>
            <Text style={currentStyles.termsText}>
              {network === 'TRC20'
                ? "TRC20 addresses must start with 'T' and be exactly 34 characters long. Do not enter BEP20 or ERC20 addresses here. Transactions sent to incorrect networks are permanently irrecoverable."
                : "BEP20 (BNB Smart Chain) addresses must start with '0x' and be exactly 42 characters long. Ensure your receiving platform explicitly supports USDT via BSC (BEP20)."
              }
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
      )}

      <View style={[currentStyles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.actionButton, isWalletSaved && !isEditable ? styles.updateButtonColor : styles.saveButtonColor]}
          onPress={handleActionClick}
          disabled={loading || initialLoading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.actionButtonText}>
              {isWalletSaved && !isEditable ? 'Request Wallet Update' : 'Authorize Settlement Address'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', fontStyle: 'italic' },
  alertBox: { backgroundColor: '#E6F4EA', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#A3E635' },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#059669' },
  alertDescription: { fontSize: 11, color: '#475569', lineHeight: 16, fontWeight: '500' },
  inputLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 0.8, marginBottom: 10, paddingLeft: 4 },
  networkButton: { flex: 1, height: 48, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  activeNetworkButton: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  networkButtonText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  activeNetworkText: { color: '#3B82F6', fontWeight: '700' },
  textInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, height: 54, paddingHorizontal: 16, fontSize: 13, color: '#1E293B', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  disabledInput: { backgroundColor: '#F1F5F9', color: '#64748B', borderColor: '#E2E8F0' },
  termsBox: { backgroundColor: '#FFF5F5', borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#FEE2E2', marginBottom: 20 },
  termsTitle: { fontSize: 11, fontWeight: '800', color: '#EF4444', letterSpacing: 0.5 },
  termsText: { fontSize: 11, color: '#991B1B', lineHeight: 17, fontWeight: '500', textAlign: 'justify' },
  footer: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', fontStyle: 'italic' },
  alertBox: { backgroundColor: '#062018', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#059669' },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#34D399' },
  alertDescription: { fontSize: 11, color: '#A7F3D0', lineHeight: 16, fontWeight: '500' },
  inputLabel: { fontSize: 10, fontWeight: '700', color: '#CBD5E1', letterSpacing: 0.8, marginBottom: 10, paddingLeft: 4 },
  networkButton: { flex: 1, height: 48, backgroundColor: '#161B22', borderWidth: 1, borderColor: '#30363D', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  activeNetworkButton: { backgroundColor: '#1E293B', borderColor: '#3B82F6' },
  networkButtonText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  activeNetworkText: { color: '#60A5FA', fontWeight: '700' },
  textInput: { backgroundColor: '#161B22', borderWidth: 1, borderColor: '#30363D', borderRadius: 16, height: 54, paddingHorizontal: 16, fontSize: 13, color: '#FFFFFF', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  disabledInput: { backgroundColor: '#0D1117', color: '#94A3B8', borderColor: '#21262D' },
  termsBox: { backgroundColor: '#2D1517', borderRadius: 16, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#7F1D1D', marginBottom: 20 },
  termsTitle: { fontSize: 11, fontWeight: '800', color: '#F87171', letterSpacing: 0.5 },
  termsText: { fontSize: 11, color: '#FCA5A5', lineHeight: 17, fontWeight: '500', textAlign: 'justify' },
  footer: { backgroundColor: '#161B22', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#21262D' }
});

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 20, paddingTop: 25 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  alertHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  inputGroup: { marginBottom: 24 },
  networkSelectorRow: { flexDirection: 'row', gap: 12 },
  disabledSelector: { opacity: 0.6 },
  termsHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  actionButton: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  saveButtonColor: { backgroundColor: '#10B981' },
  updateButtonColor: { backgroundColor: '#EF4444' },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' }
});