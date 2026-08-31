import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { ThemeContext } from '../../ThemeContext';

export default function AdminPanelScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  const safeNavigate = (targetScreen) => {
    try {
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate(targetScreen);
      }
    } catch (err) {}
  };

  if (accessChecked && !isAdmin) {
    return (
      <SafeAreaView style={currentStyles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={currentStyles.header}>
          <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
          </TouchableOpacity>
          <Text style={currentStyles.headerTitle}>Admin Panel</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.accessDeniedContainer}>
          <MaterialCommunityIcons name="shield-lock-outline" size={40} color={isDarkMode ? "#334155" : "#CBD5E1"} />
          <Text style={styles.accessDeniedText}>You don't have permission to view this page.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const panelItems = [
    {
      title: 'Withdrawal Approvals',
      subtitle: 'Review and process pending withdrawal requests',
      icon: 'check-square',
      target: 'AdminWithdrawalsScreen',
    },
    {
      title: 'Bonus Settings',
      subtitle: 'Adjust welcome, referral, VIP upgrade, and task bonus rates',
      icon: 'percent',
      target: 'AdminBonusConfigScreen',
    },
    {
      title: 'User Management',
      subtitle: 'Search accounts and view or edit their details',
      icon: 'users',
      target: 'AdminUserManagementScreen',
    },
  ];

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={currentStyles.header}>
        <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Admin Panel</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={currentStyles.optionsGroup}>
          {panelItems.map((item, index) => (
            <React.Fragment key={item.target}>
              <TouchableOpacity
                style={currentStyles.optionItem}
                activeOpacity={0.7}
                onPress={() => safeNavigate(item.target)}
              >
                <View style={styles.optionLeft}>
                  <View style={currentStyles.iconWrapper}>
                    <Feather name={item.icon} size={18} color="#2563EB" />
                  </View>
                  <View style={styles.optionTextBlock}>
                    <Text style={currentStyles.optionTitle}>{item.title}</Text>
                    <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color="#94A3B8" />
              </TouchableOpacity>
              {index < panelItems.length - 1 && <View style={currentStyles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  optionsGroup: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 16 },
  iconWrapper: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  optionTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 70 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  optionsGroup: { backgroundColor: '#161B22', borderRadius: 16, borderWidth: 1, borderColor: '#21262D', overflow: 'hidden' },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 16 },
  iconWrapper: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  optionTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#21262D', marginLeft: 70 }
});

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 20, paddingTop: 20 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  optionTextBlock: { flex: 1 },
  optionSubtitle: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 3, lineHeight: 15 },
  accessDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  accessDeniedText: { fontSize: 13, color: '#94A3B8', fontWeight: '500', textAlign: 'center' }
});