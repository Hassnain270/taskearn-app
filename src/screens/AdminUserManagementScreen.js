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
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform
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

export default function AdminUserManagementScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWallet, setEditWallet] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setAccessChecked(true);
          return;
        }
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setIsAdmin(userDoc.exists() && userDoc.data().isAdmin === true);
      } catch (err) {
        setIsAdmin(false);
      } finally {
        setAccessChecked(true);
      }
    };
    checkAccess();
  }, []);

  const handleSearch = async () => {
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) {
      showAlert('Search Required', 'Enter a username, email, phone number, wallet address, or UID to search.');
      return;
    }

    setSearching(true);
    setHasSearched(true);
    try {
      const searchFn = httpsCallable(functions, 'adminSearchUsers');
      const res = await searchFn({ query: cleanQuery });
      setResults(res.data.results || []);
    } catch (err) {
      showAlert('Error', err.message || 'Search failed.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const openUserDetail = async (uid) => {
    setDetailModalVisible(true);
    setDetailLoading(true);
    setSelectedDetail(null);
    setBalanceReason('');
    try {
      const detailFn = httpsCallable(functions, 'adminGetUserDetail');
      const res = await detailFn({ uid });
      const detail = res.data.detail;
      setSelectedDetail(detail);
      setEditEmail(detail.email || '');
      setEditPhone(detail.phoneNumber || '');
      setEditWallet(detail.walletAddress || '');
      setEditBalance(String(detail.balance ?? '0'));
    } catch (err) {
      showAlert('Error', err.message || 'Failed to load user details.');
      setDetailModalVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedDetail(null);
    setBalanceReason('');
  };

  const handleSaveChanges = async () => {
    if (!selectedDetail) return;

    const updates = { uid: selectedDetail.uid };
    let hasChanges = false;

    const cleanEmail = editEmail.trim().toLowerCase();
    if (cleanEmail && cleanEmail !== (selectedDetail.email || '')) {
      updates.email = cleanEmail;
      hasChanges = true;
    }

    const cleanPhone = editPhone.trim();
    if (cleanPhone && cleanPhone !== (selectedDetail.phoneNumber || '')) {
      updates.phoneNumber = cleanPhone;
      hasChanges = true;
    }

    const cleanWallet = editWallet.trim();
    if (cleanWallet && cleanWallet !== (selectedDetail.walletAddress || '')) {
      updates.walletAddress = cleanWallet;
      hasChanges = true;
    }

    const numericBalance = parseFloat(editBalance);
    const balanceChanged = !isNaN(numericBalance) && numericBalance !== selectedDetail.balance;
    if (balanceChanged) {
      updates.balance = numericBalance;
      hasChanges = true;

      if (!balanceReason.trim()) {
        showAlert('Reason Required', 'Please enter a reason for changing this balance — it will be recorded in the user\'s transaction history.');
        return;
      }
      updates.balanceReason = balanceReason.trim();
    }

    if (!hasChanges) {
      showAlert('No Changes', "You haven't changed any values yet.");
      return;
    }

    setSaving(true);
    try {
      const updateFn = httpsCallable(functions, 'adminUpdateUserData');
      await updateFn(updates);
      showAlert('Saved', 'User account updated successfully.');
      closeDetailModal();
      handleSearch();
    } catch (err) {
      showAlert('Error', err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (millis) => {
    if (!millis) return 'Not recorded';
    return new Date(millis).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateOnly = (millis) => {
    if (!millis) return 'Not recorded';
    return new Date(millis).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderResultItem = ({ item }) => (
    <TouchableOpacity style={currentStyles.resultCard} onPress={() => openUserDetail(item.uid)}>
      <View style={styles.resultAvatarCircle}>
        <Text style={styles.resultAvatarText}>{(item.username || 'U').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.resultMiddle}>
        <Text style={currentStyles.resultUsername}>{item.username || 'Unknown'}</Text>
        <Text style={styles.resultSubtext} numberOfLines={1}>{item.email || 'No email'}</Text>
        <Text style={styles.resultSubtext} numberOfLines={1}>{item.phoneNumber || 'No phone'}</Text>
      </View>
      <View style={styles.resultRight}>
        <Text style={styles.resultBalance}>${item.balance.toFixed(2)}</Text>
        <Feather name="chevron-right" size={16} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );

  const numericEditBalance = parseFloat(editBalance);
  const showReasonField = selectedDetail && !isNaN(numericEditBalance) && numericEditBalance !== selectedDetail.balance;

  if (accessChecked && !isAdmin) {
    return (
      <SafeAreaView style={currentStyles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={currentStyles.header}>
          <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
          </TouchableOpacity>
          <Text style={currentStyles.headerTitle}>User Management</Text>
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
        <Text style={currentStyles.headerTitle}>User Management</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchSection}>
        <View style={currentStyles.searchWrapper}>
          <Feather name="search" size={16} color={isDarkMode ? "#8B949E" : "#94A3B8"} />
          <TextInput
            style={currentStyles.searchInput}
            placeholder="Exact username, email, phone, wallet, or UID"
            placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color={isDarkMode ? "#8B949E" : "#94A3B8"} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
          {searching ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.searchBtnText}>Search</Text>}
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.uid}
        renderItem={renderResultItem}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 16 + insets.bottom }]}
        ListEmptyComponent={
          !searching && hasSearched ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search-outline" size={32} color={isDarkMode ? "#334155" : "#CBD5E1"} />
              <Text style={styles.emptyText}>No account matched that exact value.</Text>
            </View>
          ) : !hasSearched ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search-outline" size={32} color={isDarkMode ? "#334155" : "#CBD5E1"} />
              <Text style={styles.emptyText}>Search must match the exact username, email, phone number, wallet address, or UID.</Text>
            </View>
          ) : null
        }
      />

      <Modal visible={detailModalVisible} transparent animationType="slide" onRequestClose={closeDetailModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={currentStyles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={currentStyles.modalTitle}>Account Details</Text>
                <TouchableOpacity onPress={closeDetailModal}>
                  <Feather name="x" size={20} color={isDarkMode ? "#94A3B8" : "#64748B"} />
                </TouchableOpacity>
              </View>

              {detailLoading ? (
                <View style={styles.detailLoaderBox}>
                  <ActivityIndicator size="large" color="#2563EB" />
                </View>
              ) : selectedDetail ? (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>

                  <View style={currentStyles.infoBox}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Username</Text>
                      <Text style={currentStyles.infoValue}>{selectedDetail.username || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>UID</Text>
                      <Text style={currentStyles.infoValue} numberOfLines={1}>{selectedDetail.uid}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Registered On</Text>
                      <Text style={currentStyles.infoValue}>{formatDateOnly(selectedDetail.registeredAt)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Current VIP</Text>
                      <Text style={currentStyles.infoValue}>{selectedDetail.currentVip}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Referred By</Text>
                      <Text style={currentStyles.infoValue}>{selectedDetail.referrerUsername || 'None'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Total Earnings</Text>
                      <Text style={currentStyles.infoValue}>${selectedDetail.totalEarnings.toFixed(2)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Total Withdrawn</Text>
                      <Text style={currentStyles.infoValue}>${selectedDetail.totalWithdraw.toFixed(2)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Team Reward</Text>
                      <Text style={currentStyles.infoValue}>${selectedDetail.teamReward.toFixed(2)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Wallet Last Updated</Text>
                      <Text style={currentStyles.infoValue}>{formatDate(selectedDetail.walletAddressUpdatedAt)}</Text>
                    </View>
                  </View>

                  <Text style={currentStyles.sectionLabel}>DEPOSIT HISTORY (VERIFICATION)</Text>
                  <View style={currentStyles.infoBox}>
                    {selectedDetail.deposits && selectedDetail.deposits.length > 0 ? (
                      selectedDetail.deposits.map((dep, idx) => (
                        <React.Fragment key={idx}>
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{formatDate(dep.date)}</Text>
                            <Text style={[currentStyles.infoValue, { color: '#10B981' }]}>+${dep.amount.toFixed(2)}</Text>
                          </View>
                          {idx < selectedDetail.deposits.length - 1 && <View style={currentStyles.teamDivider} />}
                        </React.Fragment>
                      ))
                    ) : (
                      <Text style={styles.joiningNote}>No deposits made yet.</Text>
                    )}
                  </View>

                  <Text style={currentStyles.sectionLabel}>TEAM AND JOININGS</Text>
                  <View style={currentStyles.infoBox}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Direct Team</Text>
                      <Text style={currentStyles.infoValue}>{selectedDetail.directTeamCount}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Indirect Team</Text>
                      <Text style={currentStyles.infoValue}>{selectedDetail.indirectTeamSize}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Total Team Size</Text>
                      <Text style={currentStyles.infoValue}>{selectedDetail.totalTeamSize}</Text>
                    </View>
                    <View style={currentStyles.teamDivider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Today's Joinings</Text>
                      <Text style={currentStyles.infoValue}>{selectedDetail.todayJoinings}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>This Week ({selectedDetail.weekLabel})</Text>
                      <Text style={currentStyles.infoValue}>{selectedDetail.weekJoinings}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>This Month ({selectedDetail.monthLabel})</Text>
                      <Text style={currentStyles.infoValue}>{selectedDetail.monthJoinings}</Text>
                    </View>
                    <Text style={styles.joiningNote}>These joining counts reflect only this user's direct referrals.</Text>
                  </View>

                  <Text style={currentStyles.sectionLabel}>EDITABLE FIELDS</Text>

                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <TextInput
                    style={currentStyles.editInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="Email address"
                    placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                  />

                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <TextInput
                    style={currentStyles.editInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="Phone number (with country code)"
                    placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                  />

                  <Text style={styles.fieldLabel}>Wallet Address</Text>
                  <TextInput
                    style={currentStyles.editInput}
                    value={editWallet}
                    onChangeText={setEditWallet}
                    autoCapitalize="none"
                    placeholder="Wallet address"
                    placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                  />

                  <Text style={styles.fieldLabel}>Balance (USDT)</Text>
                  <TextInput
                    style={currentStyles.editInput}
                    value={editBalance}
                    onChangeText={(t) => setEditBalance(t.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                  />

                  {showReasonField && (
                    <>
                      <Text style={[styles.fieldLabel, { color: '#F59E0B' }]}>
                        Reason for Balance Change (required — will appear in the user's transaction history)
                      </Text>
                      <TextInput
                        style={[currentStyles.editInput, { borderColor: '#F59E0B' }]}
                        value={balanceReason}
                        onChangeText={setBalanceReason}
                        placeholder="e.g. Correcting a duplicate bonus credited in error"
                        placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                        multiline
                      />
                    </>
                  )}

                  <Text style={styles.usernameNote}>Username cannot be changed, matching the app's own permanent-username rule.</Text>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveChanges} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                  </TouchableOpacity>

                </ScrollView>
              ) : null}
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
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#1E293B' },
  resultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  resultUsername: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  modalCard: { width: '90%', maxHeight: '85%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  infoBox: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginTop: 12, marginBottom: 16, gap: 8 },
  infoValue: { fontSize: 12, fontWeight: '700', color: '#334155', maxWidth: '60%', textAlign: 'right' },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 10 },
  editInput: { backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, color: '#1E293B', fontSize: 13, marginBottom: 14 },
  teamDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 4 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#21262D', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#FFFFFF' },
  resultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#21262D' },
  resultUsername: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  modalCard: { width: '90%', maxHeight: '85%', backgroundColor: '#161B22', borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  infoBox: { backgroundColor: '#0D1117', borderRadius: 14, padding: 14, marginTop: 12, marginBottom: 16, gap: 8 },
  infoValue: { fontSize: 12, fontWeight: '700', color: '#E2E8F0', maxWidth: '60%', textAlign: 'right' },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 10 },
  editInput: { backgroundColor: '#0D1117', borderRadius: 10, borderWidth: 1, borderColor: '#21262D', padding: 12, color: '#FFFFFF', fontSize: 13, marginBottom: 14 },
  teamDivider: { height: 1, backgroundColor: '#21262D', marginVertical: 4 }
});

const styles = StyleSheet.create({
  searchSection: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  searchBtn: { backgroundColor: '#3B82F6', height: 44, paddingHorizontal: 18, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  searchBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  listContainer: { paddingHorizontal: 16, paddingTop: 8 },
  resultAvatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(59,130,246,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  resultAvatarText: { fontSize: 15, fontWeight: '800', color: '#3B82F6' },
  resultMiddle: { flex: 1 },
  resultSubtext: { fontSize: 11, fontWeight: '500', color: '#94A3B8', marginTop: 2 },
  resultRight: { alignItems: 'flex-end', gap: 4 },
  resultBalance: { fontSize: 13, fontWeight: '800', color: '#10B981' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8, paddingHorizontal: 30 },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  detailLoaderBox: { paddingVertical: 60, alignItems: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 6 },
  usernameNote: { fontSize: 10, color: '#94A3B8', fontWeight: '500', marginBottom: 16, fontStyle: 'italic' },
  joiningNote: { fontSize: 10, color: '#94A3B8', fontWeight: '500', fontStyle: 'italic', marginTop: 6 },
  saveBtn: { backgroundColor: '#3B82F6', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  accessDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  accessDeniedText: { fontSize: 13, color: '#94A3B8', fontWeight: '500', textAlign: 'center' }
});