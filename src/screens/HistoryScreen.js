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
  DEPOSIT: 'arrow-down-circle',
  WITHDRAWAL: 'arrow-up-circle',
  WELCOME_BONUS: 'gift',
  DIRECT_REFERRAL_BONUS: 'account-plus',
  INDIRECT_REFERRAL_BONUS: 'account-multiple-plus',
  VIP_UPGRADE_BONUS: 'crown',
  WITHDRAWAL_REJECTED_REFUND: 'cash-refund',
  TASK_PROFIT: 'clipboard-check',
};

const TYPE_COLORS = {
  DEPOSIT: '#22C55E',
  WITHDRAWAL: '#EF4444',
  WELCOME_BONUS: '#F59E0B',
  DIRECT_REFERRAL_BONUS: '#3B82F6',
  INDIRECT_REFERRAL_BONUS: '#3B82F6',
  VIP_UPGRADE_BONUS: '#8B5CF6',
  WITHDRAWAL_REJECTED_REFUND: '#22C55E',
  TASK_PROFIT: '#22C55E',
};

export default function HistoryScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderItem = ({ item }) => {
    const displayType = item.title || TYPE_LABELS[item.type] || item.type || 'Transaction';
    const iconName = TYPE_ICONS[item.type] || 'swap-horizontal';
    const accentColor = TYPE_COLORS[item.type] || '#94A3B8';

    const isCredit = item.isCredit !== undefined ? item.isCredit : (item.type !== 'WITHDRAWAL');
    const isPending = item.status === 'pending';

    return (
      <View style={currentStyles.itemCard}>
        <View style={[styles.iconBox, { backgroundColor: accentColor + '1A' }]}>
          <MaterialCommunityIcons name={iconName} size={20} color={accentColor} />
        </View>

        <View style={styles.middleColumn}>
          <Text style={currentStyles.itemTitle} numberOfLines={1}>{displayType}</Text>
          <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.rightColumn}>
          <Text style={[styles.itemAmount, { color: isCredit ? '#22C55E' : '#EF4444' }]}>
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

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 24 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={currentStyles.emptyCard}>
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
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9', marginTop: 20, gap: 8 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#21262D' },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  emptyCard: { backgroundColor: '#161B22', borderRadius: 14, padding: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#21262D', marginTop: 20, gap: 8 }
});

const styles = StyleSheet.create({
  backBtn: { padding: 2 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  middleColumn: { flex: 1, paddingRight: 8 },
  itemDate: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 3 },
  rightColumn: { alignItems: 'flex-end', gap: 5 },
  itemAmount: { fontSize: 14, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pendingBadge: { backgroundColor: '#FEF3C7' },
  approvedBadge: { backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 9, fontWeight: '800' },
  pendingText: { color: '#D97706' },
  approvedText: { color: '#059669' },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500' }
});