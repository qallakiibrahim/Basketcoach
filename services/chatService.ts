
import { ChatMessage, ChatConversation } from '../types';
import { db, auth, isFirebaseConfigured } from './firebase';
// @ts-ignore
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  getDocs,
  limit,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';

/**
 * Service for handling real-time chat between coaches and players.
 * Uses Firestore as the real-time backend.
 */
export const chatService = {
  /**
   * Sends a message to a specific recipient or the whole team.
   * 
   * @param senderId - The ID of the sender (coach or player)
   * @param senderName - Display name of the sender
   * @param senderRole - Role of the sender
   * @param recipientId - Recipient ID (playerId, coachId, or 'TEAM')
   * @param text - The message content
   * @param coachId - The coach's ID (used for scoping messages in Firestore)
   */
  sendMessage: async (
    senderId: string,
    senderName: string,
    senderRole: 'coach' | 'player',
    recipientId: string,
    text: string,
    coachId: string
  ): Promise<void> => {
    if (!isFirebaseConfigured || !db) {
      console.warn("Firebase not configured, cannot send message.");
      return;
    }

    try {
      const messagesRef = collection(db, `users/${coachId}/messages`);
      const conversationId = recipientId === 'TEAM' ? 'TEAM' : [senderId, recipientId].sort().join('_');
      
      await addDoc(messagesRef, {
        senderId,
        senderName,
        senderRole,
        recipientId,
        conversationId,
        text,
        timestamp: serverTimestamp(),
        readBy: [senderId]
      });
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  /**
   * Subscribes to messages for specific conversations.
   */
  subscribeToMessages: (
    coachId: string,
    currentUserId: string,
    recipientIds: string | string[],
    callback: (messages: ChatMessage[]) => void
  ): (() => void) => {
    if (!isFirebaseConfigured || !db) return () => {};

    try {
      const messagesRef = collection(db, `users/${coachId}/messages`);
      const ids = Array.isArray(recipientIds) ? recipientIds : [recipientIds];
      
      const conversationIds = ids.map(id => 
        id === 'TEAM' ? 'TEAM' : [currentUserId, id].sort().join('_')
      );

      const q = query(
        messagesRef,
        where('conversationId', 'in', conversationIds),
        limit(200)
      );

      return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const messages = snapshot.docs.map(d => {
          const data = d.data();
          const timestamp = data.timestamp?.toDate?.() || new Date();
          return {
            id: d.id,
            ...data,
            timestamp: timestamp.toISOString()
          } as ChatMessage;
        });

        // Sort client-side to avoid composite index requirement
        const sortedMessages = messages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        callback(sortedMessages);
      });
    } catch (error) {
      console.error("Error subscribing to messages:", error);
      return () => {};
    }
  },

  /**
   * Subscribes to ALL messages for a coach to track unread counts across all conversations.
   */
  subscribeToAllMessages: (
    coachId: string,
    callback: (messages: ChatMessage[]) => void
  ): (() => void) => {
    if (!isFirebaseConfigured || !db) return () => {};

    try {
      const messagesRef = collection(db, `users/${coachId}/messages`);
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(500));
      
      return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        const messages = snapshot.docs.map(d => {
          const data = d.data();
          const timestamp = data.timestamp?.toDate?.() || new Date();
          return {
            id: d.id,
            ...data,
            timestamp: timestamp.toISOString()
          } as ChatMessage;
        });
        callback(messages);
      });
    } catch (error) {
      console.error("Error subscribing to all messages:", error);
      return () => {};
    }
  },

  /**
   * Marks a message as read by the current user.
   */
  markAsRead: async (coachId: string, messageId: string, userId: string): Promise<void> => {
    if (!isFirebaseConfigured || !db) return;
    try {
      const messageRef = doc(db, `users/${coachId}/messages`, messageId);
      await updateDoc(messageRef, {
        readBy: arrayUnion(userId)
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  }
};
