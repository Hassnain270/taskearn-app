import React, { useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  StatusBar 
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../ThemeContext';

export default function AboutUsScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  // 15 ایشیائی اور عرب ممالک کی فہرست
  const targetCountries = [
    "Pakistan", "Saudi Arabia", "UAE", "Qatar", "Kuwait", 
    "Oman", "Bahrain", "Malaysia", "Indonesia", "Singapore", 
    "Vietnam", "Thailand", "Bangladesh", "Egypt", "Jordan"
  ];

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
        <Text style={currentStyles.headerTitle}>Corporate Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <Text style={currentStyles.mainTitle}>About TaskEarn</Text>

        <Text style={styles.sectionTitle}>1. Company Introduction</Text>
        <Text style={currentStyles.text}>
          TaskEarn is an international e-commerce and task-based digital earning platform
          established in 2021 in Singapore. The platform was designed to connect global
          merchants and users through a transparent, secure, and performance-driven digital ecosystem.
          It enables users to participate in structured digital tasks and online order processing systems
          that simulate real-world e-commerce workflows.
        </Text>

        <Text style={styles.sectionTitle}>2. Vision and Mission</Text>
        <Text style={currentStyles.text}>
          The mission of TaskEarn is to create a global digital economy where individuals can
          access fair earning opportunities regardless of location, background, or financial status.
          The vision is to empower millions of users through technology, automation, and
          decentralized earning systems that promote financial independence and digital literacy.
        </Text>

        <Text style={styles.sectionTitle}>3. Global Network & Key Regions</Text>
        <Text style={currentStyles.text}>
          TaskEarn operates with a rapidly growing global network of merchants and digital partners.
          Millions of merchants and active users engage daily across premier Asian and Middle Eastern markets,
          making TaskEarn one of the fastest-growing task-based ecosystems in the digital economy sector.
        </Text>

        {/* Global Regions Chips */}
        <View style={styles.gridContainer}>
          {targetCountries.map((country, index) => (
            <View key={index} style={currentStyles.countryChip}>
              <Ionicons name="location-sharp" size={13} color="#3B82F6" />
              <Text style={currentStyles.countryText}>{country}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>4. Historical Background</Text>
        <Text style={currentStyles.text}>
          The platform was launched during the global economic disruption caused by the COVID-19 pandemic,
          when millions of people faced unemployment and financial instability. TaskEarn was introduced
          as a solution-oriented system aimed at generating remote income opportunities and supporting
          digital workforce participation across the world.
        </Text>

        <Text style={styles.sectionTitle}>5. Technology & Infrastructure</Text>
        <Text style={currentStyles.text}>
          TaskEarn is built on modern cloud-based architecture with advanced automation systems.
          It integrates blockchain-inspired transparency models for transaction tracking,
          ensuring accountability and traceability of all operations. The system is optimized
          for scalability, security, and high-performance global access.
        </Text>

        <Text style={styles.sectionTitle}>6. Security & Privacy</Text>
        <Text style={currentStyles.text}>
          Security is a core priority of TaskEarn. The platform uses encrypted communication protocols,
          secure payment gateways, and multi-layer verification systems to ensure user data protection.
          User privacy is strictly maintained and no personal data is shared with unauthorized entities.
        </Text>

        <Text style={styles.sectionTitle}>7. Economic Impact</Text>
        <Text style={currentStyles.text}>
          Since its launch, TaskEarn has onboarded over 1.5 million registered users worldwide.
          The platform has contributed to digital employment growth, allowing users to generate
          consistent income through task completion, referral systems, and merchant engagement.
        </Text>

        <Text style={styles.sectionTitle}>8. Future Development</Text>
        <Text style={currentStyles.text}>
          TaskEarn continues to expand its ecosystem by integrating AI-driven task distribution,
          automated financial systems, and enhanced user experience features. The long-term goal
          is to become a leading global digital workforce platform.
        </Text>

        <Text style={styles.sectionTitle}>9. Compliance Notice</Text>
        <Text style={currentStyles.text}>
          TaskEarn operates under internal digital economy guidelines and continuously improves
          its systems to ensure fairness, transparency, and sustainable platform growth.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  mainTitle: { fontSize: 26, fontWeight: 'bold', color: '#1E293B', marginBottom: 10 },
  text: { fontSize: 13, color: '#475569', lineHeight: 21, marginBottom: 14, textAlign: 'justify' },
  countryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, margin: 4 },
  countryText: { fontSize: 12, fontWeight: '600', color: '#1E293B', marginLeft: 5 }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  mainTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 10 },
  text: { fontSize: 13, color: '#CDD5E0', lineHeight: 21, marginBottom: 14, textAlign: 'justify' },
  countryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, margin: 4, borderWidth: 1, borderColor: '#21262D' },
  countryText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', marginLeft: 5 }
});

const styles = StyleSheet.create({
  backBtn: { padding: 5 },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  sectionTitle: { color: '#3B82F6', fontSize: 15, fontWeight: 'bold', marginTop: 16, marginBottom: 6 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, marginTop: 4 }
});
