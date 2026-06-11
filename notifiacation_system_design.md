# Notification System Design

-----

## Stage 1

### Overview

This document defines the REST API design and contract for a real-time notification platform using WebSockets. The system allows a front-end application to receive, manage, and interact with notifications for logged-in users.

> Authentication: All users are assumed to be pre-authorised. No login or registration is required. All endpoints require a valid Authorization: Bearer <token> header.

-----

### Core Actions

The notification platform supports the following core actions:

1. Fetch all notifications for a user
1. Fetch a single notification by ID
1. Mark a notification as read
1. Mark all notifications as read
1. Delete a notification
1. Get unread notification count
1. Real-time notification delivery via WebSocket

-----

### REST API Endpoints

-----

#### 1. Get All Notifications

*GET* /api/notifications

*Headers:*

json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}


*Query Params:*

|Param   |Type  |Description                  |
|--------|------|-----------------------------|
|page  |number|Page number (default: 1)     |
|limit |number|Items per page (default: 20) |
|status|string|read or unread (optional)|

*Response (200 OK):*

json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "userId": "uuid",
        "title": "New message received",
        "body": "You have a new message from Dr. Sharma",
        "type": "message",
        "isRead": false,
        "createdAt": "2026-06-11T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}


-----

#### 2. Get Single Notification

*GET* /api/notifications/:id

*Headers:*

json
{
  "Authorization": "Bearer <token>"
}


*Response (200 OK):*

json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Appointment Reminder",
    "body": "Your appointment is scheduled for tomorrow at 10 AM",
    "type": "reminder",
    "isRead": false,
    "createdAt": "2026-06-11T08:00:00.000Z"
  }
}


*Response (404 Not Found):*

json
{
  "success": false,
  "message": "Notification not found"
}


-----

#### 3. Mark Notification as Read

*PATCH* /api/notifications/:id/read

*Headers:*

json
{
  "Authorization": "Bearer <token>"
}


*Response (200 OK):*

json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "id": "uuid",
    "isRead": true,
    "updatedAt": "2026-06-11T10:30:00.000Z"
  }
}


-----

#### 4. Mark All Notifications as Read

*PATCH* /api/notifications/read-all

*Headers:*

json
{
  "Authorization": "Bearer <token>"
}


*Response (200 OK):*

json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 15
  }
}


-----

#### 5. Delete a Notification

*DELETE* /api/notifications/:id

*Headers:*

json
{
  "Authorization": "Bearer <token>"
}


*Response (200 OK):*

json
{
  "success": true,
  "message": "Notification deleted successfully"
}


*Response (404 Not Found):*

json
{
  "success": false,
  "message": "Notification not found"
}


-----

#### 6. Get Unread Notification Count

*GET* /api/notifications/unread-count

*Headers:*

json
{
  "Authorization": "Bearer <token>"
}


*Response (200 OK):*

json
{
  "success": true,
  "data": {
    "unreadCount": 7
  }
}


-----

### Real-Time Notifications via WebSocket

WebSocket endpoint: ws://<host>/ws/notifications

#### Connection

The client connects with the Bearer token as a query param:


ws://localhost:3000/ws/notifications?token=<access_token>


#### Server → Client Events

*New Notification:*

json
{
  "event": "new_notification",
  "data": {
    "id": "uuid",
    "title": "New alert",
    "body": "You have a new update",
    "type": "alert",
    "isRead": false,
    "createdAt": "2026-06-11T11:00:00.000Z"
  }
}


*Notification Read Acknowledgement:*

json
{
  "event": "notification_read",
  "data": {
    "id": "uuid",
    "isRead": true
  }
}


#### Client → Server Events

*Subscribe to notifications:*

json
{
  "event": "subscribe",
  "userId": "uuid"
}


*Mark as read via WebSocket:*

json
{
  "event": "mark_read",
  "notificationId": "uuid"
}


-----

### Error Response Format (All Endpoints)

json
{
  "success": false,
  "message": "Error description here",
  "code": 400
}


|Status Code|Meaning              |
|-----------|---------------------|
|200        |Success              |
|201        |Created              |
|400        |Bad Request          |
|401        |Unauthorized         |
|404        |Not Found            |
|500        |Internal Server Error|

-----

## Stage 2

### Database Choice: PostgreSQL

*Why PostgreSQL?*

PostgreSQL is chosen because:

- Notifications have structured, relational data (users → notifications)
- ACID compliance ensures no notification is lost or duplicated
- Native support for UUID, JSONB, and indexing
- Scales well with proper indexing and partitioning
- Easy integration with Node.js/TypeScript via pg or prisma

-----

### Database Schema

sql
-- Users table (pre-existing, pre-authorised)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'general',
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast user-based queries
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Index for unread count queries
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);

-- Index for sorting by created_at
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);


-----

### SQL Queries Based on Stage 1 APIs

*1. Get all notifications for a user (paginated):*

sql
SELECT id, title, body, type, is_read, created_at
FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;


*2. Get single notification:*

sql
SELECT * FROM notifications
WHERE id = $1 AND user_id = $2;


*3. Mark notification as read:*

sql
UPDATE notifications
SET is_read = TRUE, updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING id, is_read, updated_at;


*4. Mark all notifications as read:*

sql
UPDATE notifications
SET is_read = TRUE, updated_at = NOW()
WHERE user_id = $1 AND is_read = FALSE;


*5. Delete a notification:*

sql
DELETE FROM notifications
WHERE id = $1 AND user_id = $2;


*6. Get unread count:*

sql
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE user_id = $1 AND is_read = FALSE;


-----

### Scalability Problems and Solutions

|Problem                            |Solution                                                                                      |
|-----------------------------------|----------------------------------------------------------------------------------------------|
|Table grows to millions of rows    |*Table partitioning* by created_at (range partitioning per month)                         |
|Slow unread count queries at scale |*Materialized counter cache* — maintain a notification_counts table updated via triggers  |
|High write volume from many users  |*Connection pooling* via PgBouncer; async writes via a message queue (e.g. Redis + BullMQ)  |
|Real-time delivery bottleneck      |*Horizontal scaling* of WebSocket server with Redis Pub/Sub to broadcast across instances   |
|Old notifications consuming storage|*Archival policy* — move notifications older than 90 days to a notifications_archive table|

-----

### Partitioning Example (for scale)

sql
-- Partition notifications by month
CREATE TABLE notifications (
  id UUID NOT NULL,
  user_id UUID NOT NULL,
  title VARCHAR(255),
  body TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);

CREATE TABLE notifications_2026_06
  PARTITION OF notifications
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');


-----

### Notification Counter Cache (for fast unread count)

sql
CREATE TABLE notification_counts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  unread_count INT DEFAULT 0
);

-- Trigger to auto-update counter
CREATE OR REPLACE FUNCTION update_notification_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notification_counts (user_id, unread_count)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET unread_count = notification_counts.unread_count + 1;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
    UPDATE notification_counts
    SET unread_count = GREATEST(unread_count - 1, 0)
    WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' AND OLD.is_read = FALSE THEN
    UPDATE notification_counts
    SET unread_count = GREATEST(unread_count - 1, 0)
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON notifications
FOR EACH ROW EXECUTE FUNCTION update_notification_count();