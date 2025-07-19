const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const WEBHOOK_CONFIG = {
  makecom: {
    baseUrl: 'https://hook.us2.make.com',
    defaultWebhookId: 'ljynvsqjkzmhwm1gdjlmnkeytim5xdl8'
  }
};

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.post('/airtable', async (req, res) => {
  const { table, records, overwrite = false } = req.body;

  const payload = {
    table,
    records,
    overwrite
  };

  try {
    const response = await fetch(`${WEBHOOK_CONFIG.makecom.baseUrl}/${WEBHOOK_CONFIG.makecom.defaultWebhookId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.text();
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Relay server running on port ${PORT}`);
