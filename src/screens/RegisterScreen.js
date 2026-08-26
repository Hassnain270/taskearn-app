import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
  KeyboardAvoidingView
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functionsInstance = getFunctions();

const MASTER_REFERRAL_CODES = ['ADMIN1', '123456', 'MASTER'];

const ALL_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan', dial_code: '+93', minLen: 9, maxLen: 9, flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', dial_code: '+355', minLen: 9, maxLen: 9, flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', dial_code: '+213', minLen: 9, maxLen: 9, flag: '🇩🇿' },
  { code: 'AS', name: 'American Samoa', dial_code: '+1684', minLen: 7, maxLen: 7, flag: '🇦🇸' },
  { code: 'AD', name: 'Andorra', dial_code: '+376', minLen: 6, maxLen: 6, flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', dial_code: '+244', minLen: 9, maxLen: 9, flag: '🇦🇴' },
  { code: 'AI', name: 'Anguilla', dial_code: '+1264', minLen: 7, maxLen: 7, flag: '🇦🇮' },
  { code: 'AG', name: 'Antigua and Barbuda', dial_code: '+1268', minLen: 7, maxLen: 7, flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', dial_code: '+54', minLen: 10, maxLen: 11, flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', dial_code: '+374', minLen: 8, maxLen: 8, flag: '🇦🇲' },
  { code: 'AW', name: 'Aruba', dial_code: '+297', minLen: 7, maxLen: 7, flag: '🇦🇼' },
  { code: 'AU', name: 'Australia', dial_code: '+61', minLen: 9, maxLen: 9, flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', dial_code: '+43', minLen: 4, maxLen: 13, flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', dial_code: '+994', minLen: 9, maxLen: 9, flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas', dial_code: '+1242', minLen: 7, maxLen: 7, flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrain', dial_code: '+973', minLen: 8, maxLen: 8, flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', dial_code: '+880', minLen: 10, maxLen: 10, flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', dial_code: '+1246', minLen: 7, maxLen: 7, flag: '🇧🇧' },
  { code: 'BY', name: 'Belarus', dial_code: '+375', minLen: 9, maxLen: 9, flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', dial_code: '+32', minLen: 9, maxLen: 9, flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', dial_code: '+501', minLen: 7, maxLen: 7, flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', dial_code: '+229', minLen: 8, maxLen: 8, flag: '🇧🇯' },
  { code: 'BM', name: 'Bermuda', dial_code: '+1441', minLen: 7, maxLen: 7, flag: '🇧🇲' },
  { code: 'BT', name: 'Bhutan', dial_code: '+975', minLen: 8, maxLen: 8, flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', dial_code: '+591', minLen: 8, maxLen: 8, flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia and Herzegovina', dial_code: '+387', minLen: 8, maxLen: 9, flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana', dial_code: '+267', minLen: 8, maxLen: 8, flag: '🇧🇼' },
  { code: 'BR', name: 'Brazil', dial_code: '+55', minLen: 10, maxLen: 11, flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', dial_code: '+673', minLen: 7, maxLen: 7, flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria', dial_code: '+359', minLen: 8, maxLen: 9, flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', dial_code: '+226', minLen: 8, maxLen: 8, flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', dial_code: '+257', minLen: 8, maxLen: 8, flag: '🇧🇮' },
  { code: 'KH', name: 'Cambodia', dial_code: '+855', minLen: 8, maxLen: 9, flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroon', dial_code: '+237', minLen: 9, maxLen: 9, flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', dial_code: '+1', minLen: 10, maxLen: 10, flag: '🇨🇦' },
  { code: 'CV', name: 'Cape Verde', dial_code: '+238', minLen: 7, maxLen: 7, flag: '🇨🇻' },
  { code: 'KY', name: 'Cayman Islands', dial_code: '+1345', minLen: 7, maxLen: 7, flag: '🇰🇾' },
  { code: 'CF', name: 'Central African Republic', dial_code: '+236', minLen: 8, maxLen: 8, flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', dial_code: '+235', minLen: 8, maxLen: 8, flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', dial_code: '+56', minLen: 9, maxLen: 9, flag: '🇨🇱' },
  { code: 'CN', name: 'China', dial_code: '+86', minLen: 11, maxLen: 11, flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', dial_code: '+57', minLen: 10, maxLen: 10, flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros', dial_code: '+269', minLen: 7, maxLen: 7, flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', dial_code: '+242', minLen: 9, maxLen: 9, flag: '🇨🇬' },
  { code: 'CR', name: 'Costa Rica', dial_code: '+506', minLen: 8, maxLen: 8, flag: '🇨🇷' },
  { code: 'HR', name: 'Croatia', dial_code: '+385', minLen: 9, maxLen: 9, flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', dial_code: '+53', minLen: 8, maxLen: 8, flag: '🇨🇺' },
  { code: 'CY', name: 'Cyprus', dial_code: '+357', minLen: 8, maxLen: 8, flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', dial_code: '+420', minLen: 9, maxLen: 9, flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', dial_code: '+45', minLen: 8, maxLen: 8, flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti', dial_code: '+253', minLen: 8, maxLen: 8, flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', dial_code: '+1767', minLen: 7, maxLen: 7, flag: '🇩🇲' },
  { code: 'DO', name: 'Dominican Republic', dial_code: '+1809', minLen: 7, maxLen: 7, flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', dial_code: '+593', minLen: 9, maxLen: 9, flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', dial_code: '+20', minLen: 10, maxLen: 10, flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', dial_code: '+503', minLen: 8, maxLen: 8, flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea', dial_code: '+240', minLen: 9, maxLen: 9, flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', dial_code: '+291', minLen: 7, maxLen: 7, flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia', dial_code: '+372', minLen: 7, maxLen: 10, flag: '🇪🇪' },
  { code: 'ET', name: 'Ethiopia', dial_code: '+251', minLen: 9, maxLen: 9, flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji', dial_code: '+679', minLen: 7, maxLen: 7, flag: '🇫🇯' },
  { code: 'FI', name: 'Finland', dial_code: '+358', minLen: 5, maxLen: 12, flag: '🇫🇮' },
  { code: 'FR', name: 'France', dial_code: '+33', minLen: 9, maxLen: 9, flag: '🇫🇷' },
  { code: 'GA', name: 'Gabon', dial_code: '+241', minLen: 7, maxLen: 7, flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', dial_code: '+220', minLen: 7, maxLen: 7, flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia', dial_code: '+995', minLen: 9, maxLen: 9, flag: '🇬🇪' },
  { code: 'DE', name: 'Germany', dial_code: '+49', minLen: 10, maxLen: 11, flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', dial_code: '+233', minLen: 9, maxLen: 9, flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', dial_code: '+30', minLen: 10, maxLen: 10, flag: '🇬🇷' },
  { code: 'GD', name: 'Grenada', dial_code: '+1473', minLen: 7, maxLen: 7, flag: '🇬🇩' },
  { code: 'GT', name: 'Guatemala', dial_code: '+502', minLen: 8, maxLen: 8, flag: '🇬🇹' },
  { code: 'GN', name: 'Guinea', dial_code: '+224', minLen: 9, maxLen: 9, flag: '🇬🇳' },
  { code: 'GY', name: 'Guyana', dial_code: '+592', minLen: 7, maxLen: 7, flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti', dial_code: '+509', minLen: 8, maxLen: 8, flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', dial_code: '+504', minLen: 8, maxLen: 8, flag: '🇭🇳' },
  { code: 'HK', name: 'Hong Kong', dial_code: '+852', minLen: 8, maxLen: 8, flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary', dial_code: '+36', minLen: 9, maxLen: 9, flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', dial_code: '+354', minLen: 7, maxLen: 7, flag: '🇮🇸' },
  { code: 'IN', name: 'India', dial_code: '+91', minLen: 10, maxLen: 10, flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', dial_code: '+62', minLen: 9, maxLen: 12, flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', dial_code: '+98', minLen: 10, maxLen: 10, flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', dial_code: '+964', minLen: 10, maxLen: 10, flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', dial_code: '+353', minLen: 9, maxLen: 9, flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', dial_code: '+972', minLen: 9, maxLen: 9, flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', dial_code: '+39', minLen: 10, maxLen: 10, flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', dial_code: '+1876', minLen: 7, maxLen: 7, flag: '🇯🇲' },
  { code: 'JP', name: 'Japan', dial_code: '+81', minLen: 10, maxLen: 10, flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', dial_code: '+962', minLen: 9, maxLen: 9, flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan', dial_code: '+7', minLen: 10, maxLen: 10, flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', dial_code: '+254', minLen: 9, maxLen: 9, flag: '🇰🇪' },
  { code: 'KW', name: 'Kuwait', dial_code: '+965', minLen: 8, maxLen: 8, flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan', dial_code: '+996', minLen: 9, maxLen: 9, flag: '🇰🇬' },
  { code: 'LA', name: 'Laos', dial_code: '+856', minLen: 8, maxLen: 10, flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia', dial_code: '+371', minLen: 8, maxLen: 8, flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', dial_code: '+961', minLen: 7, maxLen: 8, flag: '🇱🇧' },
  { code: 'LR', name: 'Liberia', dial_code: '+231', minLen: 7, maxLen: 8, flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', dial_code: '+218', minLen: 9, maxLen: 9, flag: '🇱🇾' },
  { code: 'LT', name: 'Lithuania', dial_code: '+370', minLen: 8, maxLen: 8, flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', dial_code: '+352', minLen: 9, maxLen: 9, flag: '🇱🇺' },
  { code: 'MO', name: 'Macau', dial_code: '+853', minLen: 8, maxLen: 8, flag: '🇲🇴' },
  { code: 'MK', name: 'Macedonia', dial_code: '+389', minLen: 8, maxLen: 8, flag: '🇲🇰' },
  { code: 'MG', name: 'Madagascar', dial_code: '+261', minLen: 9, maxLen: 9, flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', dial_code: '+265', minLen: 9, maxLen: 9, flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', dial_code: '+60', minLen: 9, maxLen: 10, flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', dial_code: '+960', minLen: 7, maxLen: 7, flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', dial_code: '+223', minLen: 8, maxLen: 8, flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', dial_code: '+356', minLen: 8, maxLen: 8, flag: '🇲🇹' },
  { code: 'MR', name: 'Mauritania', dial_code: '+222', minLen: 8, maxLen: 8, flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', dial_code: '+230', minLen: 8, maxLen: 8, flag: '🇲🇺' },
  { code: 'MX', name: 'Mexico', dial_code: '+52', minLen: 10, maxLen: 10, flag: '🇲🇽' },
  { code: 'MD', name: 'Moldova', dial_code: '+373', minLen: 8, maxLen: 8, flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', dial_code: '+377', minLen: 8, maxLen: 9, flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia', dial_code: '+976', minLen: 8, maxLen: 8, flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', dial_code: '+382', minLen: 8, maxLen: 8, flag: '🇲🇪' },
  { code: 'MA', name: 'Morocco', dial_code: '+212', minLen: 9, maxLen: 9, flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', dial_code: '+258', minLen: 9, maxLen: 9, flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar', dial_code: '+95', minLen: 8, maxLen: 10, flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia', dial_code: '+264', minLen: 9, maxLen: 9, flag: '🇳🇦' },
  { code: 'NP', name: 'Nepal', dial_code: '+977', minLen: 10, maxLen: 10, flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', dial_code: '+31', minLen: 9, maxLen: 9, flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', dial_code: '+64', minLen: 8, maxLen: 10, flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', dial_code: '+505', minLen: 8, maxLen: 8, flag: '🇳🇮' },
  { code: 'NE', name: 'Niger', dial_code: '+227', minLen: 8, maxLen: 8, flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', dial_code: '+234', minLen: 10, maxLen: 10, flag: '🇳🇬' },
  { code: 'KP', name: 'North Korea', dial_code: '+850', minLen: 10, maxLen: 10, flag: '🇰🇵' },
  { code: 'NO', name: 'Norway', dial_code: '+47', minLen: 8, maxLen: 8, flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', dial_code: '+968', minLen: 8, maxLen: 8, flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', dial_code: '+92', minLen: 10, maxLen: 10, flag: '🇵🇰' },
  { code: 'PS', name: 'Palestine', dial_code: '+970', minLen: 9, maxLen: 9, flag: '🇵🇸' },
  { code: 'PA', name: 'Panama', dial_code: '+507', minLen: 8, maxLen: 8, flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', dial_code: '+675', minLen: 8, maxLen: 8, flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', dial_code: '+595', minLen: 9, maxLen: 9, flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', dial_code: '+51', minLen: 9, maxLen: 9, flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', dial_code: '+63', minLen: 10, maxLen: 10, flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', dial_code: '+48', minLen: 9, maxLen: 9, flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dial_code: '+351', minLen: 9, maxLen: 9, flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', dial_code: '+974', minLen: 8, maxLen: 8, flag: '🇶🇦' },
  { code: 'RO', name: 'Romania', dial_code: '+40', minLen: 9, maxLen: 9, flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', dial_code: '+7', minLen: 10, maxLen: 10, flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', dial_code: '+250', minLen: 9, maxLen: 9, flag: '🇷🇼' },
  { code: 'SA', name: 'Saudi Arabia', dial_code: '+966', minLen: 9, maxLen: 9, flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal', dial_code: '+221', minLen: 9, maxLen: 9, flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', dial_code: '+381', minLen: 8, maxLen: 9, flag: '🇷🇸' },
  { code: 'SG', name: 'Singapore', dial_code: '+65', minLen: 8, maxLen: 8, flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', dial_code: '+421', minLen: 9, maxLen: 9, flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', dial_code: '+386', minLen: 8, maxLen: 8, flag: '🇸🇮' },
  { code: 'ZA', name: 'South Africa', dial_code: '+27', minLen: 9, maxLen: 9, flag: '🇿🇦' },
  { code: 'KR', name: 'South Korea', dial_code: '+82', minLen: 9, maxLen: 10, flag: '🇰🇷' },
  { code: 'ES', name: 'Spain', dial_code: '+34', minLen: 9, maxLen: 9, flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', dial_code: '+94', minLen: 9, maxLen: 9, flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan', dial_code: '+249', minLen: 9, maxLen: 9, flag: '🇸🇩' },
  { code: 'SE', name: 'Sweden', dial_code: '+46', minLen: 9, maxLen: 9, flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', dial_code: '+41', minLen: 9, maxLen: 9, flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', dial_code: '+963', minLen: 9, maxLen: 9, flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan', dial_code: '+886', minLen: 9, maxLen: 9, flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan', dial_code: '+992', minLen: 9, maxLen: 9, flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania', dial_code: '+255', minLen: 9, maxLen: 9, flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', dial_code: '+66', minLen: 9, maxLen: 9, flag: '🇹🇭' },
  { code: 'TN', name: 'Tunisia', dial_code: '+216', minLen: 8, maxLen: 8, flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', dial_code: '+90', minLen: 10, maxLen: 10, flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', dial_code: '+993', minLen: 8, maxLen: 8, flag: '🇹🇲' },
  { code: 'UG', name: 'Uganda', dial_code: '+256', minLen: 9, maxLen: 9, flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine', dial_code: '+380', minLen: 9, maxLen: 9, flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', dial_code: '+971', minLen: 9, maxLen: 9, flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', dial_code: '+44', minLen: 10, maxLen: 10, flag: '🇬🇧' },
  { code: 'US', name: 'United States', dial_code: '+1', minLen: 10, maxLen: 10, flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', dial_code: '+598', minLen: 8, maxLen: 8, flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan', dial_code: '+998', minLen: 9, maxLen: 9, flag: '🇺🇿' },
  { code: 'VE', name: 'Venezuela', dial_code: '+58', minLen: 10, maxLen: 10, flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', dial_code: '+84', minLen: 9, maxLen: 10, flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', dial_code: '+967', minLen: 9, maxLen: 9, flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', dial_code: '+260', minLen: 9, maxLen: 9, flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', dial_code: '+263', minLen: 9, maxLen: 9, flag: '🇿🇼' }
];

export default function RegisterScreen({ navigation, route }) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [selectedCountry, setSelectedCountry] = useState(ALL_COUNTRIES.find(c => c.code === 'US') || ALL_COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    if (route?.params?.ref) {
      setReferralCode(route.params.ref);
      return;
    }

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.location) {
          const urlParams = new URLSearchParams(window.location.search);
          const refParam = urlParams.get('ref');
          if (refParam) {
            setReferralCode(refParam);
            return;
          }
        }
      } catch (e) {}
    }

    Linking.getInitialURL().then((url) => {
      if (url) {
        const match = url.match(/[?&]ref=([^&]+)/);
        if (match && match[1]) {
          setReferralCode(match[1]);
        }
      }
    }).catch(() => {});
  }, [route?.params]);

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return ALL_COUNTRIES;
    const queryLower = searchQuery.toLowerCase();
    return ALL_COUNTRIES.filter(
      c => c.name.toLowerCase().includes(queryLower) || c.dial_code.includes(queryLower)
    );
  }, [searchQuery]);

  const validateInputs = () => {
    if (!fullName.trim()) {
      showAlert('Validation Error', 'Please enter your full name.');
      return false;
    }
    if (username.length < 6 || username.length > 12) {
      showAlert('Validation Error', 'Username must be between 6 and 12 characters.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showAlert('Validation Error', 'Please enter a valid email address.');
      return false;
    }
    
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      showAlert('Validation Error', 'Please enter your phone number.');
      return false;
    }
    if (cleanPhone.length < selectedCountry.minLen || cleanPhone.length > selectedCountry.maxLen) {
      showAlert(
        'Invalid Phone Length', 
        `Phone number for ${selectedCountry.name} must be between ${selectedCountry.minLen} and ${selectedCountry.maxLen} digits.`
      );
      return false;
    }

    if (password.length < 6 || password.length > 12) {
      showAlert('Validation Error', 'Password must be between 6 and 12 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      showAlert('Validation Error', 'Passwords do not match.');
      return false;
    }
    if (!referralCode.trim()) {
      showAlert('Validation Error', 'Referral code is mandatory.');
      return false;
    }
    if (!termsAccepted) {
      showAlert('Terms Required', 'Please accept the Terms & Conditions to proceed.');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    const cleanRefCode = referralCode.trim().toUpperCase();
    const formattedPhone = `${selectedCountry.dial_code}${phoneNumber.replace(/[^0-9]/g, '')}`;
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    try {
      const checkAvailability = httpsCallable(functionsInstance, 'checkRegistrationAvailability');
      const availabilityRes = await checkAvailability({
        username: cleanUsername,
        email: cleanEmail,
        phone: formattedPhone,
        referral: cleanRefCode
      });

      const { usernameTaken, emailTaken, phoneTaken, referralValid, referrerUid } = availabilityRes.data;

      if (usernameTaken) {
        setLoading(false);
        showAlert('Validation Error', 'Username is already taken. Please choose another.');
        return;
      }
      if (emailTaken) {
        setLoading(false);
        showAlert('Validation Error', 'Email address is already linked to another account.');
        return;
      }
      if (phoneTaken) {
        setLoading(false);
        showAlert('Validation Error', 'Phone number is already linked to another account.');
        return;
      }
      if (!referralValid) {
        setLoading(false);
        showAlert('Invalid Referral', 'The referral code entered does not exist in our records.');
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      const myNewReferralCode = generateReferralCode();

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        username: cleanUsername,
        fullName: fullName.trim(),
        email: cleanEmail,
        countryCode: selectedCountry.code,
        countryName: selectedCountry.name,
        phoneDialCode: selectedCountry.dial_code,
        phoneNumber: formattedPhone,
        referral: myNewReferralCode,
        referredBy: cleanRefCode,
        referredByUid: referrerUid,
        createdAt: new Date().toISOString(),
        role: 'user',
        status: 'active',
        passkeyEnabled: false
      });

      setLoading(false);
      navigation.replace('Home');
      
    } catch (error) {
      setLoading(false);
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'That email address is already in use!';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'That email address is invalid!';
      }
      showAlert('Registration Failed', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          <View style={styles.centerContainer}>
            <View style={styles.headerContainer}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => navigation?.goBack()}
              >
                <Feather name="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
              </View>
              <Text style={styles.titleText}>Create Account</Text>
              <Text style={styles.subtitleText}>Join TaskEarn and start earning today</Text>
            </View>

            <View style={styles.formContainer}>

              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Feather name="user" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#64748b"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrapper}>
                <Feather name="at-sign" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="johndoe123"
                  placeholderTextColor="#64748b"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  maxLength={12}
                />
              </View>

              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#64748b"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputRow}>
                <TouchableOpacity 
                  style={styles.countryPickerButton} 
                  onPress={() => setCountryModalVisible(true)}
                >
                  <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                  <Text style={styles.dialCodeText}>{selectedCountry.dial_code}</Text>
                  <Feather name="chevron-down" size={14} color="#94a3b8" />
                </TouchableOpacity>

                <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder={`Phone number`}
                    placeholderTextColor="#64748b"
                    value={phoneNumber}
                    onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                    keyboardType="phone-pad"
                    maxLength={selectedCountry.maxLen}
                  />
                </View>
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  maxLength={12}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Feather name={showPassword ? "eye" : "eye-off"} size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="shield" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#64748b"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  maxLength={12}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                  <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Referral Code</Text>
              <View style={styles.inputWrapper}>
                <FontAwesome5 name="ticket-alt" size={16} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter referral code"
                  placeholderTextColor="#64748b"
                  value={referralCode}
                  onChangeText={setReferralCode}
                  autoCapitalize="characters"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity 
                style={styles.termsRow} 
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons 
                  name={termsAccepted ? "checkbox-marked" : "checkbox-blank-outline"} 
                  size={22} 
                  color={termsAccepted ? "#2563eb" : "#64748b"} 
                />
                <Text style={styles.termsText}>
                  I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.registerButton, loading && styles.disabledButton]} 
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.registerButtonText}>Register</Text>
                )}
              </TouchableOpacity>

              <View style={styles.loginRow}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation?.navigate('Login')}>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={countryModalVisible} animationType="slide" transparent={true}>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setCountryModalVisible(false)} style={{ cursor: 'pointer' }}>
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBoxWrapper}>
              <Feather name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.countryItem}
                  onPress={() => {
                    setSelectedCountry(item);
                    setPhoneNumber('');
                    setCountryModalVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryDialCode}>{item.dial_code}</Text>
                </TouchableOpacity>
              )}
            />

          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  centerContainer: {
    width: '100%',
    maxWidth: 480,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
    marginTop: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 4,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 15,
    outlineStyle: 'none',
  },
  eyeIcon: {
    padding: 6,
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countryPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    height: 50,
    gap: 6,
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
  },
  flagText: {
    fontSize: 18,
  },
  dialCodeText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    gap: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
  },
  termsText: {
    color: '#94a3b8',
    fontSize: 13,
    flex: 1,
  },
  termsLink: {
    color: '#2563eb',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
  },
  disabledButton: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  loginLink: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    width: '100%',
    maxWidth: 480,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  searchBoxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    outlineStyle: 'none',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
  },
  countryFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 15,
  },
  countryDialCode: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
});