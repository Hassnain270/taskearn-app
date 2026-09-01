import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { auth, db, functions } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function AdminPanelScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pushStatus, setPushStatus] = useState('checking'); // checking | registered | denied | unsupported | error
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    const checkAccessAndRegisterPush = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setAccessChecked(true);
          return;
        }
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const admin = userDoc.exists() && userDoc.data().isAdmin === true;
        setIsAdmin(admin);
        setAccessChecked(true);

        if (admin) {
          registerForWithdrawalNotifications();
        }
      } catch (err) {
        setIsAdmin(false);
        setAccessChecked(true);
      }
    };
    checkAccessAndRegisterPush();
  }, []);

  const registerForWithdrawalNotifications = async () => {
    try {
      if (Platform.OS === 'web') {
        setPushStatus('unsupported');
        return;
      }
      if (!Device.isDevice) {
        setPushStatus('unsupported');
        showAlert('Notifications Unavailable', 'Push notifications only work on a real device, not a simulator/emulator.');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setPushStatus('denied');
        showAlert('Permission Denied', 'Notification permission was not granted, so withdrawal alerts cannot be delivered to this device. You can enable it from your phone\'s system Settings > Apps > TaskEarn > Notifications.');
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const expoPushToken = tokenResponse.data;

      if (!expoPushToken) {
        setPushStatus('error');
        showAlert('Registration Failed', 'Could not obtain a push token from Expo. Please try reopening this screen.');
        return;
      }

      const saveToken = httpsCallable(functions, 'saveAdminPushToken');
      await saveToken({ expoPushToken });

      setPushStatus('registered');
    } catch (err) {
      console.log('Push notification registration failed:', err);
      setPushStatus('error');
      showAlert('Registration Failed', err.message || 'Could not register this device for notifications. Please try reopening this screen.');
    }
  };

  const handleSendTestNotification = async () => {
    setTestSending(true);
    try {
      const testFn = httpsCallable(functions, 'sendTestNotificationToMe');
      await testFn();
      showAlert('Test Sent', 'A test notification was sent to this device. If it doesn\'t appear within a few seconds, check that notification permission is granted for TaskEarn in your phone\'s system Settings.');
    } catch (err) {
      showAlert('Test Failed', err.message || 'Failed to send test notification.');
    } finally {
      setTestSending(false);
    }
  };

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

  const statusLabel = {
    checking: 'Checking notification status...',
    registered: 'Withdrawal request notifications are enabled for this device.',
    denied: 'Notification permission was denied for this device.',
    unsupported: 'Push notifications are not available on this device/platform.',
    error: 'Something went wrong registering this device for notifications.',
  }[pushStatus];

  const statusColor = pushStatus === 'registered' ? '#10B981' : (pushStatus === 'checking' ? '#3B82F6' : '#F59E0B');

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

        <Text style={currentStyles.sectionLabel}>WITHDRAWAL NOTIFICATIONS</Text>
        <View style={[currentStyles.noteBox, { borderColor: statusColor + '55' }]}>
          <MaterialCommunityIcons
            name={pushStatus === 'registered' ? "bell-check-outline" : "bell-alert-outline"}
            size={16}
            color={statusColor}
          />
          <Text style={[currentStyles.noteText, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        <TouchableOpacity
          style={[styles.testBtn, pushStatus !== 'registered' && styles.testBtnDisabled]}
          onPress={handleSendTestNotification}
          disabled={pushStatus !== 'registered' || testSending}
        >
          {testSending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.testBtnText}>Send Test Notification to This Device</Text>
          )}
        </TouchableOpacity>
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
  divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 70 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1 },
  noteText: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 15 }
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
  divider: { height: 1, backgroundColor: '#21262D', marginLeft: 70 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#161B22', borderRadius: 12, padding: 12, borderWidth: 1 },
  noteText: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 15 }
});

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  optionTextBlock: { flex: 1 },
  optionSubtitle: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 3, lineHeight: 15 },
  accessDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  accessDeniedText: { fontSize: 13, color: '#94A3B8', fontWeight: '500', textAlign: 'center' },
  testBtn: { backgroundColor: '#3B82F6', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  testBtnDisabled: { backgroundColor: '#94A3B8' },
  testBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' }
});