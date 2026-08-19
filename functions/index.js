const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const bip39 = require("bip39");
const HDKey = require("hdkey");
const { TronWeb } = require("tronweb");
const { ethers } = require("ethers");

if (!admin.apps.length) {
  admin.initializeApp();
}

const VIP_TIERS = [
  { id: 10, minCapital: 20000, name: "VIP 10" },
  { id: 9,  minCapital: 10000, name: "VIP 9" },
  { id: 8,  minCapital: 5000,  name: "VIP 8" },
  { id: 7,  minCapital: 3000,  name: "VIP 7" },
  { id: 6,  minCapital: 1500,  name: "VIP 6" },
  { id: 5,  minCapital: 1000,  name: "VIP 5" },
  { id: 4,  minCapital: 500,   name: "VIP 4" },
  { id: 3,  minCapital: 300,   name: "VIP 3" },
  { id: 2,  minCapital: 150,   name: "VIP 2" },
  { id: 1,  minCapital: 70,    name: "VIP 1" },
];

function calculateVipLockedCapital(balance) {
  for (const tier of VIP_TIERS) {
    if (balance >= tier.minCapital) {
      return tier.minCapital;
    }
  }
  return 0;
}

function getVipTierByBalance(balance) {
  for (const tier of VIP_TIERS) {
    if (balance >= tier.minCapital) {
      return tier;
    }
  }
  return null;
}

exports.calculateTeamStats = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const userId = request.auth.uid;
  const db = admin.firestore();

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User document not found.");
    }

    const userData = userDoc.data();
    const myRefCode = userData.referralCode || userData.referral || userId.substring(0, 6).toUpperCase();

    const usersSnapshot = await db.collection("users").get();
    const allUsers = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const getPkt9PmResetTimestamp = () => {
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const pktNow = new Date(utcMs + 5 * 3600000);

      let resetPkt = new Date(pktNow);
      if (pktNow.getHours() < 21) {
        resetPkt.setDate(resetPkt.getDate() - 1);
      }
      resetPkt.setHours(21, 0, 0, 0);

      const resetUtcMs = resetPkt.getTime() - 5 * 3600000;
      return resetUtcMs - now.getTimezoneOffset() * 60000;
    };

    const getMemberTimestamp = (createdAt) => {
      if (!createdAt) return 0;
      if (typeof createdAt.toDate === "function") return createdAt.toDate().getTime();
      if (typeof createdAt === "number") return createdAt;
      if (typeof createdAt === "string") return new Date(createdAt).getTime() || 0;
      if (createdAt.seconds) return createdAt.seconds * 1000;
      return 0;
    };

    const pkt9PmReset = getPkt9PmResetTimestamp();
    const sevenDaysCutoff = pkt9PmReset - 7 * 24 * 60 * 60 * 1000;

    let globalTodayCount = 0;
    let globalWeekCount = 0;

    const calculateSubTree = (refCode) => {
      const children = allUsers.filter((u) => u.referredBy === refCode);
      let count = children.length;

      children.forEach((c) => {
        const cTime = getMemberTimestamp(c.createdAt);
        if (cTime >= pkt9PmReset) globalTodayCount++;
        if (cTime >= sevenDaysCutoff) globalWeekCount++;

        const childCode = c.referralCode || c.referral || c.id.substring(0, 6).toUpperCase();
        count += calculateSubTree(childCode);
      });

      return count;
    };

    const directUsers = allUsers.filter((u) => u.referredBy === myRefCode);
    let totalNetworkCount = directUsers.length;

    const processedDirects = directUsers.map((d) => {
      const dTime = getMemberTimestamp(d.createdAt);
      if (dTime >= pkt9PmReset) globalTodayCount++;
      if (dTime >= sevenDaysCutoff) globalWeekCount++;

      const childCode = d.referralCode || d.referral || d.id.substring(0, 6).toUpperCase();
      const subTreeCount = calculateSubTree(childCode);
      totalNetworkCount += subTreeCount;

      return {
        id: d.id,
        username: d.username || d.email?.split("@")[0] || "Member",
        totalSubTeam: subTreeCount,
      };
    });

    return {
      success: true,
      totalTeamSize: totalNetworkCount,
      todayJoinings: globalTodayCount,
      last7DaysJoinings: globalWeekCount,
      directMembersData: processedDirects,
    };
  } catch (error) {
    console.error("Error in calculateTeamStats:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message || "Failed to calculate team statistics.");
  }
});

exports.requestWithdrawal = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const userId = request.auth.uid;
  const { amount, fee, netPayout, walletAddress } = request.data || {};

  if (!amount || amount < 15) {
    throw new HttpsError("invalid-argument", "Minimum withdrawal amount is $15.00.");
  }

  if (!walletAddress) {
    throw new HttpsError("invalid-argument", "Wallet address is required.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(userId);
  const withdrawalsRef = db.collection("withdrawals");

  try {
    await db.runTransaction(async (transaction) => {
      const pendingQuery = withdrawalsRef
        .where("userId", "==", userId)
        .where("status", "==", "pending");
      
      const pendingSnapshot = await transaction.get(pendingQuery);
      if (!pendingSnapshot.empty) {
        throw new HttpsError(
          "already-exists",
          "You already have a pending withdrawal request. Please wait for it to be processed."
        );
      }

      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User account not found.");
      }

      const userData = userDoc.data();
      const currentTotalBalance = Number(userData.totalBalance || userData.balance || 0);

      const vipLockedCapital = calculateVipLockedCapital(currentTotalBalance);
      const withdrawableBalance = Math.max(0, currentTotalBalance - vipLockedCapital);

      if (amount > withdrawableBalance) {
        throw new HttpsError(
          "failed-precondition",
          "Requested amount exceeds withdrawable profit balance."
        );
      }

      const newTotalBalance = Number((currentTotalBalance - amount).toFixed(2));

      transaction.update(userRef, {
        totalBalance: newTotalBalance,
        balance: newTotalBalance,
      });

      const newWithdrawalRef = withdrawalsRef.doc();
      transaction.set(newWithdrawalRef, {
        withdrawalId: newWithdrawalRef.id,
        userId: userId,
        username: userData.username || userData.email || "User",
        amount: Number(amount),
        fee: Number(fee || 0),
        netPayout: Number(netPayout || amount),
        walletAddress: walletAddress,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return { success: true, message: "Withdrawal request submitted successfully." };
  } catch (error) {
    console.error("Error in requestWithdrawal:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message || "Failed to submit withdrawal request.");
  }
});

exports.generateDepositAddress = onCall(
  { secrets: ["TRON_MNEMONIC"] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const userId = request.auth.uid;
    const db = admin.firestore();

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists && userDoc.data().tronAddress) {
        return { tronAddress: userDoc.data().tronAddress };
      }

      const mnemonic = process.env.TRON_MNEMONIC;
      if (!mnemonic) {
        throw new HttpsError("internal", "Mnemonic secret not found.");
      }

      const counterRef = db.collection("metadata").doc("wallet_counter");
      let newAddress = "";

      await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let currentIndex = 0;

        if (counterDoc.exists && counterDoc.data().currentIndex !== undefined) {
          currentIndex = counterDoc.data().currentIndex;
        }

        let assignedIndex = userDoc.exists && userDoc.data().walletIndex !== undefined ? userDoc.data().walletIndex : null;

        if (assignedIndex === null) {
          currentIndex = currentIndex + 1;
          assignedIndex = currentIndex;
          transaction.set(counterRef, { currentIndex: assignedIndex }, { merge: true });
        }

        const seed = await bip39.mnemonicToSeed(mnemonic);
        const hdwallet = HDKey.fromMasterSeed ? HDKey.fromMasterSeed(seed) : HDKey.default.fromMasterSeed(seed);
        const childNode = hdwallet.derive(`m/44'/195'/0'/0/${assignedIndex}`);
        const privateKeyHex = childNode.privateKey.toString("hex");

        const tronWeb = new TronWeb({
          fullHost: "https://api.trongrid.io",
        });

        newAddress = tronWeb.address.fromPrivateKey(privateKeyHex);

        transaction.set(
          userRef,
          {
            tronAddress: newAddress,
            walletIndex: assignedIndex,
          },
          { merge: true }
        );
      });

      return { tronAddress: newAddress };
    } catch (error) {
      console.error("Error generating TRC20 address:", error);
      throw new HttpsError("internal", error.message || "Address generation failed.");
    }
  }
);

exports.generateBEP20Address = onCall(
  { secrets: ["TRON_MNEMONIC"] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const userId = request.auth.uid;
    const db = admin.firestore();

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists && userDoc.data().bep20Address) {
        return { bep20Address: userDoc.data().bep20Address };
      }

      const mnemonic = process.env.TRON_MNEMONIC;
      if (!mnemonic) {
        throw new HttpsError("internal", "Mnemonic secret not found.");
      }

      const counterRef = db.collection("metadata").doc("wallet_counter");
      let newAddress = "";

      await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let currentIndex = 0;

        if (counterDoc.exists && counterDoc.data().currentIndex !== undefined) {
          currentIndex = counterDoc.data().currentIndex;
        }

        let assignedIndex = userDoc.exists && userDoc.data().walletIndex !== undefined ? userDoc.data().walletIndex : null;

        if (assignedIndex === null) {
          currentIndex = currentIndex + 1;
          assignedIndex = currentIndex;
          transaction.set(counterRef, { currentIndex: assignedIndex }, { merge: true });
        }

        const walletNode = ethers.HDNodeWallet.fromMnemonic(
          ethers.Mnemonic.fromPhrase(mnemonic),
          `m/44'/60'/0'/0/${assignedIndex}`
        );

        newAddress = walletNode.address;

        transaction.set(
          userRef,
          {
            bep20Address: newAddress,
            walletIndex: assignedIndex,
          },
          { merge: true }
        );
      });

      return { bep20Address: newAddress };
    } catch (error) {
      console.error("Error generating BEP20 address:", error);
      throw new HttpsError("internal", error.message || "Address generation failed.");
    }
  }
);

exports.processBlockchainDeposit = onCall(async (request) => {
  const { userId, depositId, amount, txHash } = request.data || {};

  if (!userId || !amount || Number(amount) <= 0) {
    throw new HttpsError("invalid-argument", "Invalid deposit payload parameters.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(userId);
  const depositRef = db.collection("deposits").doc(depositId || db.collection("deposits").doc().id);

  try {
    await db.runTransaction(async (transaction) => {
      const depositDoc = await transaction.get(depositRef);
      if (depositDoc.exists && depositDoc.data().status === "approved") {
        return;
      }

      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User account not found.");
      }

      const userData = userDoc.data();
      const currentBalance = Number(userData.balance || 0);
      const depositAmount = Number(amount);
      const newBalance = Number((currentBalance + depositAmount).toFixed(2));

      const activeTier = getVipTierByBalance(newBalance);
      const baseVipCapital = activeTier ? activeTier.minCapital : 0;

      let welcomeBonusAmount = 0;
      if (baseVipCapital > 0) {
        welcomeBonusAmount = Number((baseVipCapital * 0.07).toFixed(2));
      }

      const finalUserBalance = Number((newBalance + welcomeBonusAmount).toFixed(2));

      transaction.update(userRef, {
        balance: finalUserBalance,
        totalBalance: finalUserBalance,
      });

      transaction.set(
        depositRef,
        {
          depositId: depositRef.id,
          userId: userId,
          amount: depositAmount,
          txHash: txHash || "",
          status: "approved",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const depTxRef = db.collection("transactions").doc();
      transaction.set(depTxRef, {
        transactionId: depTxRef.id,
        userId: userId,
        type: "DEPOSIT",
        amount: depositAmount,
        status: "approved",
        title: "Deposit Confirmed",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (welcomeBonusAmount > 0) {
        const bonusTxRef = db.collection("transactions").doc();
        transaction.set(bonusTxRef, {
          transactionId: bonusTxRef.id,
          userId: userId,
          type: "WELCOME_BONUS",
          amount: welcomeBonusAmount,
          status: "approved",
          title: "Welcome Bonus (7%)",
          baseCapital: baseVipCapital,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      if (baseVipCapital > 0 && userData.referredBy) {
        const level1Ref = db.collection("users").doc(userData.referredBy);
        const level1Doc = await transaction.get(level1Ref);

        if (level1Doc.exists) {
          const level1Data = level1Doc.data();
          const directBonus = Number((baseVipCapital * 0.10).toFixed(2));
          const level1NewBalance = Number(((level1Data.balance || 0) + directBonus).toFixed(2));

          transaction.update(level1Ref, {
            balance: level1NewBalance,
            totalBalance: level1NewBalance,
          });

          const directBonusTxRef = db.collection("transactions").doc();
          transaction.set(directBonusTxRef, {
            transactionId: directBonusTxRef.id,
            userId: userData.referredBy,
            type: "DIRECT_REFERRAL_BONUS",
            amount: directBonus,
            fromUserId: userId,
            status: "approved",
            title: "Direct Referral Bonus (10%)",
            baseCapital: baseVipCapital,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          if (level1Data.referredBy) {
            const level2Ref = db.collection("users").doc(level1Data.referredBy);
            const level2Doc = await transaction.get(level2Ref);

            if (level2Doc.exists) {
              const level2Data = level2Doc.data();
              const indirectBonus = Number((baseVipCapital * 0.05).toFixed(2));
              const level2NewBalance = Number(((level2Data.balance || 0) + indirectBonus).toFixed(2));

              transaction.update(level2Ref, {
                balance: level2NewBalance,
                totalBalance: level2NewBalance,
              });

              const indirectBonusTxRef = db.collection("transactions").doc();
              transaction.set(indirectBonusTxRef, {
                transactionId: indirectBonusTxRef.id,
                userId: level1Data.referredBy,
                type: "INDIRECT_REFERRAL_BONUS",
                amount: indirectBonus,
                fromUserId: userId,
                status: "approved",
                title: "Indirect Referral Bonus (5%)",
                baseCapital: baseVipCapital,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        }
      }
    });

    return { success: true, message: "Deposit processed and referral bonuses credited successfully." };
  } catch (error) {
    console.error("Error in processBlockchainDeposit:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message || "Deposit processing failed.");
  }
});

exports.completeTask = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in.");
  }

  const userId = request.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection("users").doc(userId);

  try {
    let calculatedProfit = 0;

    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User document does not exist.");
      }

      const userData = userDoc.data();
      let currentBalance = Number(userData.balance || 0);

      if (currentBalance < 70) {
        throw new HttpsError("failed-precondition", "Minimum $70 balance required to perform tasks.");
      }

      const now = new Date();
      let lastResetTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 16, 0, 0));
      if (now.getTime() < lastResetTime.getTime()) {
        lastResetTime.setDate(lastResetTime.getDate() - 1);
      }

      let taskCount = Number(userData.taskCount || 0);
      let todayEarnings = Number(userData.todayEarnings || 0);

      const lastTaskReset = userData.lastTaskReset ? userData.lastTaskReset.toDate() : null;
      if (!lastTaskReset || lastTaskReset.getTime() < lastResetTime.getTime()) {
        taskCount = 0;
        todayEarnings = 0;
      }

      if (taskCount >= 5) {
        throw new HttpsError("resource-exhausted", "Daily task limit reached (5/5).");
      }

      calculatedProfit = Number((currentBalance * 0.0032).toFixed(2));
      let updatedBalance = Number((currentBalance + calculatedProfit).toFixed(2));
      const updatedTodayEarnings = Number((todayEarnings + calculatedProfit).toFixed(2));
      const updatedTotalEarnings = Number(((userData.totalEarnings || 0) + calculatedProfit).toFixed(2));
      const updatedTaskCount = taskCount + 1;

      const previousVipId = Number(userData.lastClaimedVipLevel || 0);
      const currentTier = getVipTierByBalance(updatedBalance);
      let upgradeBonusGiven = 0;
      let newClaimedVipId = previousVipId;

      if (currentTier && currentTier.id > previousVipId) {
        let previousCapital = 0;
        if (previousVipId > 0) {
          const prevTier = VIP_TIERS.find((t) => t.id === previousVipId);
          if (prevTier) {
            previousCapital = prevTier.minCapital;
          }
        }

        const capitalDifference = currentTier.minCapital - previousCapital;
        if (capitalDifference > 0) {
          upgradeBonusGiven = Number((capitalDifference * 0.05).toFixed(2));
          updatedBalance = Number((updatedBalance + upgradeBonusGiven).toFixed(2));
          newClaimedVipId = currentTier.id;

          const bonusRecordRef = userRef.collection("bonuses").doc();
          transaction.set(bonusRecordRef, {
            type: "VIP_UPGRADE_BONUS",
            fromVipLevel: previousVipId,
            toVipLevel: currentTier.id,
            capitalDifference: capitalDifference,
            bonusAmount: upgradeBonusGiven,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const bonusTxRef = db.collection("transactions").doc();
          transaction.set(bonusTxRef, {
            transactionId: bonusTxRef.id,
            userId: userId,
            type: "VIP_UPGRADE_BONUS",
            amount: upgradeBonusGiven,
            status: "approved",
            title: `VIP ${currentTier.id} Upgrade Bonus (5%)`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      transaction.update(userRef, {
        balance: updatedBalance,
        totalBalance: updatedBalance,
        todayEarnings: updatedTodayEarnings,
        totalEarnings: updatedTotalEarnings,
        taskCount: updatedTaskCount,
        lastTaskReset: admin.firestore.FieldValue.serverTimestamp(),
        lastClaimedVipLevel: newClaimedVipId,
      });

      const taskTaskRef = userRef.collection("tasks").doc();
      transaction.set(taskTaskRef, {
        profit: calculatedProfit,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        productName: request.data?.productName || "E-commerce Task",
        orderId: request.data?.orderId || taskTaskRef.id.substring(0, 8).toUpperCase(),
      });
    });

    return { success: true, profit: calculatedProfit };
  } catch (error) {
    console.error("Error executing completeTask:", error);
    throw new HttpsError("internal", error.message || "Failed to complete task.");
  }
});

exports.sendEmailOTP = onCall(async (request) => {
  const { purpose, emailInput, username } = request.data || {};
  const db = admin.firestore();
  let targetEmail = emailInput;

  if (purpose === "FORGOT_PASSWORD" && username) {
    const userQuery = await db.collection("users").where("username", "==", username).limit(1).get();
    if (userQuery.empty) {
      throw new HttpsError("not-found", "Username not found.");
    }
    targetEmail = userQuery.docs[0].data().email;
  } else if (request.auth && !targetEmail) {
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    if (userDoc.exists) {
      targetEmail = userDoc.data().email;
    }
  }

  if (!targetEmail) {
    throw new HttpsError("invalid-argument", "Email address is required.");
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  await db.collection("otps").doc(targetEmail).set({
    code: otpCode,
    purpose: purpose,
    expiresAt: expiresAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("mail").add({
    to: targetEmail,
    message: {
      subject: `TaskEarn OTP Code - ${purpose}`,
      text: `Your OTP verification code for TaskEarn is: ${otpCode}. This code will expire in 5 minutes.`,
    },
  });

  return { success: true, email: targetEmail };
});

exports.verifyEmailOTP = onCall(async (request) => {
  const { email, code, purpose } = request.data || {};
  if (!email || !code || !purpose) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  const db = admin.firestore();
  const otpRef = db.collection("otps").doc(email);
  const otpDoc = await otpRef.get();

  if (!otpDoc.exists) {
    throw new HttpsError("not-found", "OTP not found or expired.");
  }

  const otpData = otpDoc.data();

  if (Date.now() > otpData.expiresAt) {
    await otpRef.delete();
    throw new HttpsError("deadline-exceeded", "OTP has expired.");
  }

  if (otpData.code !== code || otpData.purpose !== purpose) {
    throw new HttpsError("invalid-argument", "Invalid OTP code.");
  }

  await otpRef.delete();

  return { success: true, verified: true };
});
// ============================================
// GEMINI AI SUPPORT ASSISTANT
// ============================================
const { defineSecret } = require("firebase-functions/params");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const TASKEARN_SYSTEM_PROMPT = `You are the official AI Support Assistant for TaskEarn, an international e-commerce and task-based digital earning platform founded in 2021, headquartered in Singapore, currently active in 15 countries (Pakistan, Saudi Arabia, UAE, Qatar, Kuwait, Oman, Bahrain, Malaysia, Indonesia, Singapore, Vietnam, Thailand, Bangladesh, Egypt, Jordan) with over 1.5 million registered users.

STRICT RULES YOU MUST ALWAYS FOLLOW:
1. ONLY answer questions related to the TaskEarn app and platform. If a user asks anything unrelated to TaskEarn (general knowledge, other apps, personal opinions, politics, etc.), politely respond that you can only help with questions about TaskEarn, and ask if they have any TaskEarn-related question.
2. NEVER say anything negative, critical, uncertain, or doubtful about TaskEarn, its legitimacy, its security, or its team. Always speak positively and confidently about the platform, without lying about facts.
3. ALWAYS reply in the exact same language the user writes in. Detect their language automatically (Urdu, English, Arabic, Chinese, Japanese, or any other language) and respond fluently in that same language. Never ask what language to use.
4. NEVER reveal, discuss, or mention any internal code, database structure, API keys, backend implementation, or technical architecture of the app. You only know the platform's user-facing features and policies described below.
5. NEVER share any specific user's private data (balances, transaction history, personal info) — you do not have access to any user's individual account data, and must clarify this if asked.
6. Keep answers concise, clear, and friendly, formatted for a mobile chat screen (short paragraphs, avoid long essays unless truly needed).

=== PLATFORM KNOWLEDGE BASE ===

VIP LEVELS (based on account capital balance in USDT):
VIP 1: $70–149 capital, daily profit $1.16–$2.40
VIP 2: $150–299 capital, daily profit $2.40–$4.80
VIP 3: $300–499 capital, daily profit $4.80–$8.00
VIP 4: $500–999 capital, daily profit $8.00–$16.00
VIP 5: $1,000–1,499 capital, daily profit $16.00–$24.00
VIP 6: $1,500–2,999 capital, daily profit $24.00–$48.00
VIP 7: $3,000–4,999 capital, daily profit $48.00–$80.00
VIP 8: $5,000–9,999 capital, daily profit $80.00–$160.00
VIP 9: $10,000–19,999 capital, daily profit $160.00–$320.00
VIP 10: $20,000+ capital, daily profit $320.00–$640.00
Upgrade Bonus: Only given when a user who is already active on a VIP tier grows their balance and unlocks the next higher VIP tier. Not given to a user unlocking a VIP tier for the first time.

DAILY TASKS: Users must complete exactly 5 tasks/orders per day (Home → Tasks → "Grab Order Now") to earn their daily profit based on their VIP tier.

DEPOSITS: Supported networks are TRC-20 (Tron) and BEP-20 (BNB Smart Chain), both for USDT. Go to Home → Deposit, select network, a unique QR code/address is generated valid for 1 hour. New users get a 7% welcome bonus automatically on their first deposit. Important: users must send funds only on the exact network selected (TRC20 address only accepts TRC20 sends, BEP20 only BEP20) — sending on the wrong network can result in loss of funds.

WITHDRAWALS: Minimum withdrawal is $15.00 USDT. A 7% operational fee applies to every withdrawal. Processing time is 0 to 48 hours. Users must complete their 5 daily tasks to be eligible. Only withdrawable profit can be withdrawn — the VIP capital itself remains locked/invested. A wallet address must already be configured in Wallet Configuration before withdrawing. Biometric/passkey confirmation is required to submit a withdrawal.

TRANSACTION HISTORY: Go to Home → History. Shows all Deposits, Withdrawals, Welcome Bonus, Direct Referral Bonus (10%), Indirect Referral Bonus (5%), VIP Upgrade Bonus, and Task Commission entries, each with status (Approved/Pending/Rejected). Filter by All / Credits / Debits tabs.

TEAM / REFERRALS: Go to the TEAM tab (bottom navigation) to see Total Team Size, today's new joinings, last 7 days joinings, and a list of direct members with their own sub-team sizes. Referral commission: 10% instant commission on Level 1 (direct referrals), 5% recurring bonus on Level 2 (indirect team). New members also get a 7% welcome bonus on their first deposit. To get your own referral link/code: Home → Invitation, where you can copy your code, copy your link, or share it directly.

WALLET CONFIGURATION: Go to Me → Wallet Configuration. Select network (TRC20 or BEP20), enter your wallet address (TRC20 addresses start with 'T', BEP20 addresses start with '0x'). Once saved, changing it later requires device passkey/biometric verification for security.

ACCOUNT SETTINGS (Password / Phone / Email): Go to Me → Security & Auth. There you can Change Login Password, Change Phone Number, or Change Email Address.

APP DOWNLOAD: On the Home screen, tap the "Download App" button (visible only to logged-in users) to download the APK installer file directly.

LOGOUT: Go to Me screen, scroll to the bottom, and tap "End Session".

DARK/LIGHT MODE: Go to Me screen and tap "Interface Theme" to toggle, or tap the sun/moon icon in the Home screen header.

REGISTRATION REQUIREMENTS: To register, a new user needs: Full Name, Username (must be 6–12 characters, must be unique across the platform, and cannot be changed after registration), Email (must be active/real, since OTPs are sent to it when needed), Phone Number (with country code), Password + Confirm Password, and a Referral Code (MANDATORY — registration cannot be completed without a valid, existing referral code). Each email, phone number, and wallet address can only be linked to ONE account at a time — if someone tries to register or update to an email/phone/wallet already used by another account, it will be rejected and they must use a different one.

PASSKEY (DEVICE AUTHENTICATION): Passkey uses the phone's own screen lock (fingerprint/face unlock/PIN) for extra account security — no separate password is created. Immediately after successful registration, when the user first reaches the Home screen, they are REQUIRED to set up their device Passkey (this step is mandatory and cannot be skipped). The Passkey is bound to that specific device. When logging into the account from a NEW device for the first time, the user must log in with username and password first, and then set up Passkey again on that new device. This device-binding adds a security layer: even if someone knows the password, they cannot use "Login with Passkey" successfully unless they are on a device already bound to that account.

FORGOT PASSWORD: On the Login screen, tap "Forgot Password?", enter your username, and an OTP is sent to the account's registered email. Enter the OTP to set a new password. Alternatively, if the OTP is not received, there is a "Reset via Passkey" option — but this only works on a device where Passkey was already registered for that account; it will not work on a new/different device.

If a user asks something not covered above, politely say you don't have that specific detail, and suggest they contact the platform through the appropriate in-app channel for further help, without ever sounding negative or uncertain about TaskEarn itself.`;

exports.chatWithSupportAI = onCall(
  { secrets: [GEMINI_API_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const userMessage = request.data?.message;
    if (!userMessage || typeof userMessage !== "string" || userMessage.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Message is required.");
    }
    if (userMessage.length > 1000) {
      throw new HttpsError("invalid-argument", "Message is too long.");
    }

    const history = Array.isArray(request.data?.history) ? request.data.history.slice(-10) : [];

    try {
      const contents = [
        ...history.map((h) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: String(h.text || "").slice(0, 1000) }]
        })),
        { role: "user", parts: [{ text: userMessage.trim() }] }
      ];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY.value()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: TASKEARN_SYSTEM_PROMPT }] },
            contents: contents,
            generationConfig: { temperature: 0.4, maxOutputTokens: 500 }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Gemini API error:", data);
        throw new HttpsError("internal", "AI service is temporarily unavailable.");
      }

      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!replyText) {
        throw new HttpsError("internal", "AI service did not return a valid response.");
      }

      return { reply: replyText.trim() };
    } catch (error) {
      console.error("chatWithSupportAI error:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Something went wrong. Please try again.");
    }
  }
);