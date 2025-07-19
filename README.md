# Airtable Webhook Relay Server

This is a lightweight Node.js relay server that receives structured content and forwards it to a Make.com webhook connected to Airtable.

## 🚀 Deploy to Railway

1. Fork this repo
2. Go to [https://railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Click "Deploy"

Your server will be publicly accessible and ready to receive Claude-style JSON payloads.

## 📦 Local Development

```bash
npm install
node webhook-relay-server.js
```

## 📬 POST Example

```
POST /airtable
Content-Type: application/json

{
  "table": "Content",
  "records": [
    {
      "Name": "Example Post",
      "Channel": "Instagram",
      "Date": "2025-07-20",
      "Status": "Draft"
    }
  ]
}
```

## 🛠️ Endpoints

- `GET /health` → returns OK
- `POST /airtable` → forwards to Make.com webhook
