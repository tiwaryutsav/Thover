// routes/notifications.js
import express from 'express';
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Required for ES6 __dirname
const __filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

// Load service account credentials once
const serviceAccountPath = path.join(__dirname, '../config/firebase-service-account.json');
const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const router = express.Router();

// ✅ Updated to use topic
router.post('/send-notification', async (req, res) => {
  const { topic, title, body, data } = req.body;

  // Validate required fields
  if (!topic || !title || !body) {
    return res.status(400).json({ success: false, error: 'topic, title, and body are required' });
  }

  const message = {
    topic,
    notification: {
      title,
      body,
    },
    ...(data && { data }),
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent:', response);
    res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;