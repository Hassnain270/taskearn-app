import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ThemeContext } from '../../ThemeContext';

export default function ProfileParticularsScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [dobText, setDobText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  // Load existing profile details from Firebase Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.fullName) setFullName(data.fullName);
            if (data.gender) setGender(data.gender);
            if (data.dobText) {
              setDobText(data.dobText);
            }
          }
        }
      } catch (error) {
        console.log("Error loading profile data:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleDateChange = (event, selectedDate) => {
    setShowCalendar(Platform.OS === 'ios');
    if (selectedDate) {
      setDob(selectedDate);

      let day = selectedDate.getDate();
      let month = selectedDate.getMonth() + 1;
      let year = selectedDate.getFullYear();

      if (day < 10) day = '0' + day;
      if (month < 10) month = '0' + month;

      setDobText(`${day}-${month}-${year}`);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Input Required", "Please enter your full legal name.");
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          fullName: fullName.trim(),
          gender: gender,
          dobText: dobText
        });

        Alert.alert("Success", "Profile information saved successfully!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert("Error", "User session not found. Please log in again.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update profile details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#0B0E14" : "#FFFFFF"}
      />

      <View style={currentStyles.header}>
        <TouchableOpacity style={currentStyles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={18} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Professional Detail</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {initialLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL LEGAL NAME</Text>
              <TextInput
                style={currentStyles.textInput}
                placeholder="Enter your full name"
                placeholderTextColor={isDarkMode ? "#565D68" : "#94A3B8"}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PROFESSIONAL IDENTITY</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[currentStyles.genderBtn, gender === 'Male' && styles.genderBtnActive]}
                  onPress={() => setGender('Male')}
                >
                  <Text style={[currentStyles.genderBtnText, gender === 'Male' && styles.genderTextActive]}>Male</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[currentStyles.genderBtn, gender === 'Female' && styles.genderBtnActive]}
                  onPress={() => setGender('Female')}
                >
                  <Text style={[currentStyles.genderBtnText, gender === 'Female' && styles.genderTextActive]}>Female</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[currentStyles.genderBtn, gender === 'Other' && styles.genderBtnActive]}
                  onPress={() => setGender('Other')}
                >
                  <Text style={[currentStyles.genderBtnText, gender === 'Other' && styles.genderTextActive]}>Other</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DATE OF BIRTH</Text>
              <TouchableOpacity
                style={[currentStyles.textInput, styles.datePickerTrigger]}
                onPress={() => setShowCalendar(true)}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: dobText ? (isDarkMode ? '#FFFFFF' : '#1E293B') : (isDarkMode ? '#565D68' : '#94A3B8')
                }}>
                  {dobText || "Select your date of birth"}
                </Text>
                <Feather name="calendar" size={16} color={isDarkMode ? "#94A3B8" : "#64748B"} />
              </TouchableOpacity>

              {showCalendar && (
                <DateTimePicker
                  value={dob}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                />
              )}
            </View>

          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <View style={[currentStyles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <TouchableOpacity 
          style={[styles.saveButton, loading && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={loading || initialLoading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  textInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, height: 54, paddingHorizontal: 16, fontSize: 14, color: '#1E293B', fontWeight: '500' },
  genderBtn: { flex: 1, height: 46, backgroundColor: '#FFFFFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  genderBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  footer: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#21262D' },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  textInput: { backgroundColor: '#161B22', borderWidth: 1, borderColor: '#21262D', borderRadius: 16, height: 54, paddingHorizontal: 16, fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  genderBtn: { flex: 1, height: 46, backgroundColor: '#161B22', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#21262D' },
  genderBtnText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  footer: { backgroundColor: '#161B22', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#21262D' }
});

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 20, paddingTop: 25 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inputGroup: { marginBottom: 24 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 10, paddingLeft: 4 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  genderTextActive: { color: '#FFFFFF', fontWeight: '700' },
  datePickerTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveButton: { backgroundColor: '#2563EB', height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' }
});