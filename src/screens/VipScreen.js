import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

const functionsInstance = getFunctions();

export default function VipScreen({ navigation, route }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const [totalBalance, setTotalBalance] = useState(route?.params?.totalBalance || 0.00);
  const [loading, setLoading] = useState(true);

  // Only used for the informational "pending bonus" notice below — NOT for
  // calculating each row's bonus amount anymore (see calculateUpgradeBonus).
  const [lastClaimedVipLevel, setLastClaimedVipLevel] = useState(0);

  // Defaults to the standard rate while the real value loads from the
  // central config, so the displayed upgrade bonuses are never wrong for
  // more than a moment.
  const [vipUpgradeRate, setVipUpgradeRate] = useState(0.05);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTotalBalance(Number(data.balance || 0));
          setLastClaimedVipLevel(Number(data.lastClaimedVipLevel || 0));
        }
        setLoading(false);
      }, () => {
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadBonusRate = async () => {
      try {
        const getBonusConfig = httpsCallable(functionsInstance, 'getBonusConfig');
        const res = await getBonusConfig();
        if (typeof res.data?.rates?.vipUpgradeRate === 'number') {
          setVipUpgradeRate(res.data.rates.vipUpgradeRate);
        }
      } catch (err) {
        // Keep the default rate if this fails — never block the screen.
      }
    };
    loadBonusRate();
  }, []);

  const getActiveVipId = (balance) => {
    if (balance >= 20000.00) return 10;
    if (balance >= 10000.00) return 9;
    if (balance >= 5000.00)  return 8;
    if (balance >= 3000.00)  return 7;
    if (balance >= 1500.00)  return 6;
    if (balance >= 1000.00)  return 5;
    if (balance >= 500.00)   return 4;
    if (balance >= 300.00)   return 3;
    if (balance >= 150.00)   return 2;
    if (balance >= 70.00)    return 1;
    return 0;
  };

  const activeVipId = getActiveVipId(totalBalance);
  const hasPendingBonus = lastClaimedVipLevel < activeVipId;

  const vipData = [
    { id: 1, name: "VIP 1", minCapital: 70, capital: "70-149", profit: "1.16-2.40" },
    { id: 2, name: "VIP 2", minCapital: 150, capital: "150-299", profit: "2.40-4.80" },
    { id: 3, name: "VIP 3", minCapital: 300, capital: "300-499", profit: "4.80-8.00" },
    { id: 4, name: "VIP 4", minCapital: 500, capital: "500-999", profit: "8.00-16.00" },
    { id: 5, name: "VIP 5", minCapital: 1000, capital: "1,000-1,499", profit: "16.00-24.00" },
    { id: 6, name: "VIP 6", minCapital: 1500, capital: "1,500-2,999", profit: "24.00-48.00" },
    { id: 7, name: "VIP 7", minCapital: 3000, capital: "3,000-4,999", profit: "48.00-80.00" },
    { id: 8, name: "VIP 8", minCapital: 5000, capital: "5,000-9,999", profit: "80.00-160.0" },
    { id: 9, name: "VIP 9", minCapital: 10000, capital: "10,000-19,999", profit: "160.0-320.0" },
    { id: 10, name: "VIP 10", minCapital: 20000, capital: "20,000+", profit: "320.0-640.0" },
  ];

  // Shows ONLY the single-step bonus for going from the tier immediately
  // below this one, up to this one — a fixed reference value for that one
  // step alone. It deliberately does NOT add together any earlier tiers
  // the user may have already passed through and been paid for; doing
  // that would show a number bigger than what the backend will actually
  // pay on this specific step, which is exactly the bug that was fixed
  // here.
  const calculateUpgradeBonus = (targetItem) => {
    if (targetItem.id <= activeVipId) return 0;

    const prevTier = vipData.find(v => v.id === targetItem.id - 1);
    const prevCapital = prevTier ? prevTier.minCapital : 0;
    const capitalDiff = targetItem.minCapital - prevCapital;

    return capitalDiff > 0 ? Number((capitalDiff * vipUpgradeRate).toFixed(2)) : 0;
  };

  const activeVipObj = vipData.find(v => v.id === activeVipId);
  const activeVipName = activeVipObj ? activeVipObj.name : "No VIP";

  const passState = {
    totalBalance,
    currentVipLevel: activeVipName
  };

  const handleHomeNavigation = () => {
    navigation.navigate('Home', passState);
  };

  const handleTasksNavigation = () => {
    navigation.navigate('Tasks', passState);
  };

  const handleUnlockNavigation = () => {
    navigation.navigate('Deposit', passState);
  };

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  if (loading) {
    return (
      <SafeAreaView style={[currentStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#0B0E14" : "#FFFFFF"}
      />

      <View style={currentStyles.header}>
        <TouchableOpacity onPress={handleHomeNavigation} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={30} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Investment Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {hasPendingBonus && (
          <View style={currentStyles.pendingBonusBox}>
            <MaterialCommunityIcons name="gift-outline" size={18} color="#EAB308" />
            <Text style={currentStyles.pendingBonusText}>
              You've reached {activeVipName} through your balance. Your upgrade bonus for this level will be credited automatically the next time you complete a daily task.
            </Text>
          </View>
        )}

        {vipData.map((item) => {
          let renderStatusButton;
          const isPreviousVip = item.id < activeVipId;
          const upgradeBonus = calculateUpgradeBonus(item);

          if (item.id === activeVipId) {
            renderStatusButton = (
              <View style={styles.activeLabelBox}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#22C55E" />
                <Text style={styles.activeText}>ACTIVE</Text>
              </View>
            );
          } else if (isPreviousVip) {
            renderStatusButton = (
              <View style={[styles.completedLabelBox, { backgroundColor: isDarkMode ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.15)' }]}>
                <MaterialCommunityIcons name="check" size={14} color="#94A3B8" />
                <Text style={styles.completedText}>COMPLETED</Text>
              </View>
            );
          } else {
            renderStatusButton = (
              <TouchableOpacity style={styles.unlockBtn} onPress={handleUnlockNavigation}>
                <Text style={styles.unlockBtnText}>UNLOCK</Text>
              </TouchableOpacity>
            );
          }

          return (
            <View key={item.id} style={[currentStyles.vipCard, isPreviousVip && styles.disabledCard]}>
              <View style={styles.cardLeft}>
                <View style={[styles.vipBadgeBox, { backgroundColor: isDarkMode ? "#161B22" : "#EFF6FF" }]}>
                  <FontAwesome5 name="crown" size={22} color={item.id === activeVipId ? "#22C55E" : isPreviousVip ? "#94A3B8" : "#3B82F6"} />
                  <Text style={[styles.vipBadgeText, { color: isDarkMode ? "#FFFFFF" : "#1E293B" }]}>{item.name}</Text>
                </View>
              </View>

              <View style={styles.cardCenter}>
                <Text style={styles.capitalLabel}>
                  CAPITAL: <Text style={styles.capitalValue}>${item.capital}</Text>
                </Text>
                <View style={styles.profitBox}>
                  <Text style={currentStyles.profitValue}>${item.profit}</Text>
                  <Text style={styles.profitLabel}>DAILY PROFIT (USDT)</Text>
                </View>
                {upgradeBonus > 0 && (
                  <View style={styles.bonusBadgeContainer}>
                    <MaterialCommunityIcons name="gift-outline" size={12} color="#EAB308" />
                    <Text style={styles.bonusBadgeText}>+${upgradeBonus} USDT Bonus</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardRight}>
                {renderStatusButton}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[currentStyles.bottomTabNav, { paddingBottom: 5 + insets.bottom, height: 65 + insets.bottom }]}>
        <TouchableOpacity style={styles.tabItem} onPress={handleHomeNavigation}>
          <MaterialCommunityIcons name="home" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('Team', passState)}
        >
          <MaterialCommunityIcons name="account-group" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>TEAM</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={handleTasksNavigation}>
          <MaterialCommunityIcons name="clipboard-text" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>TASKS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('Support', passState)}
        >
          <MaterialCommunityIcons name="headset" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>SUPPORT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('Me', passState)}
        >
          <MaterialCommunityIcons name="account" size={24} color="#94A3B8" />
          <Text style={styles.tabText}>ME</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  vipCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 14, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 1.5 },
  profitValue: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  pendingBonusBox: { flexDirection: 'row', backgroundColor: '#FFFBEB', borderRadius: 16, padding: 14, marginBottom: 16, alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#FDE68A' },
  pendingBonusText: { flex: 1, fontSize: 11, color: '#92400E', fontWeight: '500', lineHeight: 16 },
  bottomTabNav: { backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E2E8F0' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  vipCard: { flexDirection: 'row', backgroundColor: '#161B22', borderRadius: 20, padding: 16, marginBottom: 14, alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  profitValue: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  pendingBonusBox: { flexDirection: 'row', backgroundColor: '#2A1F05', borderRadius: 16, padding: 14, marginBottom: 16, alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#92400E' },
  pendingBonusText: { flex: 1, fontSize: 11, color: '#FDE68A', fontWeight: '500', lineHeight: 16 },
  bottomTabNav: { backgroundColor: '#161B22', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#21262D' }
});

const styles = StyleSheet.create({
  backBtn: { padding: 5 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  cardLeft: { marginRight: 12 },
  vipBadgeBox: { alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 16 },
  vipBadgeText: { fontSize: 11, fontWeight: 'bold', marginTop: 3 },
  cardCenter: { flex: 1 },
  capitalLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  capitalValue: { color: '#3B82F6', fontWeight: 'bold' },
  profitBox: { marginTop: 4 },
  profitLabel: { fontSize: 9, fontWeight: 'bold', color: '#22C55E', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  activeLabelBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  activeText: { fontSize: 10, fontWeight: 'bold', color: '#22C55E', marginLeft: 4 },
  completedLabelBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  completedText: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', marginLeft: 4 },
  unlockBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  unlockBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  disabledCard: { opacity: 0.5 },
  bonusBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(234, 179, 8, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 5 },
  bonusBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#EAB308', marginLeft: 4 },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 9, fontWeight: '700', color: '#94A3B8', marginTop: 3 }
});