import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, functions } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

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

// Each field: key matches the backend's rate name, displayValue is the
// percentage shown/edited in the input (e.g. 7 for 7%), and the backend
// expects/returns the raw decimal fraction (e.g. 0.07). maxPercent caps
// what an admin can enter, matching the backend's own validation bounds.
const RATE_FIELDS = [
  {
    key: 'welcomeBonusRate',
    label: 'Welcome Bonus',
    description: 'Percentage of a user\'s first deposit credited as a one-time welcome bonus.',
    icon: 'gift',
    maxPercent: 100,
  },
  {
    key: 'directReferralRate',
    label: 'Direct Referral Bonus (Level 1)',
    description: 'Percentage of the referred user\'s VIP capital paid to their direct referrer.',
    icon: 'account-arrow-right',
    maxPercent: 100,
  },
  {
    key: 'indirectReferralRate',
    label: 'Indirect Referral Bonus (Level 2)',
    description: 'Percentage of the referred user\'s VIP capital paid to the second-level referrer.',
    icon: 'account-multiple-outline',
    maxPercent: 100,
  },
  {
    key: 'vipUpgradeRate',
    label: 'VIP Upgrade Bonus',
    description: 'Percentage of the capital difference paid when a user unlocks a higher VIP tier.',
    icon: 'trophy-outline',
    maxPercent: 100,
  },
  {
    key: 'dailyTaskProfitRate',
    label: 'Daily Task Profit Rate',
    description: 'Percentage of a user\'s balance earned per completed daily task.',
    icon: 'chart-line',
    maxPercent: 10,
  },
];

export default function AdminBonusConfigScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({});
  const [originalValues, setOriginalValues] = useState({});
  const [lastUpdatedInfo, setLastUpdatedInfo] = useState(null);

  const [rewardThreshold, setRewardThreshold] = useState('15');
  const [rewardAmount, setRewardAmount] = useState('0');
  const [originalRewardThreshold, setOriginalRewardThreshold] = useState('15');
  const [originalRewardAmount, setOriginalRewardAmount] = useState('0');
  const [savingReward, setSavingReward] = useState(false);

  const [promoActive, setPromoActive] = useState(false);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoStartDate, setPromoStartDate] = useState('');
  const [promoEndDate, setPromoEndDate] = useState('');
  const [savingPromo, setSavingPromo] = useState(false);

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setAccessChecked(true);
          setLoading(false);
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const admin = userDoc.exists() && userDoc.data().isAdmin === true;
        setIsAdmin(admin);
        setAccessChecked(true);

        if (!admin) {
          setLoading(false);
          return;
        }

        const getBonusConfig = httpsCallable(functions, 'getBonusConfig');
        const res = await getBonusConfig();
        const rates = res.data.rates;

        const percentValues = {};
        RATE_FIELDS.forEach((field) => {
          const raw = rates[field.key];
          percentValues[field.key] = typeof raw === 'number' ? String(Number((raw * 100).toFixed(4))) : '';
        });

        setValues(percentValues);
        setOriginalValues(percentValues);

        const getRewardStatus = httpsCallable(functions, 'getMonthlyRewardStatus');
        const rewardRes = await getRewardStatus();
        if (rewardRes.data) {
          const t = String(rewardRes.data.threshold || 15);
          const a = String(rewardRes.data.rewardAmount || 0);
          setRewardThreshold(t);
          setRewardAmount(a);
          setOriginalRewardThreshold(t);
          setOriginalRewardAmount(a);
        }
      } catch (err) {
        showAlert('Error', err.message || 'Failed to load current bonus rates.');
      } finally {
        setLoading(false);
      }
    };

    checkAccessAndLoad();
  }, []);

  const handleValueChange = (key, text) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const safe = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    setValues((prev) => ({ ...prev, [key]: safe }));
  };

  const hasChanges = RATE_FIELDS.some((field) => values[field.key] !== originalValues[field.key]);

  const handleSave = async () => {
    const updates = {};
    let validationError = null;

    RATE_FIELDS.forEach((field) => {
      if (values[field.key] === originalValues[field.key]) return;

      const numericPercent = parseFloat(values[field.key]);
      if (isNaN(numericPercent) || numericPercent < 0) {
        validationError = `${field.label} must be a valid positive number.`;
        return;
      }
      if (numericPercent > field.maxPercent) {
        validationError = `${field.label} cannot exceed ${field.maxPercent}%.`;
        return;
      }

      updates[field.key] = Number((numericPercent / 100).toFixed(6));
    });

    if (validationError) {
      showAlert('Invalid Value', validationError);
      return;
    }

    if (Object.keys(updates).length === 0) {
      showAlert('No Changes', 'You haven\'t changed any values yet.');
      return;
    }

    setSaving(true);
    try {
      const updateBonusConfig = httpsCallable(functions, 'updateBonusConfig');
      const res = await updateBonusConfig(updates);
      const newRates = res.data.rates;

      const percentValues = {};
      RATE_FIELDS.forEach((field) => {
        const raw = newRates[field.key];
        percentValues[field.key] = typeof raw === 'number' ? String(Number((raw * 100).toFixed(4))) : '';
      });

      setValues(percentValues);
      setOriginalValues(percentValues);
      setLastUpdatedInfo(new Date());

      showAlert('Saved', 'Bonus rates updated successfully. New rates apply immediately across the app.');
    } catch (err) {
      showAlert('Error', err.message || 'Failed to save bonus rates.');
    } finally {
      setSaving(false);
    }
  };

  const rewardHasChanges = rewardThreshold !== originalRewardThreshold || rewardAmount !== originalRewardAmount;

  const handleSaveReward = async () => {
    const thresholdNum = parseInt(rewardThreshold, 10);
    const amountNum = parseFloat(rewardAmount);

    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      showAlert('Invalid Value', 'Direct referrals required must be a positive whole number.');
      return;
    }
    if (isNaN(amountNum) || amountNum < 0) {
      showAlert('Invalid Value', 'Reward amount must be a valid positive number.');
      return;
    }

    setSavingReward(true);
    try {
      const updateConfig = httpsCallable(functions, 'updateMonthlyRewardConfig');
      const res = await updateConfig({ directReferralThreshold: thresholdNum, rewardAmount: amountNum });
      const newConfig = res.data.config;
      const t = String(newConfig.directReferralThreshold);
      const a = String(newConfig.rewardAmount);
      setRewardThreshold(t);
      setRewardAmount(a);
      setOriginalRewardThreshold(t);
      setOriginalRewardAmount(a);
      showAlert('Saved', 'Monthly reward requirements updated. Every user\'s eligibility on the Team screen updates automatically.');
    } catch (err) {
      showAlert('Error', err.message || 'Failed to save reward settings.');
    } finally {
      setSavingReward(false);
    }
  };

  const handleSavePromotion = async () => {
    if (promoActive) {
      if (!promoTitle.trim() || !promoMessage.trim()) {
        showAlert('Missing Info', 'Title and message are required to activate a promotion.');
        return;
      }
      const startMs = new Date(promoStartDate).getTime();
      const endMs = new Date(promoEndDate).getTime();
      if (isNaN(startMs) || isNaN(endMs)) {
        showAlert('Invalid Date', 'Use format YYYY-MM-DD for both start and end date.');
        return;
      }
      if (endMs <= startMs) {
        showAlert('Invalid Date', 'End date must be after the start date.');
        return;
      }
    }

    setSavingPromo(true);
    try {
      const updatePromotion = httpsCallable(functions, 'updatePromotionConfig');
      await updatePromotion({
        active: promoActive,
        title: promoTitle.trim(),
        message: promoMessage.trim(),
        startDate: promoStartDate ? new Date(promoStartDate).getTime() : 0,
        endDate: promoEndDate ? new Date(promoEndDate).getTime() : 0,
      });
      showAlert('Saved', promoActive ? 'Promotion is now live -- users will see it the next time they open the app.' : 'Promotion turned off.');
    } catch (err) {
      showAlert('Error', err.message || 'Failed to save the promotion.');
    } finally {
      setSavingPromo(false);
    }
  };

  if (accessChecked && !isAdmin) {
    return (
      <SafeAreaView style={currentStyles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={currentStyles.header}>
          <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
          </TouchableOpacity>
          <Text style={currentStyles.headerTitle}>Bonus Settings</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.accessDeniedContainer}>
          <MaterialCommunityIcons name="shield-lock-outline" size={40} color={isDarkMode ? "#334155" : "#CBD5E1"} />
          <Text style={styles.accessDeniedText}>You don't have permission to view this page.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={currentStyles.header}>
        <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Bonus Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

            <View style={currentStyles.infoBox}>
              <View style={styles.infoHeaderRow}>
                <MaterialCommunityIcons name="cog-outline" size={18} color="#3B82F6" />
                <Text style={currentStyles.infoTitle}>Central Bonus Control</Text>
              </View>
              <Text style={currentStyles.infoDescription}>
                Changes here apply immediately across the whole app — new deposits, referrals, VIP upgrades, and daily tasks, as well as every screen that displays these percentages. Amounts already credited to users are never affected.
              </Text>
            </View>

            {RATE_FIELDS.map((field) => (
              <View key={field.key} style={currentStyles.fieldCard}>
                <View style={styles.fieldHeaderRow}>
                  <View style={styles.fieldIconCircle}>
                    <MaterialCommunityIcons name={field.icon} size={16} color="#3B82F6" />
                  </View>
                  <Text style={currentStyles.fieldLabel}>{field.label}</Text>
                </View>
                <Text style={currentStyles.fieldDescription}>{field.description}</Text>
                <View style={currentStyles.inputRow}>
                  <TextInput
                    style={currentStyles.percentInput}
                    keyboardType="decimal-pad"
                    value={values[field.key] || ''}
                    onChangeText={(text) => handleValueChange(field.key, text)}
                    placeholder="0"
                    placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                  />
                  <Text style={currentStyles.percentSign}>%</Text>
                </View>
              </View>
            ))}

            <View style={currentStyles.infoBox}>
              <View style={styles.infoHeaderRow}>
                <MaterialCommunityIcons name="cash-multiple" size={18} color="#EAB308" />
                <Text style={currentStyles.infoTitle}>Monthly Reward Settings</Text>
              </View>
              <Text style={currentStyles.infoDescription}>
                Sets the eligibility requirement shown on every user's Team screen. Changing this instantly updates whether each user's claim button is enabled.
              </Text>
            </View>

            <View style={currentStyles.fieldCard}>
              <View style={styles.fieldHeaderRow}>
                <View style={styles.fieldIconCircle}>
                  <MaterialCommunityIcons name="account-group-outline" size={16} color="#3B82F6" />
                </View>
                <Text style={currentStyles.fieldLabel}>Direct Referrals Required</Text>
              </View>
              <Text style={currentStyles.fieldDescription}>Number of ACTIVE direct referrals (balance $70+) a user needs to unlock the claim button.</Text>
              <View style={currentStyles.inputRow}>
                <TextInput
                  style={currentStyles.percentInput}
                  keyboardType="number-pad"
                  value={rewardThreshold}
                  onChangeText={(text) => setRewardThreshold(text.replace(/[^0-9]/g, ''))}
                  placeholder="15"
                  placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                />
              </View>
            </View>

            <View style={currentStyles.fieldCard}>
              <View style={styles.fieldHeaderRow}>
                <View style={styles.fieldIconCircle}>
                  <MaterialCommunityIcons name="cash" size={16} color="#3B82F6" />
                </View>
                <Text style={currentStyles.fieldLabel}>Reward Amount (USDT)</Text>
              </View>
              <Text style={currentStyles.fieldDescription}>Amount credited to a user's balance once their claim is approved.</Text>
              <View style={currentStyles.inputRow}>
                <TextInput
                  style={currentStyles.percentInput}
                  keyboardType="decimal-pad"
                  value={rewardAmount}
                  onChangeText={(text) => setRewardAmount(text.replace(/[^0-9.]/g, ''))}
                  placeholder="50"
                  placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, !rewardHasChanges && styles.saveButtonDisabled, { marginBottom: 12 }]}
              onPress={handleSaveReward}
              disabled={savingReward || !rewardHasChanges}
            >
              {savingReward ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {rewardHasChanges ? 'Save Reward Settings' : 'No Reward Changes to Save'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewClaimsButton}
              onPress={() => navigation.navigate('AdminRewardClaimsScreen')}
            >
              <MaterialCommunityIcons name="clipboard-list-outline" size={16} color="#3B82F6" style={{ marginRight: 8 }} />
              <Text style={styles.viewClaimsButtonText}>View Reward Claims</Text>
            </TouchableOpacity>

            <View style={currentStyles.infoBox}>
              <View style={styles.infoHeaderRow}>
                <MaterialCommunityIcons name="bullhorn-outline" size={18} color="#8B5CF6" />
                <Text style={currentStyles.infoTitle}>Home Screen Promotion</Text>
              </View>
              <Text style={currentStyles.infoDescription}>
                When active, this shows as a popup to every user the next time they open the app. Turn off when the offer ends.
              </Text>
            </View>

            <View style={[currentStyles.fieldCard, styles.promoToggleRow]}>
              <Text style={currentStyles.fieldLabel}>Promotion Active</Text>
              <Switch value={promoActive} onValueChange={setPromoActive} trackColor={{ true: '#3B82F6' }} />
            </View>

            <View style={currentStyles.fieldCard}>
              <Text style={currentStyles.fieldLabel}>Title</Text>
              <View style={currentStyles.inputRow}>
                <TextInput
                  style={currentStyles.percentInput}
                  value={promoTitle}
                  onChangeText={setPromoTitle}
                  placeholder="e.g. Referral Bonus Boost"
                  placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                />
              </View>
            </View>

            <View style={currentStyles.fieldCard}>
              <Text style={currentStyles.fieldLabel}>Message</Text>
              <View style={[currentStyles.inputRow, { height: 90, alignItems: 'flex-start', paddingVertical: 10 }]}>
                <TextInput
                  style={[currentStyles.percentInput, { textAlignVertical: 'top' }]}
                  value={promoMessage}
                  onChangeText={setPromoMessage}
                  placeholder="e.g. Direct referral bonus is now 15% until Sep 10!"
                  placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                  multiline
                />
              </View>
            </View>

            <View style={currentStyles.fieldCard}>
              <Text style={currentStyles.fieldLabel}>Start Date (YYYY-MM-DD)</Text>
              <View style={currentStyles.inputRow}>
                <TextInput
                  style={currentStyles.percentInput}
                  value={promoStartDate}
                  onChangeText={setPromoStartDate}
                  placeholder="2026-09-05"
                  placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                />
              </View>
            </View>

            <View style={currentStyles.fieldCard}>
              <Text style={currentStyles.fieldLabel}>End Date (YYYY-MM-DD)</Text>
              <View style={currentStyles.inputRow}>
                <TextInput
                  style={currentStyles.percentInput}
                  value={promoEndDate}
                  onChangeText={setPromoEndDate}
                  placeholder="2026-09-12"
                  placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { marginBottom: 20 }]}
              onPress={handleSavePromotion}
              disabled={savingPromo}
            >
              {savingPromo ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Promotion</Text>
              )}
            </TouchableOpacity>

            {lastUpdatedInfo && (
              <Text style={styles.lastUpdatedText}>
                Last saved at {lastUpdatedInfo.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}

          </ScrollView>

          <View style={[currentStyles.footer, { paddingBottom: 16 + insets.bottom }]}>
            <TouchableOpacity
              style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {hasChanges ? 'Save Changes' : 'No Changes to Save'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  infoBox: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1D4ED8' },
  infoDescription: { fontSize: 11, color: '#475569', lineHeight: 16, fontWeight: '500' },
  fieldCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  fieldDescription: { fontSize: 11, color: '#64748B', lineHeight: 15, fontWeight: '500', marginTop: 4, marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 48 },
  percentInput: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1E293B' },
  percentSign: { fontSize: 16, fontWeight: '700', color: '#64748B' },
  footer: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  infoBox: { backgroundColor: '#0B1E3A', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#1E3A5F' },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#60A5FA' },
  infoDescription: { fontSize: 11, color: '#93C5FD', lineHeight: 16, fontWeight: '500' },
  fieldCard: { backgroundColor: '#161B22', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#21262D' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  fieldDescription: { fontSize: 11, color: '#94A3B8', lineHeight: 15, fontWeight: '500', marginTop: 4, marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D1117', borderWidth: 1, borderColor: '#21262D', borderRadius: 12, paddingHorizontal: 14, height: 48 },
  percentInput: { flex: 1, fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  percentSign: { fontSize: 16, fontWeight: '700', color: '#94A3B8' },
  footer: { backgroundColor: '#161B22', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#21262D' }
});

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  infoHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fieldHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldIconCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(59,130,246,0.15)', justifyContent: 'center', alignItems: 'center' },
  lastUpdatedText: { fontSize: 11, color: '#94A3B8', fontWeight: '500', textAlign: 'center', marginTop: 4, marginBottom: 10 },
  saveButton: { height: 54, borderRadius: 16, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#94A3B8' },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  accessDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  accessDeniedText: { fontSize: 13, color: '#94A3B8', fontWeight: '500', textAlign: 'center' },
  viewClaimsButton: { flexDirection: 'row', height: 50, borderRadius: 14, backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  viewClaimsButtonText: { color: '#3B82F6', fontSize: 13, fontWeight: '700' },
  promoToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});