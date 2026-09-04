import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  TextInput
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, functions } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmAction = window.confirm(`${title}\n\n${message}`);
      if (confirmAction) {
        const primaryBtn = buttons.find(b => b.style !== 'cancel');
        if (primaryBtn && primaryBtn.onPress) primaryBtn.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
      if (buttons && buttons[0] && buttons[0].onPress) buttons[0].onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AdminRewardClaimsScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState('pending');
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  const loadClaims = useCallback(async (status, username) => {
    setLoading(true);
    try {
      const getClaims = httpsCallable(functions, 'adminGetRewardClaims');
      const payload = username ? { username } : { status };
      const res = await getClaims(payload);
      setClaims((res.data && res.data.claims) || []);
    } catch (err) {
      showAlert('Error', err.message || 'Failed to load reward claims.');
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) {
      showAlert('Search Required', 'Enter a username to search their full claim history.');
      return;
    }
    setIsSearchMode(true);
    loadClaims(null, cleanQuery);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    loadClaims(activeTab);
  };

  useEffect(() => {
    const checkAccess = async () => {
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
        await loadClaims('pending');
      } catch (err) {
        setAccessChecked(true);
        setLoading(false);
      }
    };
    checkAccess();
  }, [loadClaims]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setIsSearchMode(false);
    setSearchQuery('');
    loadClaims(tabKey);
  };

  const handleDecision = (claim, newStatus) => {
    const actionLabel = newStatus === 'approved' ? 'Approve' : 'Reject';
    const confirmMessage = newStatus === 'approved'
      ? `Credit $${Number(claim.rewardAmount).toFixed(2)} USDT to ${claim.username}'s balance?`
      : `Reject this reward claim from ${claim.username}? No balance change will be made.`;

    showAlert(
      `${actionLabel} Reward Claim`,
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          onPress: async () => {
            setProcessingId(claim.claimId);
            try {
              const updateStatus = httpsCallable(functions, 'adminUpdateRewardClaimStatus');
              await updateStatus({ claimId: claim.claimId, newStatus });
              if (isSearchMode) {
                setClaims((prev) => prev.map((c) => c.claimId === claim.claimId ? Object.assign({}, c, { status: newStatus }) : c));
              } else {
                setClaims((prev) => prev.filter((c) => c.claimId !== claim.claimId));
              }
              showAlert('Done', `Claim ${newStatus === 'approved' ? 'approved and credited' : 'rejected'} successfully.`);
            } catch (err) {
              showAlert('Error', err.message || 'Failed to update this claim.');
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  const renderClaim = ({ item }) => (
    <View style={currentStyles.claimCard}>
      <View style={styles.claimHeaderRow}>
        <View style={styles.avatarBox}>
          <Feather name="user" size={14} color="#3B82F6" />
        </View>
        <Text style={currentStyles.claimUsername}>{item.username}</Text>
        <Text style={styles.claimAmount}>${Number(item.rewardAmount || 0).toFixed(2)}</Text>
      </View>

      <View style={currentStyles.claimDetailBox}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Active Direct Referrals</Text>
          <Text style={currentStyles.detailValue}>{item.activeDirectCount} / {item.threshold}</Text>
        </View>
        {item.createdAt && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Requested</Text>
            <Text style={currentStyles.detailValue}>{new Date(item.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
          </View>
        )}
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleDecision(item, 'rejected')}
            disabled={processingId === item.claimId}
          >
            {processingId === item.claimId ? (
              <ActivityIndicator color="#EF4444" size="small" />
            ) : (
              <Text style={styles.rejectBtnText}>Reject</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => handleDecision(item, 'approved')}
            disabled={processingId === item.claimId}
          >
            {processingId === item.claimId ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.approveBtnText}>Approve</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {item.status !== 'pending' && (
        <View style={[styles.statusPill, item.status === 'approved' ? styles.statusPillApproved : styles.statusPillRejected]}>
          <MaterialCommunityIcons
            name={item.status === 'approved' ? 'check-circle' : 'close-circle'}
            size={14}
            color={item.status === 'approved' ? '#22C55E' : '#EF4444'}
          />
          <Text style={[styles.statusPillText, { color: item.status === 'approved' ? '#22C55E' : '#EF4444' }]}>
            {item.status === 'approved' ? 'Approved & Credited' : 'Rejected'}
          </Text>
        </View>
      )}
    </View>
  );

  if (accessChecked && !isAdmin) {
    return (
      <SafeAreaView style={currentStyles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={currentStyles.header}>
          <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
          </TouchableOpacity>
          <Text style={currentStyles.headerTitle}>Reward Claims</Text>
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
        <Text style={currentStyles.headerTitle}>Reward Claims</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchSection}>
        <View style={currentStyles.searchWrapper}>
          <Feather name="search" size={16} color={isDarkMode ? "#8B949E" : "#94A3B8"} />
          <TextInput
            style={currentStyles.searchInput}
            placeholder="Search by exact username"
            placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {isSearchMode && (
            <TouchableOpacity onPress={clearSearch}>
              <Feather name="x" size={16} color={isDarkMode ? "#8B949E" : "#94A3B8"} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {isSearchMode && (
        <Text style={styles.searchModeNote}>Showing full claim history for "{searchQuery.trim()}" across all statuses.</Text>
      )}

      <View style={currentStyles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => handleTabChange(tab.key)}
          >
            <Text style={[currentStyles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : claims.length === 0 ? (
        <View style={styles.loaderContainer}>
          <MaterialCommunityIcons name="cash-multiple" size={32} color={isDarkMode ? "#334155" : "#CBD5E1"} />
          <Text style={styles.emptyText}>{isSearchMode ? 'No claims found for that username.' : ('No ' + activeTab + ' reward claims.')}</Text>
        </View>
      ) : (
        <FlatList
          data={claims}
          renderItem={renderClaim}
          keyExtractor={(item) => item.claimId}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 20 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        />
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
  tabRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabButtonText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  claimCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  claimUsername: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginLeft: 8, flex: 1 },
  claimDetailBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, marginTop: 10, marginBottom: 12 },
  detailValue: { fontSize: 11, fontWeight: '700', color: '#1E293B' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#21262D', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#FFFFFF' },
  tabRow: { flexDirection: 'row', backgroundColor: '#161B22', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  tabButtonText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  claimCard: { backgroundColor: '#161B22', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#21262D' },
  claimUsername: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginLeft: 8, flex: 1 },
  claimDetailBox: { backgroundColor: '#0D1117', borderRadius: 12, padding: 10, marginTop: 10, marginBottom: 12 },
  detailValue: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' }
});

const styles = StyleSheet.create({
  searchSection: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  searchBtn: { backgroundColor: '#3B82F6', height: 44, paddingHorizontal: 18, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  searchBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  searchModeNote: { fontSize: 11, color: '#94A3B8', fontWeight: '500', paddingHorizontal: 16, marginBottom: 8, fontStyle: 'italic' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },
  listContainer: { paddingHorizontal: 16, paddingTop: 14 },
  tabButton: { flex: 1, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tabButtonActive: { backgroundColor: 'rgba(59,130,246,0.12)' },
  tabButtonTextActive: { color: '#3B82F6' },
  claimHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(59,130,246,0.1)', justifyContent: 'center', alignItems: 'center' },
  claimAmount: { fontSize: 14, fontWeight: '800', color: '#EAB308' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  detailLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  approveBtn: { backgroundColor: '#22C55E' },
  approveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  rejectBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: '#EF4444' },
  rejectBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  statusPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  statusPillApproved: { backgroundColor: 'rgba(34,197,94,0.12)' },
  statusPillRejected: { backgroundColor: 'rgba(239,68,68,0.12)' },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  accessDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  accessDeniedText: { fontSize: 13, color: '#94A3B8', fontWeight: '500', textAlign: 'center' }
});