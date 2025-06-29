"use server";

import {
  db,
  doc,
  runTransaction,
  increment,
  arrayUnion,
  getDoc,
  setDoc,
  collection,
  USERS_COLLECTION,
  TOURNAMENTS_COLLECTION,
  type UserDocument,
  type Tournament,
} from "@/lib/firebase";

interface JoinTournamentArgs {
  tournamentId: string;
  userId: string;
}

export const joinTournamentAction = async ({ tournamentId, userId }: JoinTournamentArgs): Promise<{ success: boolean, error?: string }> => {
  try {
    await runTransaction(db, async (transaction) => {
      const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
      const userRef = doc(db, USERS_COLLECTION, userId);
      const participantRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId, 'participants', userId);

      const [tournamentSnap, userSnap, participantSnap] = await Promise.all([
        transaction.get(tournamentRef),
        transaction.get(userRef),
        transaction.get(participantRef)
      ]);

      if (!tournamentSnap.exists()) {
        throw new Error("Tournament not found or has been cancelled.");
      }
      if (!userSnap.exists()) {
        throw new Error("User not found.");
      }
      if (participantSnap.exists()) {
        throw new Error("You have already joined this tournament.");
      }

      const tournament = tournamentSnap.data() as Tournament;
      const user = userSnap.data() as UserDocument;

      if (tournament.status !== 'active' && tournament.status !== 'upcoming') {
        throw new Error("This tournament is not open for joining.");
      }

      const userBalance = user.balances?.[tournament.tierId] ?? 0;
      if (userBalance < tournament.entryFee) {
        throw new Error(`Insufficient balance in your ${tournament.tierId} wallet. Required: ₹${tournament.entryFee}.`);
      }

      // 1. Deduct entry fee from user's balance
      const newBalance = userBalance - tournament.entryFee;
      transaction.update(userRef, {
        [`balances.${tournament.tierId}`]: newBalance
      });
      
      // 2. Add user to the tournament's participants array (for quick counting)
      transaction.update(tournamentRef, {
        participants: arrayUnion(userId)
      });
      
      // 3. Create a document for the user in the participants sub-collection
      const participantData = {
        userId: userId,
        userDisplayName: user.displayName || 'Anonymous',
        userPhotoURL: user.photoURL || '',
        tournamentId: tournamentId,
        score: 0,
      };
      transaction.set(participantRef, participantData);
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error joining tournament:", error);
    return { success: false, error: error.message || "An unknown error occurred while joining the tournament." };
  }
};