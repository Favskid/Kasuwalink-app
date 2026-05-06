// app/chat/[postId].tsx
import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ref, get, push, set, serverTimestamp, onValue } from 'firebase/database';
import { database } from '../../config/firebaseConfig';
import { COLORS } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';

type Message = {
  id: string;
  text: string;
  sender: string;        // user.uid
  senderRole?: string;   // 'farmer' or 'buyer'
  timestamp: any;
  createdAt?: any;
};

export default function ChatScreen() {
  const { user } = useAuth();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [postTitle, setPostTitle] = useState('Loading...');
  const flatListRef = useRef<FlatList>(null);

  // Load post title
  useEffect(() => {
    if (!postId) return;

    const loadPost = async () => {
      try {
        const postSnapshot = await get(ref(database, 'posts/' + postId));
        if (postSnapshot.exists()) {
          setPostTitle(postSnapshot.val().produceName || 'Chat');
        } else {
          setPostTitle('Chat');
        }
      } catch (e) {
        setPostTitle('Chat');
      }
    };
    loadPost();
  }, [postId]);

  // Real-time messages
  useEffect(() => {
    if (!postId) return;

    const messagesRef = ref(database, 'chats/' + postId + '/messages');

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const loadedMessages: Message[] = [];
      snapshot.forEach(childSnap => {
        loadedMessages.push({
          id: childSnap.key as string,
          ...childSnap.val()
        });
      });

      // Since it's chat, sort by createdAt ascending (oldest first at top, newest at bottom)
      loadedMessages.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });

      setMessages(loadedMessages);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [postId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !postId || !user) return;

    try {
      const messagesRef = ref(database, 'chats/' + postId + '/messages');
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, {
        text: newMessage.trim(),
        sender: user.uid,
        senderRole: user.role || 'buyer',
        createdAt: serverTimestamp(),
      });

      setNewMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    // If the sender string equals my user.uid, I am the sender, so it's my bubble
    const isMe = user ? item.sender === user.uid : false;

    return (
      <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
        <Text style={styles.sender}>
          {isMe ? 'You' : (item.senderRole === 'farmer' ? 'Farmer' : 'Buyer')}
        </Text>
        <Text style={[styles.messageText, isMe ? { color: 'white' } : { color: 'black' }]}>{item.text}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{postTitle}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: { marginRight: 12 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '600', flex: 1 },
  messagesList: { flex: 1 },
  messagesContainer: { padding: 16, paddingBottom: 20 },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
    borderBottomRightRadius: 4
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E0E0',
    borderBottomLeftRadius: 4
  },
  sender: { fontSize: 12, opacity: 0.8, marginBottom: 4, color: '#666' },
  messageText: { fontSize: 16 },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ddd'
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 16 },
});
