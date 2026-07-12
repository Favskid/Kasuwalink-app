// app/chat/[threadId].tsx
// Private 1-on-1 chat between a specific buyer and a farmer for a post.
// threadId format: {postId}_{buyerUid}
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { get, onValue, push, ref, serverTimestamp, set } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView, Platform,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';
import { database } from '../../config/firebaseConfig';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { ChatMessage } from '../../types';

export default function ChatScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    threadId: string;
    postId: string;
    farmerUid: string;
    farmerName: string;
    farmerEmail: string;
    produceName: string;
  }>();

  const { threadId, postId, farmerUid, farmerName, farmerEmail, produceName } = params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUserInfo, setOtherUserInfo] = useState<{ name: string; email: string; role: string; photoURL?: string } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Determine who the "other" person is
  const isFarmer = user?.uid === farmerUid;
  const otherUid = isFarmer ? threadId?.split('_')[1] : farmerUid;

  // Load other user's details from DB
  useEffect(() => {
    if (!otherUid) return;
    get(ref(database, 'users/' + otherUid)).then((snap) => {
      if (snap.exists()) {
        const u = snap.val();
        setOtherUserInfo({
          name: u.displayName || u.email || 'User',
          email: u.email || '',
          role: u.role || 'buyer',
          photoURL: u.photoURL || null,
        });
      } else if (!isFarmer) {
        setOtherUserInfo({ name: farmerName || 'Farmer', email: farmerEmail || '', role: 'farmer' });
      }
    });
  }, [otherUid]);

  // Ensure thread metadata exists
  useEffect(() => {
    if (!threadId || !postId || !user) return;
    const threadRef = ref(database, `chatThreads/${threadId}`);
    get(threadRef).then((snap) => {
      if (!snap.exists()) {
        set(threadRef, {
          postId,
          produceName: produceName || '',
          farmerUid,
          farmerName: farmerName || '',
          farmerEmail: farmerEmail || '',
          buyerUid: isFarmer ? threadId.split('_')[1] : user.uid,
          buyerName: isFarmer ? '' : (user.displayName || ''),
          buyerEmail: isFarmer ? '' : (user.email || ''),
          createdAt: serverTimestamp(),
        });
      }
    });
  }, [threadId]);

  // Real-time messages
  useEffect(() => {
    if (!threadId) return;
    const messagesRef = ref(database, `chatThreads/${threadId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const loaded: ChatMessage[] = [];
      snapshot.forEach((child) => {
        loaded.push({ id: child.key as string, ...child.val() });
      });
      loaded.sort((a, b) => {
        const tA = typeof a.createdAt === 'number' ? a.createdAt : 0;
        const tB = typeof b.createdAt === 'number' ? b.createdAt : 0;
        return tA - tB;
      });
      setMessages(loaded);
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsubscribe();
  }, [threadId]);

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !threadId || !user) return;

    setNewMessage('');
    try {
      const msgRef = push(ref(database, `chatThreads/${threadId}/messages`));
      await set(msgRef, {
        text,
        sender: user.uid,
        senderName: user.displayName || user.email || 'User',
        senderEmail: user.email || '',
        senderRole: user.role,
        senderPhotoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
      });
      await set(ref(database, `chatThreads/${threadId}/lastMessage`), text);
      await set(ref(database, `chatThreads/${threadId}/lastMessageAt`), serverTimestamp());
    } catch {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage & { senderPhotoURL?: string } }) => {
    const isMe = item.sender === user?.uid;
    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}>
        {!isMe && (
          <View style={styles.avatarCircle}>
            {(item as any).senderPhotoURL ? (
              <Image source={{ uri: (item as any).senderPhotoURL }} style={styles.avatarPhoto} />
            ) : (
              <Text style={styles.avatarInitial}>
                {(item.senderName?.[0] || '?').toUpperCase()}
              </Text>
            )}
          </View>
        )}
        <View style={styles.bubbleWrapper}>
          {!isMe && (
            <View style={styles.senderInfo}>
              <Text style={styles.senderName}>{item.senderName}</Text>
              <Text style={styles.senderEmail}>{item.senderEmail}</Text>
              <View style={[styles.senderRoleBadge, item.senderRole === 'farmer' ? styles.roleFarmer : styles.roleBuyer]}>
                <Text style={styles.senderRoleText}>
                  {item.senderRole === 'farmer' ? 'Farmer' : 'Buyer'}
                </Text>
              </View>
            </View>
          )}
          <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
            <Text style={[styles.bubbleText, isMe ? styles.myBubbleText : styles.theirBubbleText]}>
              {item.text}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const otherName = otherUserInfo?.name || (isFarmer ? 'Buyer' : (farmerName || 'Farmer'));
  const otherEmail = otherUserInfo?.email || (isFarmer ? '' : (farmerEmail || ''));
  const otherPhoto = otherUserInfo?.photoURL;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            {otherPhoto ? (
              <Image source={{ uri: otherPhoto }} style={styles.headerAvatarPhoto} />
            ) : (
              <Text style={styles.headerAvatarText}>{(otherName[0] || '?').toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
            <Text style={styles.headerEmail} numberOfLines={1}>{otherEmail}</Text>
            <Text style={styles.headerProduce} numberOfLines={1}>
              Re: {produceName || 'Produce'}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatEmoji}>💬</Text>
              <Text style={styles.emptyChatTitle}>Start the conversation</Text>
              <Text style={styles.emptyChatSub}>
                {isFarmer
                  ? `A buyer wants to discuss your ${produceName || 'produce'}`
                  : `Chat privately with ${otherName} about ${produceName || 'this produce'}`}
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder={`Message ${otherName}...`}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
          placeholderTextColor={COLORS.textLight}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 48 : 54,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerAvatarPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerAvatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  headerName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  headerEmail: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 1,
  },
  headerProduce: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 10,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryPale,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarInitial: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  bubbleWrapper: {
    maxWidth: '75%',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
    marginLeft: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  senderEmail: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  senderRoleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleFarmer: {
    backgroundColor: COLORS.primaryPale,
  },
  roleBuyer: {
    backgroundColor: COLORS.secondaryLight,
  },
  senderRoleText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMid,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  myBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  myBubbleText: {
    color: '#fff',
  },
  theirBubbleText: {
    color: COLORS.text,
  },
  emptyChat: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyChatEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyChatSub: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.textLight,
    shadowOpacity: 0,
    elevation: 0,
  },
});
