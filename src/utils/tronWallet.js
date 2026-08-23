import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// --- TRC20 Functions ---
export const getOrCreateDepositAddress = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data()?.tronAddress) {
      return userSnap.data().tronAddress;
    }

    const functions = getFunctions();
    const generateDepositAddress = httpsCallable(functions, 'generateDepositAddress');
    
    const result = await generateDepositAddress();
    return result.data.tronAddress;
  } catch (error) {
    console.error('Error fetching TRC20 deposit address:', error);
    throw error;
  }
};

export const checkTRC20Deposit = async (address, expectedAmount) => {
  try {
    const response = await fetch(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=10`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return { success: false };
    }

    const usdtContract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

    for (let tx of data.data) {
      if (tx.token_info.address === usdtContract && tx.to === address) {
        const receivedAmount = parseFloat(tx.value) / 1000000; // TRC20 USDT has 6 decimals
        
        if (receivedAmount >= expectedAmount) {
          return {
            success: true,
            amount: receivedAmount,
            txId: tx.transaction_id
          };
        }
      }
    }

    return { success: false };
  } catch (error) {
    console.error('Error checking TRC20 deposit:', error);
    return { success: false };
  }
};

// --- BEP20 (BNB Smart Chain) Functions ---

export const getOrCreateBEP20Address = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data()?.bep20Address) {
      return userSnap.data().bep20Address;
    }

    const functions = getFunctions();
    const generateBEP20Address = httpsCallable(functions, 'generateBEP20Address');
    
    const result = await generateBEP20Address();
    return result.data.bep20Address;
  } catch (error) {
    console.error('Error fetching BEP20 deposit address:', error);
    throw error;
  }
};

export const checkBEP20Deposit = async (address, expectedAmount) => {
  try {
    // BSC Mainnet Official USDT Token Contract Address
    const usdtContractBSC = '0x55d398326f99059ff775485246999027b3197955';
    // Etherscan API V2 (BscScan is now unified under Etherscan V2, chainid=56 is BNB Smart Chain)
    const apiKey = 'RGF2S5GJ34PR84TF6FUGQNF2AJZ4EJ8B76';

    const response = await fetch(
      `https://api.etherscan.io/v2/api?chainid=56&module=account&action=tokentx&contractaddress=${usdtContractBSC}&address=${address}&page=1&offset=10&sort=desc&apikey=${apiKey}`
    );
    const data = await response.json();

    if (data.status !== '1' || !data.result || data.result.length === 0) {
      return { success: false };
    }

    for (let tx of data.result) {
      if (tx.to.toLowerCase() === address.toLowerCase()) {
        // BSC USDT uses 18 decimals
        const receivedAmount = parseFloat(tx.value) / Math.pow(10, 18);
        
        if (receivedAmount >= expectedAmount) {
          return {
            success: true,
            amount: receivedAmount,
            txId: tx.hash
          };
        }
      }
    }

    return { success: false };
  } catch (error) {
    console.error('Error checking BEP20 deposit:', error);
    return { success: false };
  }
};