
"use server";

import {
  db,
  doc,
  collection,
  setDoc, // Changed from addDoc
  updateDoc,
  arrayUnion,
  Timestamp,
  uploadSupportScreenshot,
  type SupportTicketData,
  type Message,
  SUPPORT_TICKETS_COLLECTION,
} from '@/lib/firebase';

interface CreateTicketArgs {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  subject: string;
  initialMessage: string;
  screenshotFile: File | null;
}

export async function createTicketAction(args: CreateTicketArgs): Promise<{ success: boolean; error?: string; ticketId?: string }> {
  const { userId, userEmail, userDisplayName, subject, initialMessage, screenshotFile } = args;

  if (!userId || !subject.trim() || !initialMessage.trim()) {
    return { success: false, error: 'User ID, subject, and message are required.' };
  }

  try {
    // This creates a reference with a new, unique, client-side generated ID
    const ticketRef = doc(collection(db, SUPPORT_TICKETS_COLLECTION));
    const now = Timestamp.now();

    const firstMessage: Message = {
      senderId: userId,
      senderName: userDisplayName,
      text: initialMessage.trim(),
      timestamp: now,
    };

    const newTicketData: SupportTicketData = {
      userId,
      userEmail,
      userDisplayName,
      subject: subject.trim(),
      status: 'open',
      createdAt: now,
      lastUpdatedAt: now,
      messages: [firstMessage],
    };

    if (screenshotFile) {
        // The screenshot is uploaded to a path using the ticket's generated ID
        newTicketData.screenshotURL = await uploadSupportScreenshot(ticketRef.id, screenshotFile);
    }
    
    // Use setDoc with the reference to ensure the document ID matches the screenshot path ID
    await setDoc(ticketRef, newTicketData);
    
    return { success: true, ticketId: ticketRef.id };
  } catch (error: any) {
    console.error("Error creating support ticket:", error);
    return { success: false, error: error.message || "Could not create the ticket." };
  }
}

interface AddMessageArgs {
    ticketId: string;
    senderId: string;
    senderName: string;
    text: string;
    isUser: boolean; // True if the sender is the user, false if it's an admin
}

export async function addMessageToTicketAction(args: AddMessageArgs): Promise<{ success: boolean; error?: string }> {
    const { ticketId, senderId, senderName, text, isUser } = args;

    if (!ticketId || !senderId || !text.trim()) {
        return { success: false, error: 'Ticket ID, sender ID, and message text are required.' };
    }

    try {
        const ticketRef = doc(db, SUPPORT_TICKETS_COLLECTION, ticketId);
        const newMessage: Message = {
            senderId,
            senderName,
            text: text.trim(),
            timestamp: Timestamp.now(),
        };

        const newStatus = isUser ? 'customer-reply' : 'admin-reply';

        await updateDoc(ticketRef, {
            messages: arrayUnion(newMessage),
            lastUpdatedAt: Timestamp.now(),
            status: newStatus,
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error adding message to ticket:", error);
        return { success: false, error: error.message || "Could not add the message." };
    }
}


interface UpdateStatusArgs {
    ticketId: string;
    status: SupportTicketData['status'];
}

export async function updateTicketStatusAction(args: UpdateStatusArgs): Promise<{ success: boolean; error?: string }> {
    const { ticketId, status } = args;

    if (!ticketId || !status) {
        return { success: false, error: 'Ticket ID and status are required.' };
    }
    
    try {
        const ticketRef = doc(db, SUPPORT_TICKETS_COLLECTION, ticketId);
        await updateDoc(ticketRef, {
            status: status,
            lastUpdatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating ticket status:", error);
        return { success: false, error: error.message || "Could not update the status." };
    }
}
