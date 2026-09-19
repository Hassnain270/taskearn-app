import React, { useState, useContext } from 'react';
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
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, functions } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(title + '\n\n' + message);
  } else {
    Alert.alert(title, message);
  }
};

const PRESETS = {
  app_update: {
    label: 'App Update',
    icon: 'download-outline',
    color: '#3B82F6',
    title: 'New Update Available',
    message: 'A new version of TaskEarn is now available with improvements and fixes. Please update your app for the best experience.',
  },
  promotion: {
    label: 'Promotion / Offer',
    icon: 'gift-outline',
    color: '#EAB308',
    title: 'Limited-Time Offer',
    message: 'A special bonus offer is now live. Check the details below and take advantage before it ends!',
  },
  custom: {
    label: 'Custom Message',
    icon: 'bullhorn-outline',
    color: '#8B5CF6',
    title: '',
    message: '',
  },
};

export default function AdminSendNotificationScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Where this message is going: the Bell icon's Notifications screen
  // (timely, personal-feeling, supports push + presets like App
  // Update/Promotion), or the Menu's Announcements screen (a simple,
  // durable company-news list with no push and no presets).
  const [destination, setDestination] = useState('notification');

  const [selectedType, setSelectedType] = useState(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [bonusPercent, setBonusPercent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = auth.currentUser;
        if (!user) { setAccessChecked(true); return; }
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

  const selectDestination = (dest) => {
    setDestination(dest);
    setSelectedType(null);
    setTitle('');
    setMessage('');
    setBonusPercent('');
    setStartDate('');
    setEndDate('');
  };

  const selectPreset = (key) => {
    setSelectedType(key);
    setTitle(PRESETS[key].title);
    setMessage(PRESETS[key].message);
    setBonusPercent('');
    setStartDate('');
    setEndDate('');
  };

  const buildPayload = () => {
    if (!title.trim() || !message.trim()) {
      showAlert('Missing Info', 'Title and message are required.');
      return null;
    }

    if (destination === 'announcement') {
      return { title: title.trim(), message: message.trim() };
    }

    if (!selectedType) {
      showAlert('Select a Type', 'Please choose a notification type first.');
      return null;
    }

    const payload = {
      type: selectedType,
      title: title.trim(),
      message: message.trim(),
    };

    if (selectedType === 'promotion') {
      const startMs = startDate ? new Date(startDate).getTime() : 0;
      const endMs = endDate ? new Date(endDate).getTime() : 0;
      if (!startMs || !endMs) {
        showAlert('Missing Dates', 'Please enter both a start date and end date (format: YYYY-MM-DD).');
        return null;
      }
      if (endMs <= startMs) {
        showAlert('Invalid Dates', 'End date must be after the start date.');
        return null;
      }
      payload.startDate = startMs;
      payload.endDate = endMs;
      payload.bonusPercent = Number(bonusPercent) || 0;
    }

    return payload;
  };

  const handleSend = () => {
    const payload = buildPayload();
    if (!payload) return;

    const destinationLabel = destination === 'announcement' ? "the Announcements screen" : "every user's Notifications";
    const confirmMessage = 'This will be sent to ' + destinationLabel + ' immediately. Are you sure?';

    if (Platform.OS === 'web') {
      if (window.confirm('Confirm Send\n\n' + confirmMessage)) {
        performSend(payload);
      }
      return;
    }

    Alert.alert(
      'Confirm Send',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => performSend(payload) }
      ]
    );
  };

  const performSend = async (payload) => {
    setSending(true);
    try {
      const fnName = destination === 'announcement' ? 'sendAnnouncement' : 'sendAdminNotification';
      const sendFn = httpsCallable(functions, fnName);
      await sendFn(payload);
      showAlert('Sent', destination === 'announcement' ? 'Announcement has been posted.' : 'Notification has been sent to all users.');
      setSelectedType(null);
      setTitle('');
      setMessage('');
      setBonusPercent('');
      setStartDate('');
      setEndDate('');
    } catch (err) {
      showAlert('Error', err.message || 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  if (accessChecked && !isAdmin) {
    return (
      <SafeAreaView style={currentStyles.container} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={currentStyles.header}>
          <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
          </TouchableOpacity>
          <Text style={currentStyles.headerTitle}>Send Notification</Text>
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
    <SafeAreaView style={currentStyles.container} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={currentStyles.header}>
        <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Send Notification</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: 20 + insets.bottom }]} showsVerticalScrollIndicator={false}>

          <Text style={currentStyles.sectionLabel}>WHERE SHOULD THIS GO?</Text>
          <View style={styles.destRow}>
            <TouchableOpacity
              style={[currentStyles.destCard, destination === 'notification' && { borderColor: '#3B82F6', borderWidth: 2 }]}
              onPress={() => selectDestination('notification')}
            >
              <Feather name="bell" size={20} color="#3B82F6" />
              <Text style={currentStyles.destLabel}>Notification</Text>
              <Text style={styles.destSubtext}>Bell icon, pushes to devices</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[currentStyles.destCard, destination === 'announcement' && { borderColor: '#EF4444', borderWidth: 2 }]}
              onPress={() => selectDestination('announcement')}
            >
              <MaterialCommunityIcons name="bullhorn-outline" size={20} color="#EF4444" />
              <Text style={currentStyles.destLabel}>Announcement</Text>
              <Text style={styles.destSubtext}>Menu screen, no push</Text>
            </TouchableOpacity>
          </View>

          {destination === 'notification' && (
            <>
              <Text style={currentStyles.sectionLabel}>CHOOSE A TYPE</Text>
              <View style={styles.typeRow}>
                {Object.keys(PRESETS).map((key) => {
                  const preset = PRESETS[key];
                  const active = selectedType === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[currentStyles.typeCard, active && { borderColor: preset.color, borderWidth: 2 }]}
                      onPress={() => selectPreset(key)}
                    >
                      <MaterialCommunityIcons name={preset.icon} size={22} color={preset.color} />
                      <Text style={currentStyles.typeLabel}>{preset.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {(destination === 'announcement' || selectedType) && (
            <>
              <Text style={currentStyles.sectionLabel}>TITLE</Text>
              <TextInput
                style={currentStyles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Title"
                placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
              />

              <Text style={currentStyles.sectionLabel}>MESSAGE</Text>
              <TextInput
                style={[currentStyles.input, { height: 100, textAlignVertical: 'top' }]}
                value={message}
                onChangeText={setMessage}
                placeholder="Message"
                placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                multiline
              />

              {destination === 'notification' && selectedType === 'promotion' && (
                <>
                  <Text style={currentStyles.sectionLabel}>BONUS PERCENTAGE (OPTIONAL)</Text>
                  <TextInput
                    style={currentStyles.input}
                    value={bonusPercent}
                    onChangeText={(t) => setBonusPercent(t.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 15"
                    placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                    keyboardType="number-pad"
                  />

                  <Text style={currentStyles.sectionLabel}>START DATE (YYYY-MM-DD)</Text>
                  <TextInput
                    style={currentStyles.input}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="2026-09-19"
                    placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                  />

                  <Text style={currentStyles.sectionLabel}>END DATE (YYYY-MM-DD)</Text>
                  <TextInput
                    style={currentStyles.input}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="2026-09-26"
                    placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                  />
                </>
              )}

              <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
                {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sendBtnText}>
                  {destination === 'announcement' ? 'Post Announcement' : 'Send to All Users'}
                </Text>}
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  destCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', gap: 4 },
  destLabel: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  typeCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', gap: 6 },
  typeLabel: { fontSize: 10, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  input: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, color: '#1E293B', fontSize: 13 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  destCard: { flex: 1, backgroundColor: '#161B22', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#21262D', gap: 4 },
  destLabel: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  typeCard: { flex: 1, backgroundColor: '#161B22', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#21262D', gap: 6 },
  typeLabel: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  input: { backgroundColor: '#0D1117', borderRadius: 10, borderWidth: 1, borderColor: '#21262D', padding: 12, color: '#FFFFFF', fontSize: 13 }
});

const styles = StyleSheet.create({
  scrollContainer: { padding: 16 },
  destRow: { flexDirection: 'row', gap: 10 },
  destSubtext: { fontSize: 9, fontWeight: '500', color: '#94A3B8', textAlign: 'center', marginTop: 2 },
  typeRow: { flexDirection: 'row', gap: 10 },
  sendBtn: { backgroundColor: '#3B82F6', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  sendBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  accessDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  accessDeniedText: { fontSize: 13, color: '#94A3B8', fontWeight: '500', textAlign: 'center' }
});
