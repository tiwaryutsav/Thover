router.post('/send-notification', async (req, res) => {
  const { topic, title, body, data } = req.body;

  if (!topic || !title || !body) {
    return res.status(400).json({ success: false, error: 'topic, title, and body are required' });
  }

  const message = {
    topic,
    notification: { title, body },
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