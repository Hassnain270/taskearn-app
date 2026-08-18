import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  StatusBar 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemeContext } from '../../ThemeContext';

export default function NoticesScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);

  const announcement = {
    title: "Welcome to TaskEarn Platform",
    time: "Sep 11, 2021 • 10:21 AM",
    short: "We are excited to launch our platform where users can earn rewards, build teams and grow income...",
    full: "We are excited to officially welcome you to our platform. This system was launched in September 2021 with the vision of providing users a reliable earning opportunity. Here you can build your network, complete tasks, and grow your income through referrals and team performance. Our goal is to provide a transparent and long-term earning ecosystem. Stay connected for future updates and official announcements from the company."
  };

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#0B0E14" : "#FFFFFF"} 
      />
      
      <View style={currentStyles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Official Notices</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <Text style={currentStyles.mainTitle}>Announcements</Text>

        <TouchableOpacity 
          style={currentStyles.card} 
          onPress={() => setOpen(!open)}
          activeOpacity={0.7}
        >
          <Text style={currentStyles.annTitle}>{announcement.title}</Text>
          <Text style={styles.time}>{announcement.time}</Text>
          <Text style={currentStyles.text}>
            {open ? announcement.full : announcement.short}
          </Text>
          <Text style={styles.readMore}>
            {open ? "Show Less ▲" : "Read More ▼"}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  annTitle: { color: '#1E293B', fontSize: 16, fontWeight: 'bold' },
  text: { color: '#475569', fontSize: 13, lineHeight: 20 },
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 16 },
  card: { backgroundColor: '#161B22', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#21262D' },
  annTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  text: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },
});

const styles = StyleSheet.create({
  backBtn: { padding: 5 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  time: { color: '#94A3B8', fontSize: 11, marginTop: 4, marginBottom: 10 },
  readMore: { color: '#3B82F6', marginTop: 12, fontSize: 12, fontWeight: 'bold' }
});
