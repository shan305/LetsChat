# LetsChat Backend

Real-time messaging backend with Socket.IO, MongoDB, Redis, and RabbitMQ.

## Requirements

- Node.js 18+
- Docker and Docker Compose

## Quick Start

```bash
# Clone and install
npm install

# Copy environment file
cp .env.example .env

# Start infrastructure (MongoDB, Redis, RabbitMQ)
npm run docker:up

# Seed test data
npm run seed

# Start server
npm run dev
```

## Infrastructure

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# Reset (delete all data)
npm run docker:reset
```

Access RabbitMQ management UI at http://localhost:15672 (letschat/letschat)

## Project Structure

```
src/
├── config/           # Configuration and connections
│   ├── index.js      # Environment config
│   ├── database.js   # MongoDB
│   ├── redis.js      # Redis
│   └── rabbitmq.js   # RabbitMQ
├── models/           # Mongoose schemas
│   ├── User.js
│   ├── Conversation.js
│   ├── Message.js
│   ├── Media.js
│   ├── ReadState.js
│   └── Passcode.js
├── services/         # Business logic
│   ├── UserService.js
│   ├── MessageService.js
│   ├── ConversationService.js
│   ├── MediaService.js
│   ├── PresenceService.js
│   ├── CallService.js
│   └── TypingService.js
├── socket/           # Socket.IO handlers
│   ├── index.js
│   └── handlers/
│       ├── userHandler.js
│       ├── chatHandler.js
│       └── callHandler.js
├── middleware/       # Rate limiting
├── utils/            # Logger, errors
└── app.js            # Entry point
```


## Socket.IO Events (Actual Emissions)

This section documents **only events that the backend emits** to clients.
Events not listed here are **not guaranteed** to be emitted.

---

### Authentication & Presence

| Event            | Emitted When                                      | Payload                    |
| ---------------- | ------------------------------------------------- | -------------------------- |
| `signInSuccess`  | Successful sign-in or registration                | `{ user, token }`          |
| `signInError`    | Invalid credentials or validation error           | `string`                   |
| `signOutSuccess` | Explicit sign-out                                 | `void`                     |
| `userOnline`     | User becomes online (first active socket)         | `{ userId, phoneNumber }`  |
| `userOffline`    | User goes fully offline (last socket disconnects) | `{ userId, phoneNumber? }` |

Notes:

* Presence is **Redis-backed** and multi-device aware.
* Online/offline is emitted only on **state transitions**, not every connect/disconnect.

---

### Friends

| Event                 | Emitted When                 | Payload        |
| --------------------- | ---------------------------- | -------------- |
| `addFriendSuccess`    | Friend added by current user | `{ friend }`   |
| `addFriendError`      | Add friend failed            | `string`       |
| `friendAdded`         | Other user is notified       | `{ friend }`   |
| `removeFriendSuccess` | Friend removed               | `{ friendId }` |
| `friendRemoved`       | Other user is notified       | `{ friendId }` |
| `getFriendsSuccess`   | Friend list fetched          | `{ friends }`  |
| `getFriendsError`     | Fetch failed                 | `string`       |

---

### Messaging (Direct & Group)

| Event                    | Emitted When               | Payload                         |
| ------------------------ | -------------------------- | ------------------------------- |
| `chatMessageSuccess`     | Sender message accepted    | `message object`                |
| `chatMessageError`       | Message rejected           | `string`                        |
| `newMessage`             | Recipient receives message | `message object`                |
| `messageEdited`          | Message edited             | `message object`                |
| `messageDeleted`         | Message deleted            | `{ messageId, conversationId }` |
| `getChatMessagesSuccess` | Message history fetched    | `message[]`                     |
| `getChatMessagesError`   | Fetch failed               | `string`                        |

Notes:

* Messages are **persisted before emission**.
* Duplicate detection is supported via `clientMessageId`.

---

### Read Receipts

| Event             | Emitted When                | Payload                                 |
| ----------------- | --------------------------- | --------------------------------------- |
| `markReadSuccess` | Sender confirms read        | `{ conversationId, messageId }`         |
| `messagesRead`    | Other participants notified | `{ conversationId, userId, messageId }` |

Notes:

* Backed by `ReadState` (per-user, per-conversation).
* Unread counters are denormalized for performance.

---

### Typing Indicators

| Event        | Emitted When       | Payload                               |
| ------------ | ------------------ | ------------------------------------- |
| `typing`     | User starts typing | `{ conversationId?, userId, sender }` |
| `stopTyping` | User stops typing  | `{ conversationId?, userId, sender }` |

Notes:

* Typing state is **ephemeral**.
* Stored in Redis with TTL.
* No delivery guarantees.

---

### Conversations & Groups

| Event                     | Emitted When              | Payload                       |
| ------------------------- | ------------------------- | ----------------------------- |
| `getConversationsSuccess` | Conversation list fetched | `{ conversations }`           |
| `getConversationsError`   | Fetch failed              | `string`                      |
| `createGroupSuccess`      | Group created             | `{ conversation }`            |
| `createGroupError`        | Creation failed           | `string`                      |
| `addedToGroup`            | User added to group       | `{ conversation }`            |
| `usersAddedToGroup`       | Existing members notified | `{ conversationId, userIds }` |
| `leaveGroupSuccess`       | User leaves group         | `{ conversationId }`          |
| `userLeftGroup`           | Members notified          | `{ conversationId, userId }`  |
| `removeFromGroupSuccess`  | User removed              | `{ conversationId, userId }`  |
| `removedFromGroup`        | Removed user notified     | `{ conversationId }`          |
| `userRemovedFromGroup`    | Members notified          | `{ conversationId, userId }`  |

---

### Calls

| Event           | Emitted When       | Payload              |
| --------------- | ------------------ | -------------------- |
| `incomingCall`  | Call initiated     | `{ caller, callId }` |
| `callConnected` | Call answered      | `{ callId }`         |
| `callRejected`  | Call rejected      | `{ callId }`         |
| `callEnded`     | Call ended         | `{ callId }`         |
| `callError`     | Call setup failure | `string`             |

---

### Rate Limiting & Errors

| Event         | Emitted When          | Payload                   |
| ------------- | --------------------- | ------------------------- |
| `rateLimited` | Socket exceeds limits | `{ message, retryAfter }` |

Notes:

* Rate limiting is **Redis-based**.
* Fail-open: Redis outage does **not** block events.

---

## Guarantees & Non-Guarantees

**Guaranteed**

* Persisted messages are never emitted before DB commit
* Duplicate message protection via `clientMessageId`
* Multi-device delivery per user

**Not Guaranteed**

* Typing indicators
* Presence accuracy during Redis outages
* Delivery order across reconnects

---

## Intentional Omissions

The backend **does not emit**:

* Message delivery acknowledgements per socket
* “User is typing” state snapshots
* Global online user lists

These are intentional to keep the real-time path minimal.

---

If you want next, we can:

* align frontend expectations against this list
* remove dead listeners in client code
* add a **wire-level message schema** (one page, no fluff)
* or freeze this as v1 contract

Just tell me.
