# اس zip میں کیا تبدیل ہوا ہے

یہ آپ کی اصل zip کا اپڈیٹڈ ورژن ہے۔ سائز کم کرنے کے لیے `node_modules`،
`dist/`، `dist.zip`، اور `TaskEarn_Source.zip` نکال دیے گئے ہیں (یہ صرف
build/بیک اپ آرٹیفیکٹس تھے، اصل کوڈ کا حصہ نہیں)۔

## شامل شدہ فکسز
1. `firestore.rules` — نئی فائل (آپ Console میں پہلے ہی paste کر چکے ہیں، یہاں صرف ریفرنس کے لیے ہے)۔
2. `firebase.json` — اب `firestore.rules` کو رجسٹر کرتا ہے۔
3. `functions/index.js` — دو نئے functions شامل: `completeTask` اور `requestWithdrawal` (سرور سائیڈ، transaction کے ساتھ)۔ `generateDepositAddress` کو Secret Manager سے mnemonic لینے کے لیے update کیا گیا۔
4. `functions/.env` — **حذف کر دیا گیا** (اب mnemonic صرف Secret Manager میں ہے)۔
5. `functions/.gitignore` — اب `.env` بھی ignore کرتا ہے۔
6. `src/screens/TasksScreen.js` اور `src/screens/WithdrawAssetsScreen.js` — اب براہِ راست `updateDoc`/`addDoc` کی بجائے محفوظ Cloud Functions کال کرتے ہیں۔

## فون پر دوبارہ سیٹ اپ کرنے کا طریقہ (Termux)

```bash
# 1. یہ zip اپنے فون کے Downloads میں رکھیں، پھر:
termux-setup-storage
cd ~
unzip ~/storage/shared/Download/TaskEarn_Fixed.zip -d TaskEarn
cd TaskEarn

# 2. Firebase CLI اور dependencies
npm install -g firebase-tools
firebase login
cd functions
npm install
cd ..

# 3. mnemonic (اگر پہلے سیٹ نہیں ہوا یا نیا بنانا ہو)
firebase functions:secrets:set TRON_MNEMONIC

# 4. rules اور functions deploy کریں
firebase deploy --only firestore:rules
firebase deploy --only functions
```

## یاد رہے
- `firebase functions:secrets:set` میں mnemonic ٹائپ کرتے وقت اسے کہیں اور
  (چیٹ، نوٹس، اسکرین شاٹ) کاپی نہ کریں — صرف اسی masked prompt میں۔
- اگر Termux میں دوبارہ `env: 'node': Permission denied` آئے تو یہ چیک کریں:
  `termux-info | grep -i "APK_RELEASE"` — اگر Play Store ورژن نکلے تو
  F-Droid/GitHub ورژن پر منتقل ہونا ہی مستقل حل ہے۔
