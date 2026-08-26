# AI Support Automation

An intelligent customer support system that analyzes incoming messages using AI, makes business decisions, and automates responses — integrated with n8n for workflow orchestration.

## Architecture

Customer → Webhook → n8n → Node.js API → Groq AI → Decision
├── Auto Reply
├── Create Ticket
└── Human Review (Escalation)

## Features

- **AI-Powered Analysis**: Intent detection, sentiment analysis, priority scoring
- **Input Validation & Normalization**: Validates incoming messages before processing
- **AI Response Validation**: Ensures AI outputs conform to expected schema
- **Business Decision Engine**: Routes to auto-reply, ticket creation, or human review
- **Ticket Management**: Create, assign, close, and review support tickets
- **CRM Integration**: Webhook-based integration with any CRM (HubSpot, Salesforce, etc.)
- **Team Notifications**: Escalation alerts via Slack, Discord, or custom webhooks
- **Redis Caching**: Caches AI responses to reduce latency and API costs
- **n8n Integration**: Pre-built workflow with decision-based routing
- **Webhook Security**: Secret-based authentication for all write endpoints

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express 5
- **Database**: SQLite via Prisma ORM
- **AI**: Groq (OpenAI-compatible API)
- **Cache**: Redis (optional)
- **Orchestration**: n8n
- **Security**: Helmet + CORS + Webhook Secret Auth

## Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your keys

# Setup database
npx prisma db push

# Start server
node server.js
```

API Endpoints
Method
Endpoint
Auth
Description
POST /webhook/analyze ✅ Analyze message & make decision
GET /tickets ❌ List all tickets
GET /tickets/review ✅ List escalated tickets
PATCH /tickets/:id/close ✅ Close a ticket
PATCH /tickets/:id/assign ✅ Assign ticket to agent
PATCH /tickets/:id/review ✅ Approve or reject escalated ticket
GET /health ❌ Health check

Example Request

bash

curl -X POST http://localhost:3000/webhook/analyze \
 -H "Content-Type: application/json" \
 -H "x-webhook-secret: your-secret" \
 -d '{"message": "I want to return this product", "source": "whatsapp"}'

Example Response

{
"decision": "create_ticket",
"analysis": {
"intent": "refund",
"sentiment": "negative",
"priority": "high",
"summary": "Customer wants to return a product",
"should_escalate": false,
"suggested_reply": "I'd be happy to help with your return..."
},
"ticket": {
"id": "clxxx...",
"status": "open"
}
}

Decision Flow
auto_reply: Low-priority messages get an AI-generated response
create_ticket: Refunds and complaints create a support ticket
human_review: Urgent or escalated issues are flagged for human agents

License
MIT


