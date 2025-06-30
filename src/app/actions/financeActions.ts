
"use server";

import {
  db,
  doc,
  runTransaction,
  collection,
  increment,
  arrayUnion,
  getDoc,
  writeBatch,
  addDoc,
  setDoc,
  updateDoc,
  getAppConfiguration,
  USERS_COLLECTION,
  SYSTEM_STATS_COLLECTION,
  GLOBAL_STATS_DOC_ID,
  ADD_FUND_REQUESTS_COLLECTION,
  WITHDRAWAL_REQUESTS_COLLECTION,
  TRANSACTIONS_COLLECTION,
  type UserDocument,
  type TransactionData,
  type AddFundRequestData,
  type WithdrawalRequestData,
  Timestamp
} from "@/lib/firebase";


export const approveAddFundAndUpdateBalance = async (
  requestId: string,
  userId: string,
  amount: number,
  tierId: string,
  adminId: string,
  adminEmail: string,
) => {
  const effectiveTierId = tierId || 'little';
  
  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const globalStatsRef = doc(db, SYSTEM_STATS_COLLECTION, GLOBAL_STATS_DOC_ID);
    const requestRef = doc(db, ADD_FUND_REQUESTS_COLLECTION, requestId);
    
    // Read documents first
    const [userSnap, globalStatsSnap, appConfig] = await Promise.all([
      transaction.get(userRef),
      transaction.get(globalStatsRef),
      getAppConfiguration() // This is not part of transaction, which is fine
    ]);

    if (!userSnap.exists()) throw new Error("User not found for balance update.");
    
    const userData = userSnap.data() as UserDocument;
    
    // Create global stats doc if it doesn't exist
    if (!globalStatsSnap.exists()) {
        transaction.set(globalStatsRef, { totalDeposited: 0, totalWithdrawn: 0, totalGstCollected: 0 });
    }

    const isFirstDeposit = (userData.totalDeposited || 0) === 0;

    const userBalances = userData.balances || {};
    const currentBalance = userBalances[effectiveTierId] || 0;
    const newBalance = currentBalance + amount;
    const totalDeposited = (userData.totalDeposited || 0) + amount;
    
    // Update User
    transaction.update(userRef, { 
      [`balances.${effectiveTierId}`]: newBalance,
      totalDeposited: totalDeposited
    });
    
    // Update Global Stats
    transaction.update(globalStatsRef, { totalDeposited: increment(amount) });
    
    // Referral Logic
    if (isFirstDeposit && userData.referredBy) {
      const referrerRef = doc(db, USERS_COLLECTION, userData.referredBy);
      const referrerSnap = await transaction.get(referrerRef);

      if (referrerSnap.exists()) {
          const referrerData = referrerSnap.data() as UserDocument;
          const referrerLittleTierBalance = referrerData.balances?.little || 0;
          let totalCashBonus = 0;
          let totalSpinBonus = 0;
          let bonusDescriptions: string[] = [];
          let newMilestoneBadge: string | null = null;

          // 1. Standard referrer bonus
          const standardBonus = appConfig.settings.referralBonusForReferrer;
          if (standardBonus > 0) {
            totalCashBonus += standardBonus;
            bonusDescriptions.push(`Std Bonus: ₹${standardBonus}`);
          }
          
          const newReferralCount = (referrerData.referrals?.length || 0) + 1;
          
          // 2. Tiered Bonus Check
          const tieredBonus = appConfig.settings.tieredBonuses.find(b => b.count === newReferralCount);
          if (tieredBonus) {
              totalCashBonus += tieredBonus.rewardCash;
              totalSpinBonus += tieredBonus.rewardSpins;
              bonusDescriptions.push(`Tier Bonus: ₹${tieredBonus.rewardCash} + ${tieredBonus.rewardSpins} spins`);
          }

          // 3. Milestone Check
          const milestone = appConfig.settings.referralMilestones.find(m => m.count === newReferralCount);
          const currentMilestones = referrerData.referralMilestones || [];
          if (milestone && !currentMilestones.includes(milestone.badge)) {
              totalSpinBonus += milestone.rewardSpins;
              newMilestoneBadge = milestone.badge;
              bonusDescriptions.push(`Milestone: ${milestone.badge} (${milestone.rewardSpins} spins)`);
          }
          
          // 4. Create a single update object for the referrer
          const referrerUpdate: {[key:string]: any} = {
            referralEarnings: increment(totalCashBonus),
            referrals: arrayUnion(userId)
          };
          if (totalCashBonus > 0) referrerUpdate['balances.little'] = increment(totalCashBonus);
          if (totalSpinBonus > 0) referrerUpdate.spinsAvailable = increment(totalSpinBonus);
          if (newMilestoneBadge) referrerUpdate.referralMilestones = arrayUnion(newMilestoneBadge);

          // 5. Apply the single, consolidated update
          transaction.update(referrerRef, referrerUpdate);

          // 6. Log one consolidated transaction for the referrer
          if (totalCashBonus > 0) {
              const referrerTransactionDocRef = doc(collection(db, TRANSACTIONS_COLLECTION));
              transaction.set(referrerTransactionDocRef, {
                  userId: userData.referredBy,
                  userEmail: referrerData.email,
                  type: 'credit',
                  amount: totalCashBonus,
                  description: `Referral rewards from ${userData.displayName || userData.email}. (${bonusDescriptions.join(', ')})`,
                  status: 'completed',
                  date: Timestamp.now(),
                  tierId: 'little',
                  balanceBefore: referrerLittleTierBalance,
                  balanceAfter: referrerLittleTierBalance + totalCashBonus
              } as TransactionData);
          }
      }
    }

    // Log transaction for user
    const transactionDocRef = doc(collection(db, TRANSACTIONS_COLLECTION));
    const tierName = appConfig.settings.wheelConfigs[effectiveTierId]?.name || 'Unknown Tier';
    transaction.set(transactionDocRef, {
      userId: userId,
      userEmail: userData.email,
      type: 'credit',
      amount: amount,
      description: `Balance added to ${tierName} (Req ID: ${requestId.substring(0,6)})`,
      status: 'completed',
      date: Timestamp.now(),
      tierId: effectiveTierId,
      balanceBefore: currentBalance,
      balanceAfter: newBalance
    } as TransactionData);
    
    // Update the request itself
    transaction.update(requestRef, {
      status: "approved",
      approvedDate: Timestamp.now(),
      transactionId: transactionDocRef.id,
      processedByAdminId: adminId,
      processedByAdminEmail: adminEmail,
    } as Partial<AddFundRequestData>);
  });
};

export const approveWithdrawalAndUpdateBalance = async (
  requestId: string,
  userId: string,
  amount: number,
  tierId: string,
  paymentMethodDetails: string,
  adminId: string,
  adminEmail: string,
) => {
  const effectiveTierId = tierId || 'little';

  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const globalStatsRef = doc(db, SYSTEM_STATS_COLLECTION, GLOBAL_STATS_DOC_ID);
    const requestRef = doc(db, WITHDRAWAL_REQUESTS_COLLECTION, requestId);
    
    const [userSnap, globalStatsSnap, appConfig] = await Promise.all([
      transaction.get(userRef),
      transaction.get(globalStatsRef),
      getAppConfiguration()
    ]);

    if (!userSnap.exists()) throw new Error("User not found for balance update.");
    
    // Create global stats doc if it doesn't exist
    if (!globalStatsSnap.exists()) {
        transaction.set(globalStatsRef, { totalDeposited: 0, totalWithdrawn: 0, totalGstCollected: 0 });
    }

    const userData = userSnap.data() as UserDocument;
    const userBalances = (userData.balances || {});
    const currentBalance = userBalances[effectiveTierId] || 0;
    
    if (currentBalance < amount) throw new Error("Insufficient balance for withdrawal.");
    
    const newBalance = currentBalance - amount;
    const totalWithdrawn = (userData.totalWithdrawn || 0) + amount;
    const gstAmount = amount * 0.02;
    
    // Update User
    transaction.update(userRef, { 
      [`balances.${effectiveTierId}`]: newBalance,
      totalWithdrawn: totalWithdrawn 
    });
    
    // Update Global Stats
    transaction.update(globalStatsRef, {
      totalWithdrawn: increment(amount),
      totalGstCollected: increment(gstAmount),
    });

    // Log Transaction
    const transactionDocRef = doc(collection(db, TRANSACTIONS_COLLECTION));
    const tierName = appConfig.settings.wheelConfigs[effectiveTierId]?.name || 'Unknown Tier';
    transaction.set(transactionDocRef, {
      userId: userId,
      userEmail: userData.email,
      type: 'debit',
      amount: amount,
      description: `Withdrawal from ${tierName}. Gross: ₹${amount.toFixed(2)}, GST: -₹${gstAmount.toFixed(2)}. (Req ID: ${requestId.substring(0,6)})`,
      status: 'completed',
      date: Timestamp.now(),
      tierId: effectiveTierId,
      balanceBefore: currentBalance,
      balanceAfter: newBalance
    } as TransactionData);

    // Update Request
    transaction.update(requestRef, {
      status: "processed",
      processedDate: Timestamp.now(),
      transactionId: transactionDocRef.id,
      processedByAdminId: adminId,
      processedByAdminEmail: adminEmail,
    } as Partial<WithdrawalRequestData>);
  });
};
