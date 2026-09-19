import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { functions } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { ThemeContext } from '../../ThemeContext';

export default function NoticesScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const getAnnouncements = httpsCallable(functions, 'getAnnouncements');
        const res = await getAnnouncements();
        setAnnouncements((res.data && res.data.announcements) || []);
      } catch (err) {
        console.error('Failed to load announcements:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (ms) => {
    if (!ms) return '';
    return new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView edges={['top']} style={currentStyles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#0B0E14" : "#FFFFFF"}
      />

      <View style={currentStyles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Announcements</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : announcements.length === 0 ? (
        <View style={styles.loaderContainer}>
          <MaterialCommunityIcons name="bullhorn-outline" size={32} color={isDarkMode ? "#334155" : "#CBD5E1"} />
          <Text style={styles.emptyText}>No announcements yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Text style={currentStyles.mainTitle}>Company Announcements</Text>

          {announcements.map((item) => {
            const isOpen = openId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={currentStyles.card}
                onPress={() => setOpenId(isOpen ? null : item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeaderRow}>
                  <MaterialCommunityIcons name="bullhorn-outline" size={18} color="#3B82F6" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={currentStyles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardTime}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={isDarkMode ? "#94A3B8" : "#64748B"} />
                </View>
                <Text style={currentStyles.cardMessage} numberOfLines={isOpen ? undefined : 2}>
                  {item.message}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#1E293B' },
  mainTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 14 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  cardMessage: { fontSize: 12, color: '#64748B', marginTop: 10, lineHeight: 18, fontWeight: '500' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFFFFF' },
  mainTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 14 },
  card: { backgroundColor: '#161B22', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#21262D' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  cardMessage: { fontSize: 12, color: '#94A3B8', marginTop: 10, lineHeight: 18, fontWeight: '500' }
});

const styles = StyleSheet.create({
  backBtn: { padding: 4 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },
  scrollContainer: { padding: 16 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  cardTime: { fontSize: 10, fontWeight: '500', color: '#94A3B8', marginTop: 2 }
});
