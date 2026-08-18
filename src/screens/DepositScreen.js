import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { auth } from '../firebaseConfig';
import { 
  getOrCreateDepositAddress, 
  checkTRC20Deposit,
  getOrCreateBEP20Address, // Naya function BEP20 ke liye
  checkBEP20Deposit       // Naya function BEP20 deposit check ke liye
} from '../utils/tronWallet'; // Ya jahan aap bep20 wallet functions rakhein
import { ThemeContext } from '../../ThemeContext';

export default function DepositScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const [selectedNetwork, setSelectedNetwork] = useState('TRC20'); // 'TRC20' ya 'BEP20'
  const [amount, setAmount] = useState('');
  const [depositAddress, setDepositAddress] = useState('');
  const [addressGenerated, setAddressGenerated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [loading, setLoading] = useState(false);

  const depositAmount = parseFloat(amount) || 0;
  const bonusAmount = (depositAmount * 0.07).toFixed(2);
  const totalAmount = (depositAmount + parseFloat(bonusAmount)).toFixed(2);

  useEffect(() => {
    if (!addressGenerated) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAddressGenerated(false);
          Alert.alert("Address Expired", `The ${selectedNetwork} deposit address has expired. Please generate a new one.`);
          return 3600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [addressGenerated, selectedNetwork]);

  useEffect(() => {
    if (!addressGenerated || !depositAddress) return;

    const user = auth.currentUser;
    if (!user?.uid) return;

    const pollInterval = setInterval(async () => {
      let result = null;
      
      if (selectedNetwork === 'TRC20') {
        result = await checkTRC20Deposit(user.uid, depositAddress, depositAmount);
      } else if (selectedNetwork === 'BEP20') {
        result = await checkBEP20Deposit(user.uid, depositAddress, depositAmount);
      }

      if (result && result.success) {
        clearInterval(pollInterval);
        Alert.alert(
          "Deposit Confirmed!",
          `Successfully received deposit via ${selectedNetwork}. $${result.amount.toFixed(2)} USDT added to your balance.`,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [addressGenerated, depositAddress, depositAmount, selectedNetwork]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerateAddress = async () => {
    if (!amount || depositAmount <= 0) {
      Alert.alert("Error", "Please enter a valid deposit amount.");
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      if (user?.uid) {
        let address = '';
        if (selectedNetwork === 'TRC20') {
          address = await getOrCreateDepositAddress(user.uid);
        } else {
          address = await getOrCreateBEP20Address(user.uid);
        }
        setDepositAddress(address);
        setTimeLeft(3600);
        setAddressGenerated(true);
      } else {
        Alert.alert("Error", "User authentication failed. Please login again.");
      }
    } catch (error) {
      Alert.alert("Error", `Failed to generate ${selectedNetwork} deposit address.`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (depositAddress) {
      if (Platform.OS === 'web' && navigator.clipboard) {
        navigator.clipboard.writeText(depositAddress);
        Alert.alert("Copied", `${selectedNetwork} address successfully copied to clipboard.`);
      } else {
        Alert.alert("Copied", depositAddress);
      }
    }
  };

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#0B0E14" : "#FFFFFF"}
      />

      <View style={currentStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? "white" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Deposit USDT</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        <View style={currentStyles.bonusBanner}>
          <FontAwesome5 name="gift" size={16} color="#10B981" />
          <Text style={currentStyles.bonusBannerText}>Sign-Up Promotion: Get an exclusive 7% bonus credited automatically on your very first deposit!</Text>
        </View>

        {/* Network Selector Section */}
        <Text style={styles.sectionTitle}>Select Deposit Network</Text>
        <View style={styles.networkSelectionRow}>
          
          <TouchableOpacity
            style={[
              currentStyles.networkOptionCard,
              selectedNetwork === 'TRC20' && styles.activeNetworkCard
            ]}
            onPress={() => {
              if (selectedNetwork !== 'TRC20') {
                setSelectedNetwork('TRC20');
                setAddressGenerated(false);
              }
            }}
          >
            <View style={styles.networkHeaderRow}>
              <Text style={[currentStyles.networkName, selectedNetwork === 'TRC20' && styles.activeNetworkText]}>USDT (TRC-20)</Text>
              {selectedNetwork === 'TRC20' && <MaterialCommunityIcons name="check-circle" size={18} color="#3B82F6" />}
            </View>
            <Text style={currentStyles.networkChain}>Tron Network</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              currentStyles.networkOptionCard,
              selectedNetwork === 'BEP20' && styles.activeNetworkCard
            ]}
            onPress={() => {
              if (selectedNetwork !== 'BEP20') {
                setSelectedNetwork('BEP20');
                setAddressGenerated(false);
              }
            }}
          >
            <View style={styles.networkHeaderRow}>
              <Text style={[currentStyles.networkName, selectedNetwork === 'BEP20' && styles.activeNetworkText]}>USDT (BEP-20)</Text>
              {selectedNetwork === 'BEP20' && <MaterialCommunityIcons name="check-circle" size={18} color="#3B82F6" />}
            </View>
            <Text style={currentStyles.networkChain}>BNB Smart Chain</Text>
          </TouchableOpacity>

        </View>

        <Text style={styles.sectionTitle}>Enter Deposit Amount</Text>
        <View style={currentStyles.amountInputBox}>
          <FontAwesome5 name="dollar-sign" size={16} color="#64748B" style={{ marginRight: 10 }} />
          <TextInput
            style={currentStyles.textInput}
            placeholder="0.00"
            placeholderTextColor={isDarkMode ? "#475569" : "#94A3B8"}
            keyboardType="numeric"
            value={amount}
            onChangeText={(val) => {
              setAmount(val);
              setAddressGenerated(false);
            }}
          />
          <Text style={styles.usdtTag}>USDT</Text>
        </View>

        {depositAmount > 0 && (
          <View style={currentStyles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Base Deposit Amount:</Text>
              <Text style={currentStyles.summaryValue}>{depositAmount.toFixed(2)} USDT</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>7% Sign-Up Bonus:</Text>
              <Text style={currentStyles.summaryValue}>+{bonusAmount} USDT</Text>
            </View>
            <View style={[styles.summaryRow, currentStyles.totalRowBorder]}>
              <Text style={styles.totalLabel}>Total Expected Balance:</Text>
              <Text style={currentStyles.totalValue}>${totalAmount} USDT</Text>
            </View>
          </View>
        )}

        {!addressGenerated ? (
          <TouchableOpacity 
            style={styles.mainActionBtn} 
            onPress={handleGenerateAddress}
            disabled={loading}
          >
            <Text style={styles.mainActionBtnText}>
              {loading ? "Generating Address..." : `Generate ${selectedNetwork} Address`}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={currentStyles.addressSectionBox}>

            <View style={styles.timerWrapper}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#EF4444" />
              <Text style={styles.timerText}>Address Expires In: {formatTime(timeLeft)}</Text>
            </View>

            <View style={currentStyles.qrCodeWrapper}>
              <View style={styles.qrPlaceholderBox}>
                {depositAddress ? (
                  <QRCode
                    value={depositAddress}
                    size={160}
                    color={isDarkMode ? "#FFFFFF" : "#000000"}
                    backgroundColor={isDarkMode ? "#161B22" : "#FFFFFF"}
                  />
                ) : null}
                <Text style={styles.qrExpiryText}>Scan QR via Trust Wallet or Binance</Text>
              </View>
            </View>

            <Text style={styles.addressBoxLabel}>Official {selectedNetwork} Destination Address</Text>

            <View style={currentStyles.walletAddressDisplayRow}>
              <Text style={currentStyles.addressText} numberOfLines={1}>
                {depositAddress}
              </Text>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={copyToClipboard}
              >
                <MaterialCommunityIcons name="content-copy" size={18} color="#3B82F6" />
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#F59E0B" />
              <Text style={styles.warningText}>
                {selectedNetwork === 'TRC20' 
                  ? "Do NOT send BEP-20 or ERC-20 assets. Send ONLY USDT via the Tron (TRC-20) network to prevent loss."
                  : "Do NOT send TRC-20 or ERC-20 assets. Send ONLY USDT via the BNB Smart Chain (BEP-20) network to prevent loss."
                }
              </Text>
            </View>

            <View style={styles.waitingStatusRow}>
              <View style={styles.spinnerPlaceholder} />
              <Text style={styles.statusText}>Listening for auto-payment confirmation on blockchain...</Text>
            </View>

          </View>
        )}

        <Text style={styles.termsTitle}>Terms & Conditions</Text>
        <View style={currentStyles.termsBox}>
          <Text style={styles.termsParagraph}>
            1. <Text style={currentStyles.termsHighlight}>Network Fee Responsibility:</Text> All deposits made via {selectedNetwork} network are subject to respective blockchain gas fees.
          </Text>
          <Text style={styles.termsParagraph}>
            2. <Text style={currentStyles.termsHighlight}>Insufficient Deposit Penalties:</Text> If network fees are deducted from your base deposit amount, resulting in a transfer that falls short of the required VIP limit, your deposit will be rejected.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: 'bold' },
  bonusBanner: { flexDirection: 'row', backgroundColor: '#E6F4EA', padding: 15, borderRadius: 12, alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 15, borderWidth: 1, borderColor: '#34A853' },
  bonusBannerText: { color: '#137333', fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 16 },
  networkOptionCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 15, borderWidth: 1, borderColor: '#E2E8F0', padding: 14 },
  networkName: { color: '#1E293B', fontSize: 14, fontWeight: 'bold' },
  networkChain: { color: '#64748B', fontSize: 11, marginTop: 4 },
  amountInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 15, borderWidth: 1, borderColor: '#E2E8F0', height: 55, paddingHorizontal: 15, marginTop: 5 },
  textInput: { flex: 1, color: '#1E293B', fontSize: 16, height: '100%', fontWeight: '600' },
  summaryBox: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1', marginTop: 15, gap: 10 },
  summaryValue: { color: '#1E293B', fontSize: 14, fontWeight: '600' },
  totalRowBorder: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10, marginTop: 4 },
  totalLabel: { color: '#1E293B', fontSize: 14, fontWeight: 'bold' },
  addressSectionBox: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, marginTop: 25, alignItems: 'center' },
  qrCodeWrapper: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  walletAddressDisplayRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, height: 48, paddingHorizontal: 12, width: '100%', gap: 10 },
  addressText: { color: '#1E293B', fontSize: 13, flex: 1, fontFamily: 'monospace' },
  termsBox: { backgroundColor: '#FFFFFF', borderRadius: 15, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, gap: 14 },
  termsHighlight: { color: '#1E293B', fontWeight: 'bold' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#161B22', backgroundColor: '#161B22' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  bonusBanner: { flexDirection: 'row', backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: 15, borderRadius: 12, alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.15)' },
  bonusBannerText: { color: '#E2E8F0', fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 16 },
  networkOptionCard: { flex: 1, backgroundColor: '#161B22', borderRadius: 15, borderWidth: 1, borderColor: '#21262D', padding: 14 },
  networkName: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  networkChain: { color: '#64748B', fontSize: 11, marginTop: 4 },
  amountInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', borderRadius: 15, borderWidth: 1, borderColor: '#21262D', height: 55, paddingHorizontal: 15, marginTop: 5 },
  textInput: { flex: 1, color: 'white', fontSize: 16, height: '100%', fontWeight: '600' },
  summaryBox: { backgroundColor: '#161B22', borderRadius: 15, padding: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#334155', marginTop: 15, gap: 10 },
  summaryValue: { color: 'white', fontSize: 14, fontWeight: '600' },
  totalRowBorder: { borderTopWidth: 1, borderTopColor: '#21262D', paddingTop: 10, marginTop: 4 },
  totalLabel: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  addressSectionBox: { backgroundColor: '#161B22', borderRadius: 20, borderWidth: 1, borderColor: '#21262D', padding: 20, marginTop: 25, alignItems: 'center' },
  qrCodeWrapper: { backgroundColor: '#161B22', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#21262D', marginBottom: 20 },
  walletAddressDisplayRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B0E14', borderRadius: 12, height: 48, paddingHorizontal: 12, width: '100%', gap: 10 },
  addressText: { color: 'white', fontSize: 13, flex: 1, fontFamily: 'monospace' },
  termsBox: { backgroundColor: '#161B22', borderRadius: 15, borderWidth: 1, borderColor: '#21262D', padding: 16, gap: 14 },
  termsHighlight: { color: '#E2E8F0', fontWeight: 'bold' }
});

const styles = StyleSheet.create({
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { color: '#94A3B8', fontSize: 13, fontWeight: 'bold', marginTop: 20, marginBottom: 12, marginLeft: 2 },
  networkSelectionRow: { flexDirection: 'row', gap: 12 },
  networkHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeNetworkCard: { borderColor: '#3B82F6', borderWidth: 2 },
  activeNetworkText: { color: '#3B82F6' },
  usdtTag: { color: '#3B82F6', fontWeight: 'bold', fontSize: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#64748B', fontSize: 13 },
  totalValue: { color: '#3B82F6', fontSize: 16, fontWeight: 'bold' },
  mainActionBtn: { backgroundColor: '#3B82F6', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  mainActionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  timerWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239, 68, 68, 0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  timerText: { color: '#EF4444', fontSize: 12, fontWeight: 'bold' },
  qrPlaceholderBox: { alignItems: 'center', gap: 10 },
  qrExpiryText: { color: '#64748B', fontSize: 11, marginTop: 8 },
  addressBoxLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '500', alignSelf: 'flex-start', marginBottom: 8, marginLeft: 2 },
  copyBtn: { padding: 6 },
  warningBox: { flexDirection: 'row', gap: 8, marginTop: 15, backgroundColor: 'rgba(245, 158, 11, 0.04)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.1)' },
  warningText: { color: '#D97706', fontSize: 11, flex: 1, lineHeight: 16 },
  waitingStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  spinnerPlaceholder: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#3B82F6', borderTopColor: 'transparent' },
  statusText: { color: '#64748B', fontSize: 12 },
  termsTitle: { color: '#94A3B8', fontSize: 14, fontWeight: 'bold', marginTop: 30, marginBottom: 12, marginLeft: 2 },
  termsParagraph: { color: '#94A3B8', fontSize: 12, lineHeight: 18, textAlign: 'justify' }
});
