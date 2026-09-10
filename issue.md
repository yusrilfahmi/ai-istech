# Issue: Build Chatbot Web Application — Next.js + Express + PostgreSQL

## 1. Objective

Build a production-ready chatbot web application with a UI/UX inspired by ChatGPT.

The application must have:

- Next.js frontend
- Express.js backend
- PostgreSQL database
- User authentication and role-based access
- ChatGPT-like conversation interface
- Recent Chat sidebar
- Text message input
- Voice input
- Admin/Master knowledge management
- SOP knowledge files
- Machine Learning dataset management
- Knowledge source tracking for AI responses
- Audit logging for Admin/Master actions

The project is already separated into:

```text
chatbot/
├── frontend/    # Next.js
└── backend/     # Express.js
```

Do not merge frontend and backend into one application.

---

# 2. Core Architecture

```text
                    ┌──────────────────┐
                    │    Next.js       │
                    │    Frontend      │
                    └────────┬─────────┘
                             │
                         HTTP / API
                             │
                             ↓
                    ┌──────────────────┐
                    │    Express.js    │
                    │     Backend      │
                    └───────┬──────────┘
                            │
                  ┌─────────┴─────────┐
                  ↓                   ↓
           PostgreSQL                n8n
                  │                   │
                  │                   ↓
                  │                  AI
                  │
                  ↓
           Knowledge Base
```

Frontend must communicate with PostgreSQL only through the Express backend.

Next.js must NOT connect directly to PostgreSQL.

---

# 3. PostgreSQL Configuration

Local development PostgreSQL is running through Docker.

Current Docker container:

```text
Container: postgres
Image: postgres:17.11-bookworm
Host: localhost
Port: 5432
Database: mydb
Username: postgres
Password: postgres123
```

Use environment variables. Never hardcode database credentials inside source code.

Backend `.env` should use:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=postgres
DB_PASSWORD=postgres123
```

Or alternatively:

```env
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/mydb
```

Do not commit `.env` to Git.

Make sure `.gitignore` contains:

```text
.env
.env.*
!.env.example
```

Create `.env.example` with placeholder values.

---

# 4. User Roles

There are exactly three roles:

```text
admin
master
user
```

Permissions:

| Feature | User | Master | Admin |
|---|---:|---:|---:|
| Login | Yes | Yes | Yes |
| Chat | Yes | Yes | Yes |
| View Recent Chat | Yes | Yes | Yes |
| Send text | Yes | Yes | Yes |
| Send voice | Yes | Yes | Yes |
| Upload SOP | No | Yes | Yes |
| Upload ML Dataset | No | Yes | Yes |
| Preview knowledge file | No | Yes | Yes |
| Confirm knowledge file | No | Yes | Yes |
| Archive knowledge | No | Yes | Yes |
| Manage users | No | No | Yes |
| View audit logs | No | Yes* | Yes |

`*` Master access to audit logs may be restricted to relevant knowledge-management actions if desired.

Authorization must be implemented in the Express backend.

Do not rely only on hiding buttons in the frontend.

---

# 5. Chat UI

The main chatbot interface should feel similar to ChatGPT.

Layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Sidebar                         │ Main Chat                   │
│                                 │                             │
│ Profile                         │                             │
│                                 │                             │
│ + New Chat                      │                             │
│                                 │        Chat messages        │
│ Recent Chat                     │                             │
│ • Chat 1                        │                             │
│ • Chat 2                        │                             │
│ • Chat 3                        │                             │
│                                 │                             │
│                                 │                             │
│ Logout                          │                             │
│                                 │ ┌─────────────────────────┐ │
│                                 │ │ Message...       🎙 Send│ │
│                                 │ └─────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

The design should be clean, minimal, responsive, and professional.

Do not copy ChatGPT branding, logo, or exact proprietary UI. Use a similar general conversational layout and interaction pattern.

---

# 6. Conversation Rules

Users must NOT be able to upload files inside a conversation.

There must be:

- No paperclip button
- No file picker
- No drag-and-drop file upload
- No chat attachment functionality

The only ways to send a message from the conversation UI are:

1. Text
2. Voice

Knowledge files are managed separately by Admin/Master.

---

# 7. Text Input

The chat input must support:

- Multiline text
- Enter to send
- Shift + Enter for newline
- Send button
- Disabled send button when there is no message
- Loading state while waiting for response
- Auto-scroll to newest message
- Proper error state

Example:

```text
┌─────────────────────────────────────────────┐
│ Ask anything...                             │
│                                             │
│                                      🎙  ➤  │
└─────────────────────────────────────────────┘
```

---

# 8. Voice Input

The conversation must support voice input.

Important:

Voice input is NOT a file upload feature.

Recommended MVP behavior:

```text
User presses microphone
        ↓
Browser records/listens to voice
        ↓
Speech is converted to text
        ↓
Text appears in chat input
        ↓
User can review/edit
        ↓
User sends message
```

Prefer browser-native speech recognition when supported.

If browser-native speech recognition is unavailable, show a clear fallback message rather than breaking the chat.

The final stored chat message should still be a normal text message.

Do not create a `chat_attachments` table.

---

# 9. New Chat

Clicking `New Chat` must create a new conversation.

Initially:

```text
title = "New Chat"
```

After the first user message, the system may automatically generate a more meaningful title.

Example:

```text
User:
How do I check compressor maintenance?

Conversation title:
Compressor Maintenance
```

Do not generate a title for every message.

---

# 10. Recent Chat

Recent Chat is based on the `conversations` table.

Sort by:

```text
updated_at DESC
```

Show the latest conversations first.

Example:

```text
Recent Chat

Compressor Maintenance
PostgreSQL Query Analysis
Machine Learning Dataset
Energy Consumption
```

Limit the initial sidebar query to a reasonable number such as 20 conversations.

The user must only see their own conversations.

Backend must enforce:

```text
conversation.user_id === authenticated_user.id
```

Do not rely on frontend filtering for this.

---

# 11. Chat Message Storage

Messages are stored in PostgreSQL.

Roles:

```text
user
assistant
system
```

Example:

```text
Conversation
    ↓
Message 1
user
"How do I maintain E_AC01?"

Message 2
assistant
"According to the SOP..."
```

Store AI metadata when available:

- model
- input_tokens
- output_tokens
- metadata

Do not make token fields mandatory.

---

# 12. Knowledge Management

Knowledge management is a separate feature from the chat interface.

Only Admin and Master can add knowledge.

There are two knowledge categories:

```text
SOP
ML Dataset
```

All knowledge files enter through one central knowledge management flow.

```text
Admin / Master
      ↓
Upload
      ↓
Preview
      ↓
Confirm
      ↓
Active
      ↓
Available to AI
```

A file must NOT become active before confirmation.

---

# 13. SOP Management

SOP files are primarily PDF documents.

Example:

```text
SOP Compressor A.pdf
SOP Compressor B.pdf
SOP Maintenance.pdf
```

SOP metadata:

- title
- description
- category
- machine_type
- version
- original file name
- file type
- MIME type
- file size
- storage URL
- upload user
- status
- timestamps

Possible statuses:

```text
draft
active
archived
rejected
```

---

# 14. ML Dataset Management

ML datasets are primarily CSV/XLSX data.

A single dataset can contain multiple files.

Example:

```text
Dataset:
Compressor 2026

Files:
- compressor_january.csv
- compressor_february.csv
- compressor_march.csv
```

Dataset metadata:

- name
- description
- machine_type
- dataset_version
- created_by
- status
- timestamps

Files belonging to the dataset are stored through `ml_dataset_files`.

---

# 15. Knowledge Files

`knowledge_files` is the central file metadata table.

It represents files uploaded by Admin/Master into the knowledge base.

It is NOT for user chat uploads.

Fields:

```text
id
uploaded_by
file_name
original_name
file_type
mime_type
file_size
storage_url
checksum
knowledge_type
status
created_at
updated_at
activated_at
```

`original_name` is the human-readable filename shown in the UI.

Do not duplicate `original_name` into other tables.

If the application needs the original filename, retrieve it through the relationship to `knowledge_files`.

---

# 16. Message Sources

When the AI answers a user using information from the knowledge base, record the source.

Relationship:

```text
messages
    ↓
message_sources
    ↓
knowledge_files
```

`message_sources` contains:

```text
id
message_id
knowledge_file_id
relevance_score
created_at
```

Do NOT add:

```text
original_name
file_name
```

to `message_sources`.

The filename must be retrieved from:

```text
knowledge_files.original_name
```

Example UI:

```text
Answer from AI

According to the maintenance procedure...

Sources
────────────────────────
📄 SOP_E_AC01.pdf
📄 SOP_Compressor.pdf
```

---

# 17. Audit Logs

Admin/Master knowledge management actions should be auditable.

Examples:

```text
UPLOAD
CONFIRM
ACTIVATE
ARCHIVE
REJECT
UPDATE
DELETE
```

Store:

```text
user_id
action
entity_type
entity_id
old_data
new_data
created_at
```

Use JSONB for `old_data` and `new_data`.

This is important so the system can answer:

```text
Who uploaded this SOP?
Who activated it?
Who archived it?
When was it changed?
```

---

# 18. Database Schema

Use PostgreSQL with the following logical schema:

```text
users
    │
    ├─────────────── conversations
    │                      │
    │                      └── messages
    │                              │
    │                              └── message_sources
    │                                      │
    │                                      ↓
    │                              knowledge_files
    │                                  │       │
    │                                  ↓       ↓
    │                              SOP       ML Dataset
    │
    ├────────────── knowledge_files
    │
    ├────────────── ml_datasets
    │
    └────────────── audit_logs
```

Use the following DBML as the database design reference:

```dbml
Enum user_role {
  admin
  master
  user
}

Enum knowledge_type {
  sop
  ml_dataset
}

Enum knowledge_status {
  draft
  active
  archived
  rejected
}

Enum message_role {
  user
  assistant
  system
}

Enum file_type {
  pdf
  csv
  xlsx
  xls
  doc
  docx
  txt
  other
}

Table users {
  id uuid [pk, default: `gen_random_uuid()`]
  name varchar(255) [not null]
  email varchar(255) [unique, not null]
  password_hash text
  role user_role [not null, default: 'user']
  is_active boolean [not null, default: true]

  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
}

Table knowledge_files {
  id uuid [pk, default: `gen_random_uuid()`]
  uploaded_by uuid [not null]

  file_name varchar(255) [not null]
  original_name varchar(255) [not null]
  file_type file_type [not null]
  mime_type varchar(150)
  file_size bigint
  storage_url text [not null]
  checksum varchar(128)

  knowledge_type knowledge_type [not null]
  status knowledge_status [not null, default: 'draft']

  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  activated_at timestamptz

  indexes {
    (knowledge_type, status)
    (uploaded_by, created_at)
  }
}

Table sop_documents {
  id uuid [pk, default: `gen_random_uuid()`]
  knowledge_file_id uuid [unique, not null]

  title varchar(255) [not null]
  description text
  category varchar(100)
  machine_type varchar(150)
  version varchar(50) [not null, default: '1.0']

  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
}

Table ml_datasets {
  id uuid [pk, default: `gen_random_uuid()`]

  name varchar(255) [not null]
  description text
  machine_type varchar(150)
  dataset_version varchar(50) [not null, default: '1.0']

  created_by uuid [not null]
  status knowledge_status [not null, default: 'draft']

  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
}

Table ml_dataset_files {
  id uuid [pk, default: `gen_random_uuid()`]
  dataset_id uuid [not null]
  knowledge_file_id uuid [unique, not null]

  created_at timestamptz [not null, default: `now()`]
}

Table conversations {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null]

  title varchar(255)

  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (user_id, updated_at)
  }
}

Table messages {
  id uuid [pk, default: `gen_random_uuid()`]
  conversation_id uuid [not null]

  role message_role [not null]
  content text

  model varchar(100)
  input_tokens int
  output_tokens int

  metadata jsonb

  created_at timestamptz [not null, default: `now()`]

  indexes {
    (conversation_id, created_at)
  }
}

Table message_sources {
  id uuid [pk, default: `gen_random_uuid()`]

  message_id uuid [not null]
  knowledge_file_id uuid [not null]

  relevance_score decimal(6,5)

  created_at timestamptz [not null, default: `now()`]

  indexes {
    (message_id)
    (knowledge_file_id)
  }
}

Table audit_logs {
  id uuid [pk, default: `gen_random_uuid()`]

  user_id uuid

  action varchar(100) [not null]
  entity_type varchar(100) [not null]
  entity_id uuid

  old_data jsonb
  new_data jsonb

  created_at timestamptz [not null, default: `now()`]

  indexes {
    (user_id, created_at)
    (entity_type, entity_id)
  }
}

Ref: users.id < knowledge_files.uploaded_by [delete: restrict]
Ref: users.id < ml_datasets.created_by [delete: restrict]
Ref: users.id < conversations.user_id [delete: cascade]
Ref: users.id < audit_logs.user_id [delete: set null]

Ref: knowledge_files.id - sop_documents.knowledge_file_id [delete: cascade]

Ref: ml_datasets.id < ml_dataset_files.dataset_id [delete: cascade]
Ref: knowledge_files.id - ml_dataset_files.knowledge_file_id [delete: cascade]

Ref: conversations.id < messages.conversation_id [delete: cascade]

Ref: messages.id < message_sources.message_id [delete: cascade]
Ref: knowledge_files.id < message_sources.knowledge_file_id [delete: restrict]
```

---

# 19. Backend Structure

Use a clean Express structure.

Recommended:

```text
backend/
├── src/
│   ├── config/
│   │   └── database.js
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── chat.controller.js
│   │   ├── conversation.controller.js
│   │   ├── knowledge.controller.js
│   │   └── user.controller.js
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   └── error.middleware.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── chat.routes.js
│   │   ├── conversation.routes.js
│   │   ├── knowledge.routes.js
│   │   └── user.routes.js
│   │
│   ├── services/
│   │   ├── chat.service.js
│   │   ├── knowledge.service.js
│   │   └── n8n.service.js
│   │
│   ├── app.js
│   └── server.js
│
├── .env
├── .env.example
├── package.json
└── .gitignore
```

Do not over-engineer the backend before the core flow works.

---

# 20. Frontend Structure

Recommended Next.js App Router structure:

```text
frontend/
├── app/
│   ├── login/
│   │   └── page.tsx
│   │
│   ├── chat/
│   │   ├── page.tsx
│   │   └── [conversationId]/
│   │       └── page.tsx
│   │
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── sop/
│   │   │   └── page.tsx
│   │   └── datasets/
│   │       └── page.tsx
│   │
│   └── layout.tsx
│
├── components/
│   ├── chat/
│   ├── sidebar/
│   ├── knowledge/
│   └── ui/
│
├── lib/
│   └── api.ts
│
├── types/
│   └── index.ts
│
└── public/
```

Keep reusable components separate from page-level components.

---

# 21. API Design

Use REST APIs initially.

Authentication:

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Conversations:

```text
GET    /api/conversations
POST   /api/conversations
GET    /api/conversations/:id
DELETE /api/conversations/:id
```

Messages:

```text
GET  /api/conversations/:id/messages
POST /api/conversations/:id/messages
```

Chat:

```text
POST /api/chat
```

Knowledge:

```text
GET    /api/knowledge
POST   /api/knowledge
GET    /api/knowledge/:id
PATCH  /api/knowledge/:id
DELETE /api/knowledge/:id
POST   /api/knowledge/:id/confirm
POST   /api/knowledge/:id/archive
```

User management:

```text
GET   /api/users
POST  /api/users
PATCH /api/users/:id
```

Exact route design can be adjusted if there is a strong technical reason.

---

# 22. n8n Integration

The Express backend should act as the main application backend.

Do not expose the n8n webhook directly to the browser unless there is a specific reason.

Preferred flow:

```text
Next.js
   ↓
Express
   ↓
n8n webhook
   ↓
AI / RAG processing
   ↓
Express
   ↓
PostgreSQL
   ↓
Next.js
```

The n8n URL must be stored in an environment variable:

```env
N8N_WEBHOOK_URL=...
```

Do not hardcode it.

---

# 23. Chat Request Flow

For a normal text message:

```text
1. User types message
2. Next.js sends request to Express
3. Express validates authentication
4. Express validates conversation ownership
5. Express stores user message
6. Express sends required data to n8n
7. n8n processes AI request
8. n8n returns AI response
9. Express stores assistant message
10. Express stores message sources if provided
11. Express updates conversation.updated_at
12. Express returns response to Next.js
13. Next.js displays assistant message
```

Handle failures gracefully.

If n8n fails, the UI should show an error without corrupting the conversation.

---

# 24. Knowledge Upload Flow

Admin/Master:

```text
1. Open Knowledge Management
2. Select SOP or ML Dataset
3. Select file
4. Upload
5. Backend validates role
6. Backend stores file
7. Backend creates knowledge_files record
8. Backend creates SOP/ML metadata
9. Status = draft
10. Frontend displays preview
11. User confirms
12. Backend changes status = active
13. Knowledge becomes available to AI
```

Do not activate automatically after upload.

---

# 25. Security Requirements

Implement at minimum:

- Password hashing
- Authentication
- Authorization middleware
- Conversation ownership validation
- Input validation
- SQL parameterization
- CORS configuration
- Environment variables for secrets
- `.env` excluded from Git
- Proper HTTP error handling

Never build SQL using direct string interpolation with user input.

Bad:

```text
SELECT * FROM users WHERE email = '${email}'
```

Use parameterized queries.

---

# 26. UI/UX Requirements

The application should be:

- Responsive
- Desktop-first but mobile-friendly
- Clean
- Minimal
- Professional
- Fast-feeling
- Accessible

Chat should have:

- Sidebar
- New Chat
- Recent Chat
- User profile
- Logout
- Message bubbles
- Assistant response
- Loading indicator
- Microphone button
- Send button
- Auto-scroll
- Empty state
- Error state

Do not add unnecessary features such as:

- File upload in chat
- Image upload
- Emoji picker
- GIF picker
- Social sharing
- Public conversations

Keep the MVP focused.

---

# 27. Development Priority

Implement in this order:

## Phase 1 — Project foundation

- Verify Next.js frontend
- Verify Express backend
- Connect Express to PostgreSQL
- Create database tables
- Create `.env`
- Create `.env.example`

## Phase 2 — Authentication

- Login
- User session/authentication
- Role middleware
- Admin/Master/User authorization

## Phase 3 — Chat

- New Chat
- Create conversation
- Send text message
- Store messages
- Display messages
- Recent Chat
- Conversation switching

## Phase 4 — Voice

- Microphone interaction
- Speech-to-text
- Insert transcript into chat input
- Send as normal text message

## Phase 5 — Knowledge Management

- Admin/Master dashboard
- SOP upload
- SOP preview
- Confirm
- ML dataset upload
- Dataset preview
- Confirm
- Active/archive states

## Phase 6 — n8n

- Express → n8n
- AI response
- Store assistant response
- Store message sources

## Phase 7 — Audit

- Record knowledge-management actions
- Display audit information where appropriate

---

# 28. Important Constraints

Do NOT:

- Put Express code inside Next.js
- Connect Next.js directly to PostgreSQL
- Allow normal users to upload knowledge
- Allow users to upload files in chat
- Create `chat_attachments`
- Duplicate `original_name` into `message_sources`
- Expose database credentials to the frontend
- Expose n8n webhook secrets to the frontend
- Store `.env` in Git
- Automatically activate knowledge files before confirmation

Do:

- Keep frontend and backend separated
- Use PostgreSQL as the main relational database
- Use `conversations` for Recent Chat
- Use `messages` for conversation history
- Use `knowledge_files` as the central knowledge file metadata table
- Use `message_sources` to link AI answers to knowledge files
- Use `original_name` from `knowledge_files`
- Enforce role permissions in Express
- Keep the architecture simple enough to maintain

---

# 29. Definition of Done

The implementation is considered successful when:

- [ ] Frontend runs successfully
- [ ] Backend runs successfully
- [ ] Backend connects to PostgreSQL
- [ ] User can log in
- [ ] Role-based authorization works
- [ ] User can create a New Chat
- [ ] User can send text messages
- [ ] User can use voice input
- [ ] User cannot upload files in chat
- [ ] Recent Chat works
- [ ] Conversation history persists after refresh
- [ ] Admin/Master can upload SOP
- [ ] Admin/Master can upload ML datasets
- [ ] Knowledge files require confirmation before activation
- [ ] User cannot manage knowledge
- [ ] AI responses can be returned through n8n
- [ ] AI source files can be recorded through `message_sources`
- [ ] Source filename is retrieved from `knowledge_files.original_name`
- [ ] Audit logs record important Admin/Master actions
- [ ] No credentials are hardcoded in frontend code
- [ ] No `.env` files are committed
- [ ] No chat attachment functionality exists

---

# 30. Implementation Instruction for AI Agent

Before writing large amounts of code:

1. Inspect the existing `frontend/` and `backend/` directories.
2. Inspect both `package.json` files.
3. Reuse the existing Next.js setup instead of recreating the project.
4. Reuse existing dependencies when possible.
5. Do not overwrite working code unnecessarily.
6. Build the application incrementally.
7. After each major phase, verify that the project still builds and runs.
8. Keep frontend and backend responsibilities clearly separated.
9. Use the database schema in this issue as the source of truth.
10. If an implementation detail is not specified, choose the simplest maintainable solution rather than introducing unnecessary libraries or architecture.

The final result should be a clean, functional chatbot application with a ChatGPT-like conversational experience and a separate Admin/Master knowledge-management system.
