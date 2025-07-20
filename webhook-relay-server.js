const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

const WEBHOOK_CONFIG = {
  makecom: {
    baseUrl: 'https://hook.us2.make.com',
    defaultWebhookId: 'ljynvsqjkzmhwm1gdjlmnkeytim5xdl8'
  }
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    server: 'Webhook Relay Middleware',
    webClient: 'Available at /'
  });
});

app.post('/webhook/:service/:webhookId', async (req, res) => {
  const { service, webhookId } = req.params;
  const payload = req.body;

  console.log('Webhook relay request received:');
  console.log('Service:', service);
  console.log('Webhook ID:', webhookId);

  if (service !== 'makecom') {
    return res.status(400).json({
      error: 'Unsupported service',
      supportedServices: ['makecom']
    });
  }

  const targetUrl = `${WEBHOOK_CONFIG.makecom.baseUrl}/${webhookId}`;

  try {
    const result = await forwardToWebhook(targetUrl, payload);
    
    console.log('Webhook relay successful');
    res.json({
      success: true,
      target: targetUrl,
      status: result.status,
      response: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Webhook relay failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      target: targetUrl,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/webhook/:service', async (req, res) => {
  const { service } = req.params;
  const payload = req.body;

  console.log('Webhook relay request received (using default ID):');
  console.log('Service:', service);

  if (service !== 'makecom') {
    return res.status(400).json({
      error: 'Unsupported service',
      supportedServices: ['makecom']
    });
  }

  const targetWebhookId = WEBHOOK_CONFIG.makecom.defaultWebhookId;
  const targetUrl = `${WEBHOOK_CONFIG.makecom.baseUrl}/${targetWebhookId}`;

  try {
    const result = await forwardToWebhook(targetUrl, payload);
    
    console.log('Webhook relay successful');
    res.json({
      success: true,
      target: targetUrl,
      status: result.status,
      response: result.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Webhook relay failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      target: targetUrl,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/airtable', async (req, res) => {
  const { webhookId, ...payload } = req.body;
  
  console.log('Airtable request received:');
  console.log('Webhook ID:', webhookId);

  const targetWebhookId = webhookId || WEBHOOK_CONFIG.makecom.defaultWebhookId;
  const targetUrl = `${WEBHOOK_CONFIG.makecom.baseUrl}/${targetWebhookId}`;

  try {
    const result = await forwardToWebhook(targetUrl, payload);
    
    console.log('Airtable relay successful');
    res.json({
      success: true,
      service: 'airtable-via-makecom',
      target: targetUrl,
      status: result.status,
      response: result.data,
      recordsProcessed: payload.records?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Airtable relay failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      target: targetUrl,
      timestamp: new Date().toISOString()
    });
  }
});

function forwardToWebhook(targetUrl, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url = new URL(targetUrl);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Webhook-Relay-Middleware/1.0'
      }
    };

    console.log('Forwarding to:', targetUrl);

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log('Webhook response:', res.statusCode, res.statusMessage);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            data: responseData || 'Success'
          });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage} - ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: {
      'GET /': 'Web client interface',
      'GET /health': 'Health check',
      'POST /webhook/makecom/:webhookId': 'Generic webhook relay with ID',
      'POST /webhook/makecom': 'Generic webhook relay (default ID)',
      'POST /airtable': 'Airtable via Make.com relay'
    },
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log('Webhook Relay Middleware Server Started');
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`Web client available at: http://localhost:${PORT}/`);
  console.log('Available endpoints:');
  console.log('  GET  /                           - Web client interface');
  console.log('  GET  /health                     - Health check');
  console.log('  POST /webhook/makecom/:id        - Generic webhook relay with ID');
  console.log('  POST /webhook/makecom            - Generic webhook relay (default ID)');
  console.log('  POST /airtable                   - Airtable via Make.com');
});

module.exports = app;
