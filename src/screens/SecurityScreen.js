import React, { useState, useMemo, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import {
  updatePassword,
  verifyBeforeUpdateEmail,
  signOut,
  linkWithCredential,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { sendSMSOTP, verifySMSOTP } from '../services/phoneAuthService';
import PhoneVerifyBridge from '../components/PhoneVerifyBridge';
import { ThemeContext } from '../../ThemeContext';

const functionsInstance = getFunctions();

const ALL_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', dial_code: '+93', minLen: 9, maxLen: 9 },
  { code: 'AL', name: 'Albania', dial_code: '+355', minLen: 9, maxLen: 9 },
  { code: 'DZ', name: 'Algeria', dial_code: '+213', minLen: 9, maxLen: 9 },
  { code: 'AS', name: 'American Samoa', dial_code: '+1684', minLen: 7, maxLen: 7 },
  { code: 'AD', name: 'Andorra', dial_code: '+376', minLen: 6, maxLen: 6 },
  { code: 'AO', name: 'Angola', dial_code: '+244', minLen: 9, maxLen: 9 },
  { code: 'AI', name: 'Anguilla', dial_code: '+1264', minLen: 7, maxLen: 7 },
  { code: 'AG', name: 'Antigua and Barbuda', dial_code: '+1268', minLen: 7, maxLen: 7 },
  { code: 'AR', name: 'Argentina', dial_code: '+54', minLen: 10, maxLen: 11 },
  { code: 'AM', name: 'Armenia', dial_code: '+374', minLen: 8, maxLen: 8 },
  { code: 'AW', name: 'Aruba', dial_code: '+297', minLen: 7, maxLen: 7 },
  { code: 'AU', name: 'Australia', dial_code: '+61', minLen: 9, maxLen: 9 },
  { code: 'AT', name: 'Austria', dial_code: '+43', minLen: 4, maxLen: 13 },
  { code: 'AZ', name: 'Azerbaijan', dial_code: '+994', minLen: 9, maxLen: 9 },
  { code: 'BS', name: 'Bahamas', dial_code: '+1242', minLen: 7, maxLen: 7 },
  { code: 'BH', name: 'Bahrain', dial_code: '+973', minLen: 8, maxLen: 8 },
  { code: 'BD', name: 'Bangladesh', dial_code: '+880', minLen: 10, maxLen: 10 },
  { code: 'BB', name: 'Barbados', dial_code: '+1246', minLen: 7, maxLen: 7 },
  { code: 'BY', name: 'Belarus', dial_code: '+375', minLen: 9, maxLen: 9 },
  { code: 'BE', name: 'Belgium', dial_code: '+32', minLen: 9, maxLen: 9 },
  { code: 'BZ', name: 'Belize', dial_code: '+501', minLen: 7, maxLen: 7 },
  { code: 'BJ', name: 'Benin', dial_code: '+229', minLen: 8, maxLen: 8 },
  { code: 'BM', name: 'Bermuda', dial_code: '+1441', minLen: 7, maxLen: 7 },
  { code: 'BT', name: 'Bhutan', dial_code: '+975', minLen: 8, maxLen: 8 },
  { code: 'BO', name: 'Bolivia', dial_code: '+591', minLen: 8, maxLen: 8 },
  { code: 'BA', name: 'Bosnia and Herzegovina', dial_code: '+387', minLen: 8, maxLen: 9 },
  { code: 'BW', name: 'Botswana', dial_code: '+267', minLen: 8, maxLen: 8 },
  { code: 'BR', name: 'Brazil', dial_code: '+55', minLen: 10, maxLen: 11 },
  { code: 'BN', name: 'Brunei', dial_code: '+673', minLen: 7, maxLen: 7 },
  { code: 'BG', name: 'Bulgaria', dial_code: '+359', minLen: 8, maxLen: 9 },
  { code: 'BF', name: 'Burkina Faso', dial_code: '+226', minLen: 8, maxLen: 8 },
  { code: 'BI', name: 'Burundi', dial_code: '+257', minLen: 8, maxLen: 8 },
  { code: 'KH', name: 'Cambodia', dial_code: '+855', minLen: 8, maxLen: 9 },
  { code: 'CM', name: 'Cameroon', dial_code: '+237', minLen: 9, maxLen: 9 },
  { code: 'CA', name: 'Canada', dial_code: '+1', minLen: 10, maxLen: 10 },
  { code: 'CV', name: 'Cape Verde', dial_code: '+238', minLen: 7, maxLen: 7 },
  { code: 'KY', name: 'Cayman Islands', dial_code: '+1345', minLen: 7, maxLen: 7 },
  { code: 'CF', name: 'Central African Republic', dial_code: '+236', minLen: 8, maxLen: 8 },
  { code: 'TD', name: 'Chad', dial_code: '+235', minLen: 8, maxLen: 8 },
  { code: 'CL', name: 'Chile', dial_code: '+56', minLen: 9, maxLen: 9 },
  { code: 'CN', name: 'China', dial_code: '+86', minLen: 11, maxLen: 11 },
  { code: 'CO', name: 'Colombia', dial_code: '+57', minLen: 10, maxLen: 10 },
  { code: 'KM', name: 'Comoros', dial_code: '+269', minLen: 7, maxLen: 7 },
  { code: 'CG', name: 'Congo', dial_code: '+242', minLen: 9, maxLen: 9 },
  { code: 'CR', name: 'Costa Rica', dial_code: '+506', minLen: 8, maxLen: 8 },
  { code: 'HR', name: 'Croatia', dial_code: '+385', minLen: 9, maxLen: 9 },
  { code: 'CU', name: 'Cuba', dial_code: '+53', minLen: 8, maxLen: 8 },
  { code: 'CY', name: 'Cyprus', dial_code: '+357', minLen: 8, maxLen: 8 },
  { code: 'CZ', name: 'Czech Republic', dial_code: '+420', minLen: 9, maxLen: 9 },
  { code: 'DK', name: 'Denmark', dial_code: '+45', minLen: 8, maxLen: 8 },
  { code: 'DJ', name: 'Djibouti', dial_code: '+253', minLen: 8, maxLen: 8 },
  { code: 'DM', name: 'Dominica', dial_code: '+1767', minLen: 7, maxLen: 7 },
  { code: 'DO', name: 'Dominican Republic', dial_code: '+1809', minLen: 7, maxLen: 7 },
  { code: 'EC', name: 'Ecuador', dial_code: '+593', minLen: 9, maxLen: 9 },
  { code: 'EG', name: 'Egypt', dial_code: '+20', minLen: 10, maxLen: 10 },
  { code: 'SV', name: 'El Salvador', dial_code: '+503', minLen: 8, maxLen: 8 },
  { code: 'GQ', name: 'Equatorial Guinea', dial_code: '+240', minLen: 9, maxLen: 9 },
  { code: 'ER', name: 'Eritrea', dial_code: '+291', minLen: 7, maxLen: 7 },
  { code: 'EE', name: 'Estonia', dial_code: '+372', minLen: 7, maxLen: 10 },
  { code: 'ET', name: 'Ethiopia', dial_code: '+251', minLen: 9, maxLen: 9 },
  { code: 'FJ', name: 'Fiji', dial_code: '+679', minLen: 7, maxLen: 7 },
  { code: 'FI', name: 'Finland', dial_code: '+358', minLen: 5, maxLen: 12 },
  { code: 'FR', name: 'France', dial_code: '+33', minLen: 9, maxLen: 9 },
  { code: 'GA', name: 'Gabon', dial_code: '+241', minLen: 7, maxLen: 7 },
  { code: 'GM', name: 'Gambia', dial_code: '+220', minLen: 7, maxLen: 7 },
  { code: 'GE', name: 'Georgia', dial_code: '+995', minLen: 9, maxLen: 9 },
  { code: 'DE', name: 'Germany', dial_code: '+49', minLen: 10, maxLen: 11 },
  { code: 'GH', name: 'Ghana', dial_code: '+233', minLen: 9, maxLen: 9 },
  { code: 'GR', name: 'Greece', dial_code: '+30', minLen: 10, maxLen: 10 },
  { code: 'GD', name: 'Grenada', dial_code: '+1473', minLen: 7, maxLen: 7 },
  { code: 'GT', name: 'Guatemala', dial_code: '+502', minLen: 8, maxLen: 8 },
  { code: 'GN', name: 'Guinea', dial_code: '+224', minLen: 9, maxLen: 9 },
  { code: 'GY', name: 'Guyana', dial_code: '+592', minLen: 7, maxLen: 7 },
  { code: 'HT', name: 'Haiti', dial_code: '+509', minLen: 8, maxLen: 8 },
  { code: 'HN', name: 'Honduras', dial_code: '+504', minLen: 8, maxLen: 8 },
  { code: 'HK', name: 'Hong Kong', dial_code: '+852', minLen: 8, maxLen: 8 },
  { code: 'HU', name: 'Hungary', dial_code: '+36', minLen: 9, maxLen: 9 },
  { code: 'IS', name: 'Iceland', dial_code: '+354', minLen: 7, maxLen: 7 },
  { code: 'IN', name: 'India', dial_code: '+91', minLen: 10, maxLen: 10 },
  { code: 'ID', name: 'Indonesia', dial_code: '+62', minLen: 9, maxLen: 12 },
  { code: 'IR', name: 'Iran', dial_code: '+98', minLen: 10, maxLen: 10 },
  { code: 'IQ', name: 'Iraq', dial_code: '+964', minLen: 10, maxLen: 10 },
  { code: 'IE', name: 'Ireland', dial_code: '+353', minLen: 9, maxLen: 9 },
  { code: 'IL', name: 'Israel', dial_code: '+972', minLen: 9, maxLen: 9 },
  { code: 'IT', name: 'Italy', dial_code: '+39', minLen: 10, maxLen: 10 },
  { code: 'JM', name: 'Jamaica', dial_code: '+1876', minLen: 7, maxLen: 7 },
  { code: 'JP', name: 'Japan', dial_code: '+81', minLen: 10, maxLen: 10 },
  { code: 'JO', name: 'Jordan', dial_code: '+962', minLen: 9, maxLen: 9 },
  { code: 'KZ', name: 'Kazakhstan', dial_code: '+7', minLen: 10, maxLen: 10 },
  { code: 'KE', name: 'Kenya', dial_code: '+254', minLen: 9, maxLen: 9 },
  { code: 'KW', name: 'Kuwait', dial_code: '+965', minLen: 8, maxLen: 8 },
  { code: 'KG', name: 'Kyrgyzstan', dial_code: '+996', minLen: 9, maxLen: 9 },
  { code: 'LA', name: 'Laos', dial_code: '+856', minLen: 8, maxLen: 10 },
  { code: 'LV', name: 'Latvia', dial_code: '+371', minLen: 8, maxLen: 8 },
  { code: 'LB', name: 'Lebanon', dial_code: '+961', minLen: 7, maxLen: 8 },
  { code: 'LR', name: 'Liberia', dial_code: '+231', minLen: 7, maxLen: 8 },
  { code: 'LY', name: 'Libya', dial_code: '+218', minLen: 9, maxLen: 9 },
  { code: 'LT', name: 'Lithuania', dial_code: '+370', minLen: 8, maxLen: 8 },
  { code: 'LU', name: 'Luxembourg', dial_code: '+352', minLen: 9, maxLen: 9 },
  { code: 'MO', name: 'Macao', dial_code: '+853', minLen: 8, maxLen: 8 },
  { code: 'MK', name: 'Macedonia', dial_code: '+389', minLen: 8, maxLen: 8 },
  { code: 'MG', name: 'Madagascar', dial_code: '+261', minLen: 9, maxLen: 9 },
  { code: 'MW', name: 'Malawi', dial_code: '+265', minLen: 7, maxLen: 9 },
  { code: 'MY', name: 'Malaysia', dial_code: '+60', minLen: 9, maxLen: 10 },
  { code: 'MV', name: 'Maldives', dial_code: '+960', minLen: 7, maxLen: 7 },
  { code: 'ML', name: 'Mali', dial_code: '+223', minLen: 8, maxLen: 8 },
  { code: 'MT', name: 'Malta', dial_code: '+356', minLen: 8, maxLen: 8 },
  { code: 'MR', name: 'Mauritania', dial_code: '+222', minLen: 8, maxLen: 8 },
  { code: 'MU', name: 'Mauritius', dial_code: '+230', minLen: 7, maxLen: 7 },
  { code: 'MX', name: 'Mexico', dial_code: '+52', minLen: 10, maxLen: 10 },
  { code: 'MD', name: 'Moldova', dial_code: '+373', minLen: 8, maxLen: 8 },
  { code: 'MC', name: 'Monaco', dial_code: '+377', minLen: 8, maxLen: 9 },
  { code: 'MN', name: 'Mongolia', dial_code: '+976', minLen: 8, maxLen: 8 },
  { code: 'ME', name: 'Montenegro', dial_code: '+382', minLen: 8, maxLen: 8 },
  { code: 'MA', name: 'Morocco', dial_code: '+212', minLen: 9, maxLen: 9 },
  { code: 'MZ', name: 'Mozambique', dial_code: '+258', minLen: 9, maxLen: 9 },
  { code: 'MM', name: 'Myanmar', dial_code: '+95', minLen: 7, maxLen: 9 },
  { code: 'NA', name: 'Namibia', dial_code: '+264', minLen: 8, maxLen: 8 },
  { code: 'NP', name: 'Nepal', dial_code: '+977', minLen: 10, maxLen: 10 },
  { code: 'NL', name: 'Netherlands', dial_code: '+31', minLen: 9, maxLen: 9 },
  { code: 'NZ', name: 'New Zealand', dial_code: '+64', minLen: 8, maxLen: 10 },
  { code: 'NI', name: 'Nicaragua', dial_code: '+505', minLen: 8, maxLen: 8 },
  { code: 'NE', name: 'Niger', dial_code: '+227', minLen: 8, maxLen: 8 },
  { code: 'NG', name: 'Nigeria', dial_code: '+234', minLen: 10, maxLen: 10 },
  { code: 'NO', name: 'Norway', dial_code: '+47', minLen: 8, maxLen: 8 },
  { code: 'OM', name: 'Oman', dial_code: '+968', minLen: 8, maxLen: 8 },
  { code: 'PK', name: 'Pakistan', dial_code: '+92', minLen: 10, maxLen: 10 },
  { code: 'PS', name: 'Palestine', dial_code: '+970', minLen: 9, maxLen: 9 },
  { code: 'PA', name: 'Panama', dial_code: '+507', minLen: 7, maxLen: 8 },
  { code: 'PG', name: 'Papua New Guinea', dial_code: '+675', minLen: 8, maxLen: 8 },
  { code: 'PY', name: 'Paraguay', dial_code: '+595', minLen: 9, maxLen: 9 },
  { code: 'PE', name: 'Peru', dial_code: '+51', minLen: 9, maxLen: 9 },
  { code: 'PH', name: 'Philippines', dial_code: '+63', minLen: 10, maxLen: 10 },
  { code: 'PL', name: 'Poland', dial_code: '+48', minLen: 9, maxLen: 9 },
  { code: 'PT', name: 'Portugal', dial_code: '+351', minLen: 9, maxLen: 9 },
  { code: 'QA', name: 'Qatar', dial_code: '+974', minLen: 8, maxLen: 8 },
  { code: 'RO', name: 'Romania', dial_code: '+40', minLen: 9, maxLen: 9 },
  { code: 'RU', name: 'Russia', dial_code: '+7', minLen: 10, maxLen: 10 },
  { code: 'RW', name: 'Rwanda', dial_code: '+250', minLen: 9, maxLen: 9 },
  { code: 'SA', name: 'Saudi Arabia', dial_code: '+966', minLen: 9, maxLen: 9 },
  { code: 'SN', name: 'Senegal', dial_code: '+221', minLen: 9, maxLen: 9 },
  { code: 'RS', name: 'Serbia', dial_code: '+381', minLen: 8, maxLen: 9 },
  { code: 'SG', name: 'Singapore', dial_code: '+65', minLen: 8, maxLen: 8 },
  { code: 'SK', name: 'Slovakia', dial_code: '+421', minLen: 9, maxLen: 9 },
  { code: 'SI', name: 'Slovenia', dial_code: '+386', minLen: 8, maxLen: 8 },
  { code: 'ZA', name: 'South Africa', dial_code: '+27', minLen: 9, maxLen: 9 },
  { code: 'ES', name: 'Spain', dial_code: '+34', minLen: 9, maxLen: 9 },
  { code: 'LK', name: 'Sri Lanka', dial_code: '+94', minLen: 9, maxLen: 9 },
  { code: 'SD', name: 'Sudan', dial_code: '+249', minLen: 9, maxLen: 9 },
  { code: 'SE', name: 'Sweden', dial_code: '+46', minLen: 7, maxLen: 13 },
  { code: 'CH', name: 'Switzerland', dial_code: '+41', minLen: 9, maxLen: 9 },
  { code: 'SY', name: 'Syria', dial_code: '+963', minLen: 9, maxLen: 9 },
  { code: 'TW', name: 'Taiwan', dial_code: '+886', minLen: 9, maxLen: 9 },
  { code: 'TJ', name: 'Tajikistan', dial_code: '+992', minLen: 9, maxLen: 9 },
  { code: 'TZ', name: 'Tanzania', dial_code: '+255', minLen: 9, maxLen: 9 },
  { code: 'TH', name: 'Thailand', dial_code: '+66', minLen: 9, maxLen: 9 },
  { code: 'TN', name: 'Tunisia', dial_code: '+216', minLen: 8, maxLen: 8 },
  { code: 'TR', name: 'Turkey', dial_code: '+90', minLen: 10, maxLen: 10 },
  { code: 'UG', name: 'Uganda', dial_code: '+256', minLen: 9, maxLen: 9 },
  { code: 'UA', name: 'Ukraine', dial_code: '+380', minLen: 9, maxLen: 9 },
  { code: 'AE', name: 'United Arab Emirates', dial_code: '+971', minLen: 9, maxLen: 9 },
  { code: 'GB', name: 'United Kingdom', dial_code: '+44', minLen: 10, maxLen: 10 },
  { code: 'US', name: 'United States', dial_code: '+1', minLen: 10, maxLen: 10 },
  { code: 'UY', name: 'Uruguay', dial_code: '+598', minLen: 8, maxLen: 8 },
  { code: 'UZ', name: 'Uzbekistan', dial_code: '+998', minLen: 9, maxLen: 9 },
  { code: 'VE', name: 'Venezuela', dial_code: '+58', minLen: 10, maxLen: 10 },
  { code: 'VN', name: 'Vietnam', dial_code: '+84', minLen: 9, maxLen: 11 },
  { code: 'YE', name: 'Yemen', dial_code: '+967', minLen: 9, maxLen: 9 },
  { code: 'ZM', name: 'Zambia', dial_code: '+260', minLen: 9, maxLen: 9 },
  { code: 'ZW', name: 'Zimbabwe', dial_code: '+263', minLen: 9, maxLen: 9 }
];

const ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];

const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      const confirmAction = window.confirm(`${title}\n\n${message}`);
      if (confirmAction) {
        const primaryBtn = buttons.find(b => b.onPress);
        if (primaryBtn) primaryBtn.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function SecurityScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const currentStyles = isDarkMode ? darkStyles : lightStyles;

  const [modalVisible, setModalVisible] = useState(false);
  const [activeLayer, setActiveLayer] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [securePasswordEntry, setSecurePasswordEntry] = useState(true);
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState({ code: 'PK', name: 'Pakistan', dial_code: '+92', minLen: 10, maxLen: 10 });
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);

  const [currentPhone, setCurrentPhone] = useState('Not Set');
  const [currentEmail, setCurrentEmail] = useState('Not Set');

  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const otpIntervalRef = useRef(null);

  const [phoneOtpStep, setPhoneOtpStep] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneVerificationId, setPhoneVerificationId] = useState('');

  const [bridgeVisible, setBridgeVisible] = useState(false);

  const webVerifierWrapperRef = useRef(null);

  const getRecaptchaVerifierRef = () => {
    if (!webVerifierWrapperRef.current) {
      const verifierInstance = new RecaptchaVerifier(auth, 'security-phone-recaptcha', { size: 'invisible' });
      webVerifierWrapperRef.current = { current: verifierInstance };
    }
    return webVerifierWrapperRef.current;
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          if (user.email) setCurrentEmail(user.email);
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const savedPhone = data.phoneNumber || data.phone;
            if (savedPhone) setCurrentPhone(savedPhone);
          }
        }
      } catch (err) {
        console.log("Error fetching security details:", err);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    return () => stopOtpTimer();
  }, []);

  const startOtpTimer = () => {
    stopOtpTimer();
    setOtpTimer(60);
    setCanResendOtp(false);
    otpIntervalRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(otpIntervalRef.current);
          setCanResendOtp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopOtpTimer = () => {
    if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
  };

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.dial_code.includes(searchQuery)
    );
  }, [searchQuery]);

  const openSecurityAction = (layer) => {
    setActiveLayer(layer);
    setNewPassword('');
    setSecurePasswordEntry(true);
    setNewPhone('');
    setNewEmail('');
    setOtpStep(false);
    setOtpCode('');
    setPhoneOtpStep(false);
    setPhoneOtpCode('');
    setPhoneVerificationId('');
    setBridgeVisible(false);
    stopOtpTimer();
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setOtpStep(false);
    setOtpCode('');
    setPhoneOtpStep(false);
    setPhoneOtpCode('');
    setPhoneVerificationId('');
    setBridgeVisible(false);
    stopOtpTimer();
  };

  const handlePasswordChange = (val) => {
    const cleanVal = val.replace(/\s/g, '');
    setNewPassword(cleanVal);
  };

  const handlePhoneChange = (val) => {
    let cleanVal = val.replace(/[^0-9]/g, '');
    if (cleanVal.startsWith('0')) {
      cleanVal = cleanVal.substring(1);
    }
    if (cleanVal.length <= selectedCountry.maxLen) {
      setNewPhone(cleanVal);
    }
  };

  const validateInputs = () => {
    if (activeLayer === 'password') {
      if (newPassword.length < 6) {
        showAlert("Invalid Password", "Password must be at least 6 characters long.");
        return false;
      }
    }

    if (activeLayer === 'phone') {
      const cleanPhone = newPhone;
      const { minLen } = selectedCountry;
      if (cleanPhone.length < minLen) {
        showAlert("Invalid Phone Number", "The phone number entered is incomplete or incorrect.");
        return false;
      }
    }

    if (activeLayer === 'email') {
      const emailLower = newEmail.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(emailLower) || emailLower.length < 5) {
        showAlert("Invalid Email Format", "Please enter a valid email address structure.");
        return false;
      }

      const domain = emailLower.split('@')[1];
      if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
        showAlert(
          "Unsupported Email Provider",
          "Temporary or untrusted email addresses are not permitted. Please use official providers like Gmail, Yahoo, or Outlook."
        );
        return false;
      }

      if (!currentPhone || currentPhone === 'Not Set') {
        showAlert(
          "Phone Number Required",
          "For your security, email changes are verified via your registered phone number. Please add a phone number first (see the Phone section above), then try changing your email again."
        );
        return false;
      }
    }

    return true;
  };

  const forceReLogin = (message) => {
    const goToLogin = async () => {
      try { await signOut(auth); } catch (e) {}
      if (navigation?.reset) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else if (navigation?.replace) {
        navigation.replace('Login');
      } else if (navigation?.navigate) {
        navigation.navigate('Login');
      }
    };

    if (Platform.OS === 'web') {
      window.alert(message);
      goToLogin();
    } else {
      Alert.alert("Security Update Complete", message, [{ text: "OK", onPress: goToLogin }]);
    }
  };

  const verifyAndBindPhoneCredential = async (credential) => {
    const user = auth.currentUser;
    try {
      await linkWithCredential(user, credential);
    } catch (linkErr) {
      if (linkErr.code === 'auth/provider-already-linked') {
        await reauthenticateWithCredential(user, credential);
      } else if (
        linkErr.code === 'auth/credential-already-in-use' ||
        linkErr.code === 'auth/phone-number-already-exists' ||
        linkErr.code === 'auth/account-exists-with-different-credential'
      ) {
        throw { code: 'custom/phone-mismatch', message: 'This phone number is already associated with a different account and cannot be used here. Please contact support.' };
      } else {
        throw linkErr;
      }
    }
  };

  const sendPhoneChangeEmailOtp = async () => {
    setOtpSending(true);
    try {
      const sendOtp = httpsCallable(functionsInstance, 'sendEmailOTP');
      await sendOtp({ purpose: 'PHONE_CHANGE' });
      setOtpStep(true);
      setOtpCode('');
      startOtpTimer();
    } catch (err) {
      showAlert("Error", err.message || "Failed to send verification code.");
    } finally {
      setOtpSending(false);
    }
  };

  const sendEmailChangePhoneOtp = async () => {
    setOtpSending(true);
    try {
      const verifierRef = getRecaptchaVerifierRef();
      const res = await sendSMSOTP(currentPhone, verifierRef);
      if (res.success) {
        setPhoneVerificationId(res.verificationId);
        setPhoneOtpCode('');
        setPhoneOtpStep(true);
        startOtpTimer();
      } else {
        showAlert("Error", res.message);
      }
    } catch (err) {
      showAlert("Error", err.message || "Failed to send SMS code.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleUpdate = async () => {
    if (!validateInputs()) return;

    if (activeLayer === 'password') {
      setOtpSending(true);
      try {
        const sendOtp = httpsCallable(functionsInstance, 'sendEmailOTP');
        await sendOtp({ purpose: 'PASSWORD_CHANGE' });
        setOtpStep(true);
        setOtpCode('');
        startOtpTimer();
      } catch (err) {
        showAlert("Error", err.message || "Failed to send verification code.");
      } finally {
        setOtpSending(false);
      }
      return;
    }

    if (activeLayer === 'phone') {
      await sendPhoneChangeEmailOtp();
      return;
    }

    if (activeLayer === 'email') {
      if (Platform.OS === 'web') {
        await sendEmailChangePhoneOtp();
      } else {
        setBridgeVisible(true);
      }
      return;
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;
    setOtpSending(true);
    try {
      const sendOtp = httpsCallable(functionsInstance, 'sendEmailOTP');
      if (activeLayer === 'password') {
        await sendOtp({ purpose: 'PASSWORD_CHANGE' });
      } else if (activeLayer === 'phone') {
        await sendOtp({ purpose: 'PHONE_CHANGE' });
      }
      startOtpTimer();
      showAlert("Code Resent", "A new verification code has been sent to your email.");
    } catch (err) {
      showAlert("Error", err.message || "Failed to resend the code.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleResendPhoneOtp = async () => {
    if (!canResendOtp) return;
    if (activeLayer === 'email') {
      await sendEmailChangePhoneOtp();
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      showAlert("Invalid Code", "Please enter the 6-digit code.");
      return;
    }

    setOtpVerifying(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        showAlert("Error", "Session expired. Please log in again.");
        setOtpVerifying(false);
        return;
      }

      if (activeLayer === 'password') {
        const verifyOtp = httpsCallable(functionsInstance, 'verifyEmailOTP');
        await verifyOtp({ email: user.email, code: otpCode, purpose: 'PASSWORD_CHANGE' });

        await updatePassword(user, newPassword);
        closeModal();
        forceReLogin("Your password has been changed successfully. For your security, please log in again with your new password.");
      } else if (activeLayer === 'phone') {
        const verifyOtp = httpsCallable(functionsInstance, 'verifyEmailOTP');
        await verifyOtp({ email: user.email, code: otpCode, purpose: 'PHONE_CHANGE' });

        const fullPhone = `${selectedCountry.dial_code}${newPhone}`;
        await updateDoc(doc(db, 'users', user.uid), { phoneNumber: fullPhone });
        setCurrentPhone(fullPhone);

        closeModal();
        showAlert("Success", "Phone number updated successfully!");
      }
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        showAlert("Security Check", "This operation is sensitive and requires recent authentication. Log in again before retrying this request.");
      } else {
        showAlert("Verification Failed", err.message || "The code entered is invalid or has expired.");
      }
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtpCode.length !== 6) {
      showAlert("Invalid Code", "Please enter the 6-digit code.");
      return;
    }

    setOtpVerifying(true);
    try {
      const buildResult = await verifySMSOTP(phoneVerificationId, phoneOtpCode);
      if (!buildResult.success) {
        showAlert("Verification Failed", buildResult.message);
        setOtpVerifying(false);
        return;
      }

      const cleanEmail = newEmail.trim().toLowerCase();

      // Must confirm no OTHER account already has this email BEFORE
      // touching Firebase Auth — this was the missing check that let a
      // duplicate email get saved to Firestore, corrupting login lookups.
      const checkAvailable = httpsCallable(functionsInstance, 'checkNewEmailAvailable');
      await checkAvailable({ email: cleanEmail });

      await verifyAndBindPhoneCredential(buildResult.credential);

      const user = auth.currentUser;

      await verifyBeforeUpdateEmail(user, cleanEmail);
      await updateDoc(doc(db, 'users', user.uid), { email: cleanEmail });
      setCurrentEmail(cleanEmail);
      closeModal();
      forceReLogin(
        `A confirmation link has been sent to ${cleanEmail}. Please check that inbox and click the link to activate your new email, then log in again using your new email.`
      );
    } catch (err) {
      if (err.code === 'functions/already-exists' || err.message?.includes('already linked to another account')) {
        showAlert("Email Unavailable", "This email address is already linked to another account. Please use a different email.");
      } else if (err.code === 'auth/invalid-verification-code') {
        showAlert("Verification Failed", "Incorrect code. Please check and try again.");
      } else if (err.code === 'auth/code-expired') {
        showAlert("Code Expired", "This code has expired. Please request a new code.");
      } else if (err.code === 'auth/requires-recent-login') {
        showAlert("Security Check", "This operation is sensitive and requires recent authentication. Log in again before retrying this request.");
      } else {
        showAlert("Error", err.message || "Failed to complete verification.");
      }
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleBridgeResult = (data) => {
    setBridgeVisible(false);

    if (data.purpose === 'email_change') {
      const cleanEmail = newEmail.trim().toLowerCase();
      setCurrentEmail(cleanEmail);
      closeModal();
      forceReLogin(
        `A confirmation link has been sent to ${cleanEmail}. Please check that inbox and click the link to activate your new email, then log in again using your new email.`
      );
    }
  };

  const handleOtpCancel = () => {
    closeModal();
  };

  return (
    <SafeAreaView style={currentStyles.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#0B0E14" : "#F8FAFC"}
      />

      <View style={currentStyles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={isDarkMode ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>Security Protocol</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={currentStyles.sectionTitle}>AUTHENTICATION LAYERS</Text>

        <TouchableOpacity style={currentStyles.layerCard} onPress={() => openSecurityAction('password')}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#1E293B' : '#EFF6FF' }]}>
              <Feather name="lock" size={20} color="#3B82F6" />
            </View>
            <View style={styles.textContainer}>
              <Text style={currentStyles.cardTitle}>Change Login Password</Text>
              <Text style={styles.cardSubtitle}>EMAIL OTP REQUIRED</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={currentStyles.layerCard} onPress={() => openSecurityAction('phone')}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#1E293B' : '#EFF6FF' }]}>
              <Feather name="phone" size={20} color="#3B82F6" />
            </View>
            <View style={styles.textContainer}>
              <Text style={currentStyles.cardTitle}>Change Phone Number</Text>
              <Text style={styles.currentDataSubtitle}>Current: {currentPhone}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={currentStyles.layerCard} onPress={() => openSecurityAction('email')}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? '#1E293B' : '#EFF6FF' }]}>
              <Feather name="mail" size={20} color="#3B82F6" />
            </View>
            <View style={styles.textContainer}>
              <Text style={currentStyles.cardTitle}>Change Email Address</Text>
              <Text style={styles.currentDataSubtitle}>Current: {currentEmail}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={isDarkMode ? darkStyles.modalContent : lightStyles.modalContent}>

              <View style={[styles.modalHeader, { borderBottomColor: isDarkMode ? '#21262D' : '#E2E8F0' }]}>
                <Text style={isDarkMode ? darkStyles.modalTitle : lightStyles.modalTitle}>
                  {activeLayer === 'password' && !otpStep && "Change Login Password"}
                  {activeLayer === 'password' && otpStep && "Verify Email OTP"}
                  {activeLayer === 'phone' && !otpStep && "Change Phone Number"}
                  {activeLayer === 'phone' && otpStep && "Verify Email OTP"}
                  {activeLayer === 'email' && !phoneOtpStep && "Change Email Address"}
                  {activeLayer === 'email' && phoneOtpStep && "Verify Phone OTP"}
                </Text>
                <TouchableOpacity onPress={closeModal}>
                  <Feather name="x" size={20} color={isDarkMode ? "#94A3B8" : "#64748B"} />
                </TouchableOpacity>
              </View>

              {activeLayer === 'password' && !otpStep && (
                <View style={styles.formContainer}>
                  <View style={[isDarkMode ? darkStyles.inputFieldContainer : lightStyles.inputFieldContainer, styles.passwordInputWrapper]}>
                    <TextInput
                      style={[styles.flexInput, { color: isDarkMode ? '#FFFFFF' : '#1E293B' }]}
                      placeholder="Enter New Password"
                      placeholderTextColor="#64748B"
                      secureTextEntry={securePasswordEntry}
                      maxLength={20}
                      value={newPassword}
                      onChangeText={handlePasswordChange}
                    />
                    <TouchableOpacity
                      style={styles.eyeIconBtn}
                      onPress={() => setSecurePasswordEntry(!securePasswordEntry)}
                    >
                      <Feather
                        name={securePasswordEntry ? "eye-off" : "eye"}
                        size={18}
                        color="#64748B"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {activeLayer === 'phone' && !otpStep && (
                <View style={styles.formContainer}>
                  <Text style={styles.currentActiveLabel}>Current Phone: {currentPhone}</Text>
                  <View style={styles.phoneInputRow}>
                    <TouchableOpacity
                      style={isDarkMode ? darkStyles.countrySelector : lightStyles.countrySelector}
                      onPress={() => {
                        setSearchQuery('');
                        setCountryModalVisible(false);
                        setTimeout(() => {
                          setCountryModalVisible(true);
                        }, 100);
                      }}
                    >
                      <Text style={[styles.countrySelectorText, { color: isDarkMode ? '#FFFFFF' : '#334155' }]}>{selectedCountry.dial_code}</Text>
                      <Feather name="chevron-down" size={12} color={isDarkMode ? "#94A3B8" : "#64748B"} />
                    </TouchableOpacity>
                    <TextInput
                      style={[isDarkMode ? darkStyles.inputField : lightStyles.inputField, { flex: 1 }]}
                      placeholder="Enter New Phone Number"
                      placeholderTextColor="#64748B"
                      keyboardType="phone-pad"
                      value={newPhone}
                      onChangeText={handlePhoneChange}
                    />
                  </View>
                  <Text style={styles.infoAlert}>
                    * For your security, a 6-digit code will be sent to your registered email ({currentEmail}) before this change is saved.
                  </Text>
                </View>
              )}

              {activeLayer === 'email' && !phoneOtpStep && (
                <View style={styles.formContainer}>
                  <Text style={styles.currentActiveLabel}>Current Email: {currentEmail}</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={isDarkMode ? darkStyles.inputField : lightStyles.inputField}
                      placeholder="Enter New Email Address"
                      placeholderTextColor="#64748B"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={newEmail}
                      onChangeText={setNewEmail}
                    />
                  </View>
                  <Text style={styles.infoAlert}>
                    * For your security, a 6-digit code will be sent via SMS to your registered phone number ({currentPhone}). After verifying, Firebase will also send a confirmation link to your new email — you must click it before the change is final.
                  </Text>
                </View>
              )}

              {(activeLayer === 'password' || activeLayer === 'phone') && otpStep && (
                <View style={styles.formContainer}>
                  <Text style={styles.currentActiveLabel}>
                    We sent a 6-digit code to {currentEmail}
                  </Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={isDarkMode ? darkStyles.inputField : lightStyles.inputField}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor="#64748B"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otpCode}
                      onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, ''))}
                    />
                  </View>
                  <View style={styles.otpTimerRow}>
                    {canResendOtp ? (
                      <TouchableOpacity onPress={handleResendOtp} disabled={otpSending}>
                        <Text style={styles.resendActiveText}>Resend Code</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.resendDisabledText}>Resend code in 0:{otpTimer < 10 ? `0${otpTimer}` : otpTimer}</Text>
                    )}
                  </View>
                </View>
              )}

              {Platform.OS === 'web' && activeLayer === 'email' && phoneOtpStep && (
                <View style={styles.formContainer}>
                  <Text style={styles.currentActiveLabel}>
                    We sent a 6-digit code via SMS to {currentPhone}
                  </Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={isDarkMode ? darkStyles.inputField : lightStyles.inputField}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor="#64748B"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={phoneOtpCode}
                      onChangeText={(text) => setPhoneOtpCode(text.replace(/[^0-9]/g, ''))}
                    />
                  </View>
                  <View style={styles.otpTimerRow}>
                    {canResendOtp ? (
                      <TouchableOpacity onPress={handleResendPhoneOtp} disabled={otpSending}>
                        <Text style={styles.resendActiveText}>Resend Code</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.resendDisabledText}>Resend code in 0:{otpTimer < 10 ? `0${otpTimer}` : otpTimer}</Text>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                {((activeLayer === 'password' || activeLayer === 'phone') && otpStep) ? (
                  <>
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleOtpCancel} disabled={otpVerifying}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyOtp} disabled={otpVerifying}>
                      {otpVerifying ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>Verify OTP</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (Platform.OS === 'web' && activeLayer === 'email' && phoneOtpStep) ? (
                  <>
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleOtpCancel} disabled={otpVerifying}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyPhoneOtp} disabled={otpVerifying}>
                      {otpVerifying ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>Verify OTP</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.submitBtn} onPress={handleUpdate} disabled={loading || otpSending}>
                    {(loading || otpSending) ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        {activeLayer === 'email' ? 'Send Code to Phone' : 'Send Verification Code'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={countryModalVisible}
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <View style={styles.countryModalOverlay}>
          <View style={isDarkMode ? darkStyles.countryModalContent : lightStyles.countryModalContent}>
            <View style={styles.countryModalHeader}>
              <Text style={isDarkMode ? darkStyles.countryModalTitle : lightStyles.countryModalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setCountryModalVisible(false)}>
                <Feather name="x" size={20} color={isDarkMode ? "#94A3B8" : "#64748B"} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBarWrapper, { borderColor: isDarkMode ? '#21262D' : '#E2E8F0', backgroundColor: isDarkMode ? '#0B0E14' : '#F8FAFC' }]}>
              <Feather name="search" size={16} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchBarInput, { color: isDarkMode ? '#FFFFFF' : '#1E293B' }]}
                placeholder="Search country or code..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={true}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryItemRow, { borderBottomColor: isDarkMode ? '#21262D' : '#F1F5F9' }]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setNewPhone('');
                    setCountryModalVisible(false);
                  }}
                >
                  <View style={styles.countryItemLeft}>
                    <Text style={[styles.countryItemName, { color: isDarkMode ? '#E2E8F0' : '#334155' }]}>{item.name}</Text>
                  </View>
                  <Text style={styles.countryItemCode}>{item.dial_code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {Platform.OS === 'web' && (
        <View nativeID="security-phone-recaptcha" />
      )}

      {Platform.OS !== 'web' && (
        <PhoneVerifyBridge
          visible={bridgeVisible}
          purpose="email_change"
          phone={currentPhone}
          newEmail={newEmail.trim().toLowerCase()}
          onResult={handleBridgeResult}
          onClose={() => setBridgeVisible(false)}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { paddingHorizontal: 20, paddingTop: 20 },
  backButton: { padding: 4 },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  textContainer: { justifyContent: 'center' },
  cardSubtitle: { fontSize: 9, fontWeight: '700', color: '#94A3B8', marginTop: 2, letterSpacing: 0.5 },
  currentDataSubtitle: { fontSize: 10, fontWeight: '600', color: '#3B82F6', marginTop: 2, letterSpacing: 0.3 },
  currentActiveLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1 },
  formContainer: { marginBottom: 15 },
  inputWrapper: { marginBottom: 12 },
  passwordInputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  flexInput: { flex: 1, height: 46, fontSize: 14, paddingVertical: 0 },
  eyeIconBtn: { padding: 4, marginLeft: 8 },
  phoneInputRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  countrySelectorText: { fontSize: 14, fontWeight: '600' },
  infoAlert: { fontSize: 11, color: '#3B82F6', fontWeight: '500', marginBottom: 20, lineHeight: 16 },
  otpTimerRow: { alignItems: 'center', marginTop: 4, marginBottom: 16 },
  resendActiveText: { color: '#3B82F6', fontSize: 13, fontWeight: '700' },
  resendDisabledText: { color: '#94A3B8', fontSize: 13, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12 },
  submitBtn: { flex: 1, backgroundColor: '#3B82F6', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  cancelBtn: { flex: 1, backgroundColor: 'rgba(148,163,184,0.15)', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: '#94A3B8', fontSize: 15, fontWeight: 'bold' },

  countryModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  countryModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginBottom: 16 },
  searchBarInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  countryItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  countryItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  countryItemName: { fontSize: 14, fontWeight: '500' },
  countryItemCode: { fontSize: 14, fontWeight: '600', color: '#94A3B8' }
});

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F8FAFC' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#1E293B' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 14, letterSpacing: 0.5 },
  layerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B' },

  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  inputField: { backgroundColor: '#F8FAFC', height: 46, borderRadius: 10, paddingHorizontal: 14, fontSize: 14, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
  inputFieldContainer: { backgroundColor: '#F8FAFC', height: 46, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  countrySelector: { backgroundColor: '#F8FAFC', height: 46, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E2E8F0' },

  countryModalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '85%', maxHeight: '75%', padding: 20 },
  countryModalTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' }
});

const darkStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0B0E14' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFFFFF' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 14, letterSpacing: 0.5 },
  layerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#21262D' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#E2E8F0' },

  modalContent: { backgroundColor: '#161B22', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300, borderWidth: 1, borderColor: '#21262D' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  inputField: { backgroundColor: '#0B0E14', height: 46, borderRadius: 10, paddingHorizontal: 14, fontSize: 14, color: '#FFFFFF', borderWidth: 1, borderColor: '#21262D' },
  inputFieldContainer: { backgroundColor: '#0B0E14', height: 46, borderRadius: 10, borderWidth: 1, borderColor: '#21262D' },
  countrySelector: { backgroundColor: '#0B0E14', height: 46, borderRadius: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#21262D' },

  countryModalContent: { backgroundColor: '#161B22', borderRadius: 20, width: '85%', maxHeight: '75%', padding: 20, borderWidth: 1, borderColor: '#21262D' },
  countryModalTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }
});