import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets  } from 'react-native-safe-area-context';
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
  const [editVipCapital, setEditVipCapital] = useState('');
  const [savingVipCapital, setSavingVipCapital] = useState(false);
  const [teamDeleteVisible, setTeamDeleteVisible] = useState(false);
  const [teamPreview, setTeamPreview] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamExcluded, setTeamExcluded] = useState({});
  const [teamConfirmText, setTeamConfirmText] = useState('');
  const [teamReason, setTeamReason] = useState('');
  const [teamDeleting, setTeamDeleting] = useState(false);
  const [restrictedTasksMode, setRestrictedTasksMode] = useState(false);
  const [balanceReason, setBalanceReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [yearInput, setYearInput] = useState('');
  const [monthInput, setMonthInput] = useState('');
  const [monthResult, setMonthResult] = useState(null);
  const [monthLoading, setMonthLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [migrateUsernames, setMigrateUsernames] = useState('');
  const [migrating, setMigrating] = useState(false);

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
    setActiveTab('overview');
    setTransactions([]);
    setTransactionsLoaded(false);
    setHistoryFilter('all');
    setMonthResult(null);
    setYearInput('');
    setMonthInput('');
    setMigrateUsernames('');
    try {
      const detailFn = httpsCallable(functions, 'adminGetUserDetail');
      const res = await detailFn({ uid });
      const detail = res.data.detail;
      setSelectedDetail(detail);
      setEditEmail(detail.email || '');
      setEditPhone(detail.phoneNumber || '');
      setEditWallet(detail.walletAddress || '');
      setEditBalance(String(detail.balance ?? '0'));
      setEditVipCapital(String(detail.vipCapital ?? detail.balance ?? '0'));
      setRestrictedTasksMode(detail.restrictedTasksMode === true);
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

  const [tempPassword, setTempPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(false);

  const openTeamDelete = async () => {
    if (!selectedDetail) return;
    setTeamDeleteVisible(true);
    setTeamPreview(null);
    setTeamExcluded({});
    setTeamConfirmText('');
    setTeamReason('');
    setTeamLoading(true);
    try {
      const fn = httpsCallable(functions, 'adminPreviewTeamDeletion');
      const res = await fn({ uid: selectedDetail.uid });
      setTeamPreview(res.data || null);
    } catch (err) {
      setTeamDeleteVisible(false);
      showAlert('Error', err.message || 'Failed to load the team.');
    } finally {
      setTeamLoading(false);
    }
  };

  const toggleTeamExclude = (uid) => {
    setTeamExcluded((prev) => {
      const next = { ...prev };
      if (next[uid]) delete next[uid]; else next[uid] = true;
      return next;
    });
  };

  const confirmTeamDelete = async () => {
    if (!teamPreview || !selectedDetail) return;
    if (teamConfirmText.trim().toLowerCase() !== String(teamPreview.rootUsername || '').toLowerCase()) {
      showAlert('Confirmation Required', 'Please type the username exactly to confirm.');
      return;
    }
    setTeamDeleting(true);
    try {
      const fn = httpsCallable(functions, 'adminDeleteUserWithTeam');
      const res = await fn({ uid: selectedDetail.uid, excludeUids: Object.keys(teamExcluded), confirmUsername: teamConfirmText.trim(), reason: teamReason.trim() });
      const r = (res && res.data) || {};
      setTeamDeleteVisible(false);
      showAlert('Deleted', (r.deletedCount || 0) + ' account(s) permanently deleted. ' + (r.cancelledWithdrawals || 0) + ' pending withdrawal(s) cancelled. Please go back and refresh the user list.');
    } catch (err) {
      showAlert('Error', err.message || 'Failed to delete.');
    } finally {
      setTeamDeleting(false);
    }
  };

  const handleSaveVipCapital = async () => {
    if (!selectedDetail) return;
    const value = parseFloat(editVipCapital);
    if (isNaN(value) || value < 0) {
      showAlert('Invalid Value', 'VIP capital must be a valid positive number.');
      return;
    }
    setSavingVipCapital(true);
    try {
      const fn = httpsCallable(functions, 'adminSetVipCapital');
      const res = await fn({ uid: selectedDetail.uid, vipCapital: value });
      const saved = res && res.data ? res.data.vipCapital : value;
      setSelectedDetail((prev) => (prev ? { ...prev, vipCapital: saved } : prev));
      showAlert('Saved', 'VIP capital updated to $' + Number(saved).toFixed(2) + '.');
    } catch (err) {
      showAlert('Error', err.message || 'Failed to update VIP capital.');
    } finally {
      setSavingVipCapital(false);
    }
  };

  const handleSetPassword = async () => {
    if (!selectedDetail) return;
    if (!tempPassword || tempPassword.length < 6) {
      showAlert('Invalid Password', 'Password must be at least 6 characters long.');
      return;
    }
    setSettingPassword(true);
    try {
      const setPasswordFn = httpsCallable(functions, 'adminSetUserPassword');
      await setPasswordFn({ uid: selectedDetail.uid, newPassword: tempPassword });
      showAlert('Password Set', 'The user can now log in with this temporary password. Advise them to change it after logging in.');
      setTempPassword('');
    } catch (err) {
      showAlert('Error', err.message || 'Failed to set password.');
    } finally {
      setSettingPassword(false);
    }
  };

  const handleToggleRestriction = async (value) => {
    if (!selectedDetail) return;
    setRestrictedTasksMode(value);
    try {
      const updateFn = httpsCallable(functions, 'adminUpdateUserData');
      await updateFn({ uid: selectedDetail.uid, restrictedTasksMode: value });
    } catch (err) {
      setRestrictedTasksMode(!value);
      showAlert('Error', err.message || 'Failed to update task restriction.');
    }
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

  const handleTabPress = (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey === 'history' && !transactionsLoaded && selectedDetail) {
      loadTransactions(selectedDetail.uid);
    }
  };

  const loadTransactions = async (uid) => {
    setTransactionsLoading(true);
    try {
      const txFn = httpsCallable(functions, 'adminGetUserTransactions');
      const res = await txFn({ uid });
      setTransactions(res.data.transactions || []);
      setTransactionsLoaded(true);
    } catch (err) {
      showAlert('Error', err.message || 'Failed to load transaction history.');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleCheckMonth = async () => {
    if (!selectedDetail) return;
    const y = parseInt(yearInput, 10);
    const m = parseInt(monthInput, 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      showAlert('Invalid Input', 'Enter a valid year (e.g. 2026) and month number (1-12).');
      return;
    }
    setMonthLoading(true);
    try {
      const monthFn = httpsCallable(functions, 'adminGetUserJoiningsForMonth');
      const res = await monthFn({ uid: selectedDetail.uid, year: y, month: m });
      setMonthResult(res.data);
    } catch (err) {
      showAlert('Error', err.message || 'Failed to load joinings for that month.');
    } finally {
      setMonthLoading(false);
    }
  };

  const handleMigrateTeam = async () => {
    if (!selectedDetail) return;
    const usernames = migrateUsernames
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (usernames.length === 0) {
      showAlert('No Usernames', 'Enter at least one username to move, separated by commas or new lines.');
      return;
    }

    setMigrating(true);
    try {
      const migrateFn = httpsCallable(functions, 'adminMigrateTeamMembers');
      const res = await migrateFn({ newUid: selectedDetail.uid, usernames });
      const results = res.data.results || [];
      const summary = results.map((r) => r.username + ': ' + r.status).join('\n');
      showAlert('Migration Complete', summary);
      setMigrateUsernames('');
      openUserDetail(selectedDetail.uid);
    } catch (err) {
      showAlert('Error', err.message || 'Failed to migrate team members.');
    } finally {
      setMigrating(false);
    }
  };

  const handleDeleteUser = () => {
    if (!selectedDetail) return;
    showAlert(
      'Delete This Account',
      `This permanently deletes ${selectedDetail.username || 'this user'}'s account and all their data. This cannot be undone. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const deleteFn = httpsCallable(functions, 'adminDeleteUser');
              await deleteFn({ uid: selectedDetail.uid });
              showAlert('Deleted', 'The account has been permanently removed.');
              closeDetailModal();
              handleSearch();
            } catch (err) {
              showAlert('Error', err.message || 'Failed to delete this account.');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
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
      <SafeAreaView edges={['top']} style={currentStyles.container}>
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
    <SafeAreaView edges={['top']} style={currentStyles.container}>
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

                  <View style={currentStyles.tabRow}>
                    {['overview', 'team', 'history'].map((tabKey) => (
                      <TouchableOpacity
                        key={tabKey}
                        style={[styles.detailTabBtn, activeTab === tabKey && styles.detailTabBtnActive]}
                        onPress={() => handleTabPress(tabKey)}
                      >
                        <Text style={[styles.detailTabText, activeTab === tabKey && styles.detailTabTextActive]}>
                          {tabKey === 'overview' ? 'Overview' : tabKey === 'team' ? 'Team' : 'History'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {activeTab === 'overview' && (
                    <View>
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
                          <Text style={styles.infoLabel}>VIP Capital</Text>
                          <Text style={currentStyles.infoValue}>${Number(selectedDetail.vipCapital ?? 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Last Task Completed</Text>
                          <Text style={currentStyles.infoValue}>{selectedDetail.lastTaskAt ? new Date(selectedDetail.lastTaskAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Referred By</Text>
                          <Text style={currentStyles.infoValue}>{selectedDetail.referrerUsername || 'None'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>
                            {selectedDetail.uplineRank === 'manager' ? 'Team Manager' : selectedDetail.uplineRank === 'supervisor' ? 'Team Supervisor' : 'Team Leader'}
                          </Text>
                          <Text style={currentStyles.infoValue}>{selectedDetail.uplineRankUsername || 'None Yet'}</Text>
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

                      <Text style={styles.fieldLabel}>VIP Capital</Text>
                      <Text style={styles.joiningNote}>Use only for manual corrections. It decides the user's VIP level and daily task profit.</Text>
                      <TextInput
                        style={[currentStyles.editInput, { marginTop: 8 }]}
                        value={editVipCapital}
                        onChangeText={(t) => setEditVipCapital(t.replace(/[^0-9.]/g, ''))}
                        keyboardType="decimal-pad"
                      />
                      <TouchableOpacity style={[styles.saveBtn, { marginTop: 10, marginBottom: 16 }]} onPress={handleSaveVipCapital} disabled={savingVipCapital}>
                        {savingVipCapital ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save VIP Capital</Text>}
                      </TouchableOpacity>

                      <TouchableOpacity style={{ backgroundColor: '#DC2626', height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8, marginBottom: 16 }} onPress={openTeamDelete}>
                        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Delete Account With Team</Text>
                      </TouchableOpacity>

                      {showReasonField && (
                        <React.Fragment>
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
                        </React.Fragment>
                      )}

                      <Text style={styles.usernameNote}>Username cannot be changed, matching the app's own permanent-username rule.</Text>

                      <View style={currentStyles.infoBox}>
                        <View style={styles.infoRow}>
                          <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={currentStyles.infoValue}>Restrict Daily Tasks</Text>
                            <Text style={styles.joiningNote}>Randomly fails ~50% of task attempts. Use for accounts that withdraw more than they contribute without bringing new referrals.</Text>
                          </View>
                          <Switch value={restrictedTasksMode} onValueChange={handleToggleRestriction} trackColor={{ true: '#EF4444' }} />
                        </View>
                      </View>

                      <View style={currentStyles.infoBox}>
                        <Text style={currentStyles.infoValue}>Set Temporary Password</Text>
                        <Text style={styles.joiningNote}>Use when a user can't log in and OTP/Forgot Password isn't working. They should change it themselves after logging in.</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                          <TextInput
                            style={[currentStyles.editInput, { flex: 1 }]}
                            value={tempPassword}
                            onChangeText={setTempPassword}
                            placeholder="New temporary password (min 6 chars)"
                            placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                            secureTextEntry={!showTempPassword}
                          />
                          <TouchableOpacity onPress={() => setShowTempPassword(!showTempPassword)} style={{ marginLeft: -36, padding: 8 }}>
                            <Feather name={showTempPassword ? 'eye-off' : 'eye'} size={18} color={isDarkMode ? "#94A3B8" : "#64748B"} />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={[styles.saveBtn, { marginTop: 10 }]} onPress={handleSetPassword} disabled={settingPassword}>
                          {settingPassword ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Set Password</Text>}
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity style={styles.saveBtn} onPress={handleSaveChanges} disabled={saving}>
                        {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                      </TouchableOpacity>

                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteUser} disabled={deleting}>
                        {deleting ? <ActivityIndicator color="#EF4444" /> : <Text style={styles.deleteBtnText}>Delete This Account</Text>}
                      </TouchableOpacity>
                    </View>
                  )}

                  {activeTab === 'team' && (
                    <View>
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
                      </View>

                      <Text style={currentStyles.sectionLabel}>ACTIVE DIRECT MEMBERS ({(selectedDetail.activeMembers || []).length})</Text>
                      <View style={currentStyles.infoBox}>
                        {(selectedDetail.activeMembers || []).length > 0 ? (
                          selectedDetail.activeMembers.map((name, idx) => (
                            <Text key={idx} style={currentStyles.infoValue}>{name}</Text>
                          ))
                        ) : (
                          <Text style={styles.joiningNote}>None yet.</Text>
                        )}
                      </View>

                      <Text style={currentStyles.sectionLabel}>INACTIVE DIRECT MEMBERS ({(selectedDetail.inactiveMembers || []).length})</Text>
                      <View style={currentStyles.infoBox}>
                        {(selectedDetail.inactiveMembers || []).length > 0 ? (
                          selectedDetail.inactiveMembers.map((name, idx) => (
                            <Text key={idx} style={currentStyles.infoValue}>{name}</Text>
                          ))
                        ) : (
                          <Text style={styles.joiningNote}>None.</Text>
                        )}
                      </View>

                      <Text style={currentStyles.sectionLabel}>CHECK A PAST MONTH</Text>
                      <View style={currentStyles.infoBox}>
                        <View style={styles.monthPickerRow}>
                          <TextInput
                            style={[currentStyles.editInput, styles.monthInputSmall, { marginBottom: 0 }]}
                            value={yearInput}
                            onChangeText={(t) => setYearInput(t.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            placeholder="Year e.g. 2026"
                            placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                          />
                          <TextInput
                            style={[currentStyles.editInput, styles.monthInputSmall, { marginBottom: 0 }]}
                            value={monthInput}
                            onChangeText={(t) => setMonthInput(t.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            placeholder="Month 1-12"
                            placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                          />
                          <TouchableOpacity style={styles.checkMonthBtn} onPress={handleCheckMonth} disabled={monthLoading}>
                            {monthLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.checkMonthBtnText}>Check</Text>}
                          </TouchableOpacity>
                        </View>
                        {monthResult && (
                          <View style={{ marginTop: 10 }}>
                            <Text style={styles.joiningNote}>{monthResult.monthLabel}: {monthResult.count} joining(s)</Text>
                            {monthResult.members.map((m, idx) => (
                              <Text key={idx} style={currentStyles.infoValue}>{m.username} {m.isActive ? '(active)' : '(inactive)'}</Text>
                            ))}
                          </View>
                        )}
                      </View>

                      <Text style={currentStyles.sectionLabel}>MOVE MEMBERS INTO THIS USER'S TEAM</Text>
                      <View style={currentStyles.infoBox}>
                        <Text style={styles.joiningNote}>Enter usernames (comma or new-line separated) of members who should become this user's direct referrals. Their own sub-teams move with them automatically.</Text>
                        <TextInput
                          style={[currentStyles.editInput, { height: 90, textAlignVertical: 'top', marginTop: 10 }]}
                          value={migrateUsernames}
                          onChangeText={setMigrateUsernames}
                          autoCapitalize="none"
                          multiline
                          placeholder={'username1, username2, username3'}
                          placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                        />
                        <TouchableOpacity style={styles.checkMonthBtn} onPress={handleMigrateTeam} disabled={migrating}>
                          {migrating ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.checkMonthBtnText}>Move These Members Here</Text>}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {activeTab === 'history' && (
                    <View>
                      <View style={styles.txFilterRow}>
                        {['all', 'credit', 'debit'].map((f) => (
                          <TouchableOpacity
                            key={f}
                            style={[styles.txFilterBtn, historyFilter === f && styles.txFilterBtnActive]}
                            onPress={() => setHistoryFilter(f)}
                          >
                            <Text style={[styles.detailTabText, historyFilter === f && styles.detailTabTextActive]}>
                              {f === 'all' ? 'All' : f === 'credit' ? 'Credited' : 'Debited'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {transactionsLoading ? (
                        <View style={styles.detailLoaderBox}>
                          <ActivityIndicator size="large" color="#2563EB" />
                        </View>
                      ) : (() => {
                        const filtered = transactions.filter((t) => {
                          if (historyFilter === 'all') return true;
                          const isCredit = t.isCredit !== false;
                          return historyFilter === 'credit' ? isCredit : !isCredit;
                        });
                        if (filtered.length === 0) {
                          return <Text style={styles.joiningNote}>No transactions found.</Text>;
                        }
                        return filtered.map((t, idx) => {
                          const isCredit = t.isCredit !== false;
                          return (
                            <View key={idx} style={currentStyles.infoBox}>
                              <View style={styles.infoRow}>
                                <Text style={currentStyles.infoValue}>{t.title}</Text>
                                <Text style={[styles.txAmount, { color: isCredit ? '#10B981' : '#EF4444' }]}>
                                  {isCredit ? '+' : '-'}{'$' + Number(t.amount).toFixed(2)}
                                </Text>
                              </View>
                              <Text style={styles.joiningNote}>{t.date ? formatDate(t.date) : 'Date unknown'}</Text>
                              {t.reason ? <Text style={styles.joiningNote}>Reason: {t.reason}</Text> : null}
                            </View>
                          );
                        });
                      })()}
                    </View>
                  )}

                </ScrollView>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    {teamDeleteVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 16, zIndex: 9999, elevation: 9999 }}>
          <View style={{ backgroundColor: isDarkMode ? '#161B22' : '#FFFFFF', borderRadius: 18, padding: 16, maxHeight: '92%' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#DC2626', marginBottom: 4 }}>Delete Account With Team</Text>
            <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 10 }}>Tap an account to KEEP it (its team will also be kept). All others will be permanently deleted.</Text>
            {teamLoading || !teamPreview ? (
              <ActivityIndicator color="#DC2626" style={{ marginVertical: 30 }} />
            ) : (
              <>
                <ScrollView style={{ maxHeight: 300, marginBottom: 10 }}>
                  {(teamPreview.members || []).map((m) => {
                    const kept = !!teamExcluded[m.uid];
                    return (
                      <TouchableOpacity key={m.uid} disabled={m.level === 0} onPress={() => toggleTeamExclude(m.uid)} style={{ paddingVertical: 8, paddingLeft: 8 + Math.min(m.level, 6) * 14, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#21262D' : '#F1F5F9', backgroundColor: kept ? 'rgba(34,197,94,0.12)' : 'transparent' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: kept ? '#22C55E' : (isDarkMode ? '#FFFFFF' : '#1E293B'), textDecorationLine: kept ? 'none' : 'none' }}>{(m.level === 0 ? 'ROOT  ' : 'L' + m.level + '  ') + m.username}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: kept ? '#22C55E' : '#DC2626' }}>{kept ? 'KEEP' : 'DELETE'}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{'Bal $' + Number(m.balance || 0).toFixed(2) + '  |  Dep $' + Number(m.deposited || 0).toFixed(2) + '  |  Wd $' + Number(m.withdrawn || 0).toFixed(2) + (m.hasPendingWithdrawal ? '  |  PENDING WD' : '') + (m.isAdmin ? '  |  ADMIN (skipped)' : '')}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#FFFFFF' : '#1E293B', marginBottom: 8 }}>{'Accounts in chain: ' + (teamPreview.members || []).length + '  |  Marked KEEP: ' + Object.keys(teamExcluded).length}</Text>
                <TextInput style={{ borderWidth: 1, borderColor: isDarkMode ? '#30363D' : '#E2E8F0', borderRadius: 10, padding: 10, marginBottom: 8, color: isDarkMode ? '#FFFFFF' : '#1E293B' }} placeholder="Reason (e.g. self-referral chain)" placeholderTextColor="#94A3B8" value={teamReason} onChangeText={setTeamReason} />
                <TextInput style={{ borderWidth: 1, borderColor: '#DC2626', borderRadius: 10, padding: 10, marginBottom: 12, color: isDarkMode ? '#FFFFFF' : '#1E293B' }} placeholder={'Type "' + teamPreview.rootUsername + '" to confirm'} placeholderTextColor="#94A3B8" autoCapitalize="none" value={teamConfirmText} onChangeText={setTeamConfirmText} />
              </>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity disabled={teamDeleting} onPress={() => setTeamDeleteVisible(false)} style={{ flex: 1, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(148,163,184,0.18)' }}>
                <Text style={{ color: '#94A3B8', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={teamDeleting || teamLoading || !teamPreview} onPress={confirmTeamDelete} style={{ flex: 1, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#DC2626' }}>
                {teamDeleting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Delete Permanently</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
  teamDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  tabRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 4, marginBottom: 14, gap: 4 }
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
  teamDivider: { height: 1, backgroundColor: '#21262D', marginVertical: 4 },
  tabRow: { flexDirection: 'row', backgroundColor: '#0D1117', borderRadius: 12, padding: 4, marginBottom: 14, gap: 4 }
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
  accessDeniedText: { fontSize: 13, color: '#94A3B8', fontWeight: '500', textAlign: 'center' },
  detailTabBtn: { flex: 1, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  detailTabBtnActive: { backgroundColor: 'rgba(59,130,246,0.15)' },
  detailTabText: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
  detailTabTextActive: { color: '#3B82F6' },
  monthPickerRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  monthInputSmall: { flex: 1 },
  checkMonthBtn: { backgroundColor: '#3B82F6', height: 44, paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  checkMonthBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  txFilterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  txFilterBtn: { flex: 1, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(148,163,184,0.12)' },
  txFilterBtnActive: { backgroundColor: 'rgba(59,130,246,0.15)' },
  txAmount: { fontSize: 12, fontWeight: '800' },
  deleteBtn: { height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)' },
  deleteBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '700' }
});
