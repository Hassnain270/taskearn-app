import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { ThemeContext } from '../../ThemeContext';

const TYPE_LABELS = {
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  WELCOME_BONUS: 'Welcome Bonus (7%)',
  DIRECT_REFERRAL_BONUS: 'Direct Bonus (10%)',
  INDIRECT_REFERRAL_BONUS: 'Indirect Bonus (5%)',
  VIP_UPGRADE_BONUS: 'VIP Upgrade Bonus (5%)',
  WITHDRAWAL_REJECTED_REFUND: 'Withdrawal Rejected - Refunded',
  TASK_PROFIT: 'Task Commission',
};

const TYPE_ICONS = {
  DEPOSIT: 'cash-plus',
  WITHDRAWAL: 'cash-minus',
  WELCOME_BONUS: 'gift-outline',
  DIRECT_REFERRAL_BONUS: 'account-plus-outline',
  INDIRECT_REFERRAL_BONUS: 'account-multiple-plus-outline',
  VIP_UPGRADE_BONUS: 'crown-outline',
  WITHDRAWAL_REJECTED_REFUND: 'cash-refund',
  TASK_PROFIT: 'clipboard-check-outline',
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'credits', label: 'Credits' },
  { key: 'debits', label: 'Debits' },
];

export default function HistoryScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setTransactions(list);
      setLoading(false);
    }, (error) => {
      console.log('Error fetching transaction history:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const formatDate = (createdAt) => {
    if (!createdAt) return '';
    const date = typeof createdAt.toDate === 'function' ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getIsCredit = (item) => {
    if (item.isCredit !== undefined) return item.isCredit;
    return item.type !== 'WITHDRAWAL';
  };

  const filteredTransactions = transactions.filter((item) => {
    if (activeTab === 'all') return true;
    const isCredit = getIsCredit(item);
    if (activeTab === 'credits') return isCredit;
    if (activeTab === 'debits') return !isCredit;
    return true;
  });

  const renderItem = ({ item }) => {
    const displayType = item.title || TYPE_LABELS[item.type] || item.type || 'Transaction';
    const iconName = TYPE_ICONS[item.type] || 'swap-horizontal';
    const isCredit = getIsCredit(item);
    const accentColor = isCredit ? '#22C55E' : '#EF4444';
    const isPending = item.status === 'pending';

    return (
      <View style={currentStyles.itemRow}>
        <MaterialCommunityIcons name={iconName} size={22} color={accentColor} style={styles.itemIcon} />

        <View style={styles.middleColumn}>
          <Text style={currentStyles.itemTitle} numberOfLines={1}>{displayType}</Text>
          <Text style={styles.itemMeta} numberOfLines={1}>
            TxID: {item.transactionId || item.id}
          </Text>
          <Text style={styles.itemMeta}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.rightColumn}>
          <Text style={[styles.itemAmount, { color: accentColor }]}>
            {isCredit ? '+' : '-'}${Number(item.amount || 0).toFixed(2)}
          </Text>
          <View style={[
            styles.statusBadge,
            isPending ? styles.pendingBadge : styles.approvedBadge
          ]}>
            <Text style={[
              styles.statusText,
              isPending ? styles.pendingText : styles.approvedText
            ]}>
              {isPending ? 'PENDING' : 'APPROVED'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#0B0E14' : '#FFFFFF'}
      />

      <View style={currentStyles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { if (navigation) navigation.goBack(); }}>
          <Feather name="arrow-left" size={22} color={isDarkMode ? '#FFFFFF' : '#1E293B'} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Transaction History</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={currentStyles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              currentStyles.tabLabel,
              activeTab === tab.key && styles.tabLabelActive
            ]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 24 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={currentStyles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="history" size={32} color={isDarkMode ? '#334155' : '#CBD5E1'} />
              <Text style={styles.emptyText}>No transactions recorded yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  tabsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8', paddingVertical: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  separator: { height: 1, backgroundColor: '#F1F5F9' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  tabsRow: { flexDirection: 'row', backgroundColor: '#161B22', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#8B949E', paddingVertical: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B0E14', paddingHorizontal: 16, paddingVertical: 14 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  separator: { height: 1, backgroundColor: '#161B22' }
});

const styles = StyleSheet.create({
  backBtn: { padding: 2 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { flexGrow: 1 },
  tabItem: { marginRight: 28, alignItems: 'center' },
  tabLabelActive: { color: '#3B82F6' },
  tabUnderline: { height: 2, width: '100%', backgroundColor: '#3B82F6', borderRadius: 1, marginTop: -2 },
  itemIcon: { marginRight: 14 },
  middleColumn: { flex: 1, paddingRight: 8, gap: 2 },
  itemMeta: { fontSize: 11, fontWeight: '500', color: '#94A3B8' },
  rightColumn: { alignItems: 'flex-end', gap: 6 },
  itemAmount: { fontSize: 15, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pendingBadge: { backgroundColor: '#FEF3C7' },
  approvedBadge: { backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 9, fontWeight: '800' },
  pendingText: { color: '#D97706' },
  approvedText: { color: '#059669' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500' }
});