import express from 'express';
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase service account
const serviceAccountPath = path.join(__dirname, '../config/firebase-service-account.json');
const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
admin.initializeApp({
credential: admin.credential.cert(serviceAccount),
});
}

const db = admin.firestore();
const router = express.Router();

// ✅ Save FCM token for user
router.post('/save-fcm-token', async (req, res) => {
const { userId, token } = req.body;
if (!userId) {
return res.status(400).json({ success: false, error: 'userId  are required' });
}
if (!token) {
return res.status(400).json({ success: false, error: 'fcm-token are required' });
}

try {
await db.collection('fcmTokens').doc(userId).set({ token });
res.status(200).json({ success: true, message: 'Token saved' });
} catch (err) {
res.status(500).json({ success: false, error: err.message });
}
});

// ✅ Update user online/offline status
router.post('/set-user-status', async (req, res) => {
const { userId, status } = req.body;
if (!userId || !status) {
return res.status(400).json({ success: false, error: 'userId and status are required' });
}

try {
await db.collection('userStatus').doc(userId).set({ status });
res.status(200).json(`{ success: true, message: Status updated to ${status} }`);
} catch (err) {
res.status(500).json({ success: false, error: err.message });
}
});

// ✅ Send notifications to online users only
router.post('/send-notification', async (req, res) => {
const { title, body, data } = req.body;
if (!title || !body) {
return res.status(400).json({ success: false, error: 'title and body are required' });
}

try {
// 1. Get online user IDs
const statusSnap = await db.collection('userStatus').where('status', '==', 'online').get();
const onlineUserIds = statusSnap.docs.map(doc => doc.id);

kotlin
Copy
Edit
// 2. Fetch their tokens
const tokens = [];
for (const userId of onlineUserIds) {
  const tokenDoc = await db.collection('fcmTokens').doc(userId).get();
  if (tokenDoc.exists && tokenDoc.data()?.token) {
    tokens.push(tokenDoc.data().token);
  }
}

if (tokens.length === 0) {
  return res.status(200).json({ success: false, message: 'No online users with tokens' });
}

// 3. Send multicast notification
const message = {
  tokens,
  notification: { title, body },
  ...(data && { data }),
};

const response = await admin.messaging().sendMulticast(message);
res.status(200).json({
  success: true,
  sent: response.successCount,
  failed: response.failureCount,
  response,
});
} catch (error) {
console.error('❌ Notification error:', error);
res.status(500).json({ success: false, error: error.message });
}
});

export default router;