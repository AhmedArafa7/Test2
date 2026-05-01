# Baytology Frontend Handoff

This document is the frontend handoff for the current backend and AI integration.

It is written from the code that exists now in:

- `src/Baytology.Api`
- `src/Baytology.Application`
- `src/Baytology.Contracts`
- `Baytology-chatbot-system`

Use this document as the product and integration blueprint for the frontend.

## 1. System Map

The system has 3 layers the frontend cares about:

1. `ASP.NET API`
   - Main gateway for auth, properties, profiles, bookings, payments, conversations, notifications, admin, AI search, AI recommendations, and AI assistant proxy routes.
2. `SignalR`
   - Real-time chat and notifications.
3. `Python AI services`
   - Not called directly by the frontend in the normal production architecture.
   - The frontend should call the ASP.NET backend, and the backend will proxy or queue AI work.

The frontend should treat the backend as the single public integration point.

## 2. Source Of Truth

The frontend team should use the following order of truth:

1. `Development OpenAPI`
   - `GET /openapi/v1.json`
   - Available in Development only.
2. Backend controllers in `src/Baytology.Api/Controllers`
3. DTOs used by controllers in `src/Baytology.Application/Features/.../Dtos`
4. Request records in `src/Baytology.Contracts/Requests`

Important: some controllers return `Application DTOs` directly, not the `Contracts/Responses` records. The real response shapes are the DTOs used in controller signatures.

## 3. Local Base URLs

Default local backend URLs from `launchSettings.json`:

- `https://localhost:7053`
- `http://localhost:5053`

Recommended frontend env variables:

```env
VITE_API_BASE_URL=http://localhost:5053
VITE_SIGNALR_BASE_URL=http://localhost:5053
```

If the frontend runs on another port or domain, it must be added to `AppSettings:AllowedOrigins`.

## 4. Global API Rules

### Authentication

- Auth is JWT Bearer.
- Send `Authorization: Bearer <accessToken>` on protected HTTP requests.
- Refresh flow exists and should be implemented in the frontend.

### API versioning

- Prefer versioned routes: `/api/v1/...`
- `IdentityController` also exposes unversioned `/api/identity/...`, but the frontend should stay on `/api/v1/...` where possible for consistency.

### JSON conventions

- Enums are serialized as strings, not numeric values.
- Use values like `"Apartment"`, `"Sale"`, `"Hybrid"`, `"Voice"`, `"Confirmed"`.
- Null values are omitted from JSON responses in many cases.
- All dates are `DateTimeOffset` and should be treated as ISO date strings.

### Errors

The backend returns standard `ProblemDetails`.

Typical fields:

```json
{
  "type": "about:blank",
  "title": "Some.Error.Code",
  "status": 400,
  "detail": "Human-readable message",
  "instance": "POST /api/v1/Properties",
  "requestId": "..."
}
```

Frontend rule:

- Always show `detail` first if present.
- Use `title` as a stable machine-friendly error code.
- Keep `requestId` for support/debug screens.

### Pagination

Paginated endpoints return this shape:

```json
{
  "items": [],
  "pageNumber": 1,
  "pageSize": 10,
  "totalCount": 100,
  "totalPages": 10,
  "hasPreviousPage": false,
  "hasNextPage": true
}
```

Use a shared frontend type for this.

## 5. Roles And Route Guards

Current roles:

- `Buyer`
- `Agent`
- `Admin`
- `Renter`

Practical frontend guards:

- Public pages:
  - property browsing
  - property details
  - public agent details
  - login / register / forgot password / reset password / confirm email
- Authenticated user:
  - profile
  - saved properties
  - AI assistant
  - AI search
  - recommendations
  - conversations
  - notifications
  - bookings
- Agent only:
  - create property
  - update property
  - delete property
  - add property images
  - update agent details
  - confirm/cancel booking as assigned agent
- Admin only:
  - admin dashboard
  - users
  - agents verification
  - payments
  - refunds
  - audit logs
  - AI operations monitoring

Do not rely only on client route guards. The backend remains the final authority.

## 6. Core Frontend Modules

Recommended frontend module split:

1. `auth`
2. `properties`
3. `agents`
4. `user-profile`
5. `saved-properties`
6. `bookings-payments`
7. `conversations`
8. `notifications`
9. `ai-assistant`
10. `ai-search`
11. `recommendations`
12. `admin`
13. `shared-api`
14. `shared-realtime`

## 7. Auth Module

Controller: `IdentityController`

Main routes:

- `POST /api/v1/identity/register`
- `POST /api/v1/identity/token/generate`
- `POST /api/v1/identity/token/refresh`
- `GET /api/v1/identity/me`
- `POST /api/v1/identity/external-login`
- `POST /api/v1/identity/change-password`
- `POST /api/v1/identity/forgot-password`
- `POST /api/v1/identity/reset-password`
- `POST /api/v1/identity/confirm-email`
- `POST /api/v1/identity/resend-confirmation`
- `POST /api/v1/identity/logout`
- `DELETE /api/v1/identity/account`

Key request shapes:

```json
{
  "email": "user@example.com",
  "password": "StrongPass1!",
  "displayName": "Ahmed",
  "role": "Buyer"
}
```

```json
{
  "email": "user@example.com",
  "password": "StrongPass1!"
}
```

```json
{
  "refreshToken": "<refresh-token>",
  "expiredAccessToken": "<expired-access-token>"
}
```

Token response:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresOnUtc": "2026-04-03T10:00:00+00:00"
}
```

Frontend auth behavior:

- Store `accessToken`, `refreshToken`, `expiresOnUtc`.
- Add automatic refresh on 401 or shortly before expiry.
- After login, immediately call `GET /identity/me`.
- Use the `roles` array from `/identity/me` for route guards.

External login:

- Supported providers now: `Google`, `Facebook`
- Request body:

```json
{
  "provider": "Google",
  "idToken": "<provider-token>"
}
```

Important note:

- `GET /identity/me` returns `AppUserDto`, and `claims` are raw claim objects.
- Use `roles` as the main frontend authorization input.

## 8. Property Browsing And Property Details

Controller: `PropertiesController`

Main routes:

- `GET /api/v1/Properties`
- `GET /api/v1/Properties/{id}`
- `GET /api/v1/Properties/saved`
- `POST /api/v1/Properties/{id}/save`
- `POST /api/v1/Properties/{id}/view`
- `POST /api/v1/Properties/reviews`

Agent-only property management:

- `POST /api/v1/Properties`
- `PUT /api/v1/Properties/{id}`
- `DELETE /api/v1/Properties/{id}`
- `POST /api/v1/Properties/{id}/images`

Property filters:

- `city`
- `district`
- `propertyType`
- `listingType`
- `minPrice`
- `maxPrice`
- `minArea`
- `maxArea`
- `minBedrooms`
- `maxBedrooms`
- `pageNumber`
- `pageSize`

Enum values used here:

- `PropertyType`: `Apartment`, `Villa`, `Office`, `Land`
- `ListingType`: `Sale`, `Rent`
- `FurnishingStatus`: read from contract enum
- `ViewType`: read from contract enum

Create property request:

```json
{
  "title": "Modern apartment in New Cairo",
  "description": "Near services",
  "propertyType": "Apartment",
  "listingType": "Sale",
  "price": 3200000,
  "area": 165,
  "bedrooms": 3,
  "bathrooms": 2,
  "floor": 5,
  "totalFloors": 10,
  "addressLine": "Street 90",
  "city": "Cairo",
  "district": "New Cairo",
  "zipCode": "11835",
  "latitude": 30.01,
  "longitude": 31.49,
  "hasParking": true,
  "hasPool": false,
  "hasGym": true,
  "hasElevator": true,
  "hasSecurity": true,
  "hasBalcony": true,
  "hasGarden": false,
  "hasCentralAC": true,
  "furnishingStatus": "SemiFurnished",
  "viewType": "Street",
  "imageUrls": ["https://..."]
}
```

Property detail response includes:

- core listing data
- images
- amenity object
- embedded agent summary

Frontend pages to build:

- public property listing page
- property filters sidebar
- property detail page
- saved properties page
- create/edit property form for agents
- add images UI for agents
- property review submission form

Important limitations:

- There is no backend binary upload endpoint.
- The frontend must upload images elsewhere and send `imageUrls`.
- There is no dedicated `my properties` endpoint for agents right now.
- There is a create review endpoint, but there is no public endpoint to fetch a review list.
- Agent rating and review count are available in property/agent summaries.

## 9. Agent Module

Controller: `AgentsController`

Routes:

- `GET /api/v1/Agents/{agentUserId}`
- `GET /api/v1/Agents/me`
- `PUT /api/v1/Agents/me`

Use this for:

- public agent profile page
- current agent dashboard/profile settings

Agent detail includes:

- agency name
- license number
- rating
- review count
- verification state
- commission rate

## 10. User Profile Module

Controller: `UserProfilesController`

Routes:

- `GET /api/v1/UserProfiles/{userId}`
- `GET /api/v1/UserProfiles/me`
- `POST /api/v1/UserProfiles`
- `PUT /api/v1/UserProfiles/me`

Fields:

- `displayName`
- `avatarUrl`
- `bio`
- `phoneNumber`
- `preferredContactMethod`

Important note:

- Registration already creates an initial profile path on the backend.
- The frontend should still support profile edit/update.

## 11. Bookings And Payments

Controller: `BookingsController`

Routes:

- `GET /api/v1/Bookings`
- `GET /api/v1/Bookings/{id}`
- `POST /api/v1/Bookings`
- `PATCH /api/v1/Bookings/{bookingId}/status`

Booking statuses:

- `Pending`
- `Confirmed`
- `Cancelled`

Create booking response:

```json
{
  "bookingId": "...",
  "paymentId": "...",
  "redirectUrl": "https://..."
}
```

Frontend payment behavior:

1. Buyer creates booking.
2. Backend creates booking + payment in escrow.
3. Backend returns `redirectUrl`.
4. Frontend redirects the user to the payment URL if it exists.
5. After payment completion, frontend should refresh bookings and notifications.

Important payment notes:

- In development, `redirectUrl` may point to local simulated checkout.
- In production, `redirectUrl` points to Paymob checkout.
- The frontend should never hardcode the payment provider URL.
- Use the returned `redirectUrl` only.
- There is no public `GET /payments/{id}` endpoint now.
- The frontend should reflect payment outcome through bookings, notifications, and admin monitoring screens.

Agent booking behavior:

- Only the assigned agent can update booking status.
- Agent can confirm or cancel.

## 12. Conversations Module

Controller: `ConversationsController`

Routes:

- `GET /api/v1/Conversations`
- `GET /api/v1/Conversations/{conversationId}/messages`
- `POST /api/v1/Conversations`
- `POST /api/v1/Conversations/{conversationId}/messages`
- `PATCH /api/v1/Conversations/messages/{messageId}/read`

Conversation flow:

1. Buyer opens a property and starts conversation.
2. Backend creates one conversation between buyer and that property's agent.
3. Both participants can list conversations and messages.
4. Both REST and SignalR can send messages.

Important notes:

- Conversation creation can return `409 Conflict` if it already exists.
- Frontend strategy on 409:
  - refresh conversation list
  - locate existing conversation for that property
- There is no separate unread-count endpoint.
- Build unread badges from message data and notifications.

## 13. Notifications Module

Controller: `NotificationsController`

Routes:

- `GET /api/v1/Notifications?unreadOnly=true|false`
- `PATCH /api/v1/Notifications/{id}/read`

Notification types currently include:

- `NewMessage`
- `PaymentUpdate`
- `PropertyMatch`

Frontend behavior:

- keep notification center
- unread badge
- click by `referenceType` and `referenceId`

## 14. Real-Time Integration

SignalR hubs:

- `/hubs/notifications`
- `/hubs/chat`

Authentication for hubs:

- JWT is passed using the query string `access_token`
- The backend explicitly supports this for hub paths

JavaScript connection example:

```ts
const connection = new signalR.HubConnectionBuilder()
  .withUrl(`${SIGNALR_BASE_URL}/hubs/chat`, {
    accessTokenFactory: () => authStore.accessToken ?? "",
  })
  .withAutomaticReconnect()
  .build();
```

Chat hub methods:

- `JoinConversation(conversationId: string)`
- `LeaveConversation(conversationId: string)`
- `SendMessage(conversationId: string, content: string, attachmentUrl?: string)`

Chat hub event:

- `ReceiveMessage`

Payload:

```json
{
  "messageId": "...",
  "conversationId": "...",
  "senderId": "...",
  "content": "Hello",
  "attachmentUrl": null,
  "sentAt": "2026-04-03T10:00:00+00:00"
}
```

Notification hub event:

- `ReceiveNotification`

Payload:

```json
{
  "id": "...",
  "type": "NewMessage",
  "title": "New message",
  "body": "You received a new message.",
  "referenceId": "...",
  "createdOnUtc": "2026-04-03T10:00:00+00:00"
}
```

Recommendation for frontend:

- use SignalR for live UX
- still refetch REST data on reconnect or screen enter

## 15. AI Assistant Module

Controller: `AiAssistantController`

Routes:

- `GET /api/v1/AiAssistant/status`
- `POST /api/v1/AiAssistant/parse`
- `POST /api/v1/AiAssistant/question`
- `POST /api/v1/AiAssistant/search`
- `POST /api/v1/AiAssistant/rank`
- `POST /api/v1/AiAssistant/chat`
- `POST /api/v1/AiAssistant/voice-chat`
- `POST /api/v1/AiAssistant/image-search`
- `GET /api/v1/AiAssistant/recommend/{houseId}?topN=5`

These routes are authenticated backend proxies to Python services.

Frontend rule:

- Call the ASP.NET backend only.
- Do not call the FastAPI service directly in the normal app architecture.

Current FastAPI request shapes behind the proxy:

`POST /AiAssistant/parse`

```json
{
  "text": "عايز شقة في التجمع",
  "session_id": "frontend-session-id"
}
```

`POST /AiAssistant/question`

```json
{
  "session_id": "frontend-session-id",
  "properties_count": 25,
  "current_filters": {},
  "skipped_attributes": []
}
```

`POST /AiAssistant/search`

```json
{
  "filters": {}
}
```

`POST /AiAssistant/rank`

```json
{
  "properties": []
}
```

`POST /AiAssistant/chat`

```json
{
  "session_id": "frontend-session-id",
  "message": "عايز شقة في الشيخ زايد"
}
```

`POST /AiAssistant/voice-chat`

Send `multipart/form-data`:

| Field | Type | Notes |
|---|---|---|
| `session_id` | text | Stable frontend chat session id |
| `audio` | file | Browser-recorded audio such as `audio/webm`, `audio/wav`, `audio/mpeg`, or `audio/ogg` |

Response shape follows `/chat` and adds:

```json
{
  "transcription": "recognized text",
  "type": "results",
  "message": "Proxy voice response",
  "question": null,
  "attribute": null,
  "properties": [],
  "properties_count": 0
}
```

`POST /AiAssistant/image-search`

Send `multipart/form-data`:

| Field | Type | Notes |
|---|---|---|
| `image` | file | Property/reference image such as `image/jpeg`, `image/png`, or `image/webp` |
| `top_n` | number | Optional, clamped to 1-50; default is 10 |

Response:

```json
{
  "count": 1,
  "properties": [],
  "message": "Found 1 visually similar properties.",
  "engine": "visual_similarity_v1",
  "query_image": {
    "content_type": "image/jpeg",
    "size_bytes": 12345
  }
}
```

Recommendation:

- Build the main chatbot UI around `/AiAssistant/chat`
- For microphone input, post browser audio to `/AiAssistant/voice-chat`; do not call the Python `/voice-chat` endpoint directly.
- For image search, post browser image files to `/AiAssistant/image-search`; do not call the Python `/image-search` endpoint directly.
- Keep `session_id` stable per chat session
- Use `/status` for health display or silent monitoring

## 16. AI Search Module

Controller: `SearchController`

Routes:

- `POST /api/v1/Search`
- `GET /api/v1/Search/{id}`

This is the persisted asynchronous AI search flow.

Request shape:

```json
{
  "inputType": "Text",
  "searchEngine": "Hybrid",
  "rawQuery": "عايز شقة في التجمع بحد أقصى 3 مليون",
  "audioFileUrl": null,
  "imageFileUrl": null,
  "city": "Cairo",
  "district": "New Cairo",
  "propertyType": "Apartment",
  "listingType": "Sale",
  "minPrice": 2000000,
  "maxPrice": 3000000,
  "minArea": 120,
  "maxArea": 220,
  "minBedrooms": 2,
  "maxBedrooms": 4
}
```

Enums:

- `SearchInputType`: `Text`, `Voice`, `Image`
- `SearchEngine`: `Elastic`, `FAISS`, `Hybrid`

Flow:

1. Frontend submits search request.
2. Backend returns `202 Accepted` with `searchRequestId`.
3. Frontend polls `GET /api/v1/Search/{id}`.
4. Status becomes:
   - `Pending`
   - `Completed`
   - `Failed`
5. Results include ranked property snapshots.

Important voice/image note:

- Voice and image search use the same endpoint.
- The request expects `audioFileUrl` or `imageFileUrl`, not file upload bytes.
- The frontend must upload media to storage first, then pass a public or backend-accessible URL.

## 17. Recommendations Module

Controller: `RecommendationsController`

Routes:

- `POST /api/v1/Recommendations`
- `GET /api/v1/Recommendations/{id}`

Request:

```json
{
  "sourceEntityType": "Property",
  "sourceEntityId": "<property-id>",
  "topN": 10
}
```

Flow is the same pattern as AI search:

1. create request
2. get request id
3. poll until `Completed` or `Failed`

Current response carries:

- request status
- `topN`
- ranked results
- optional `recommendedPropertyId`
- optional external reference

Frontend use cases:

- related properties section
- "you may also like" carousel
- recommendation history screen if desired

## 18. Admin Module

Controller: `AdminController`

Routes:

- `GET /api/v1/Admin/users`
- `GET /api/v1/Admin/agents`
- `PATCH /api/v1/Admin/users/{userId}/status`
- `PATCH /api/v1/Admin/users/{userId}/role`
- `PATCH /api/v1/Admin/agents/{agentUserId}/verification`
- `GET /api/v1/Admin/payments`
- `GET /api/v1/Admin/refunds`
- `PATCH /api/v1/Admin/refunds/{refundId}/status`
- `GET /api/v1/Admin/audit-logs`
- `GET /api/v1/Admin/search-requests`
- `GET /api/v1/Admin/recommendation-requests`
- `GET /api/v1/Admin/domain-events`

Recommended admin pages:

- users management
- agents verification
- payments monitoring
- refunds review
- AI operations dashboard
- audit logs
- outbox/domain events monitoring

Important admin note:

- Some legacy admin routes also exist as hidden POST endpoints.
- Frontend should use the PATCH routes only.

## 19. What The Frontend Must Not Assume

Do not assume any of the following exist unless added later:

- binary file upload endpoint
- direct avatar upload endpoint
- direct payment status query endpoint
- review listing endpoint
- dedicated agent-owned-properties listing endpoint
- direct frontend access to internal AI worker endpoints

Private/internal endpoints that frontend must never call:

- `/api/internal/ai/...`

## 20. Recommended Frontend Build Order

Build in this order:

1. shared API client
2. auth and token refresh
3. property listing and property details
4. user profile and agent profile
5. saved properties
6. bookings and payment redirect
7. conversations + SignalR chat
8. notifications + SignalR notifications
9. AI assistant chat
10. async AI search
11. async recommendations
12. admin dashboard

## 21. Recommended Shared Frontend Types

At minimum, create shared frontend types for:

- `ProblemDetails`
- `PaginatedList<T>`
- `TokenResponse`
- `CurrentUser`
- `PropertyListItem`
- `Property`
- `AgentDetail`
- `UserProfile`
- `Booking`
- `Conversation`
- `Message`
- `Notification`
- `SearchRequest`
- `SearchResult`
- `RecommendationRequest`
- `RecommendationResult`

## 22. Recommended Frontend Architecture Rules

These rules will keep the frontend compatible and maintainable:

1. Use one HTTP client wrapper for all authenticated requests.
2. Centralize token refresh logic.
3. Centralize enum values and do not duplicate magic strings everywhere.
4. Treat backend as source of truth for permissions and status transitions.
5. Use a polling helper for async search and recommendations.
6. Use a single SignalR wrapper with reconnect handling.
7. Model optional backend fields as optional in frontend types.
8. Keep media upload separate from API submission because the backend expects URLs.
9. Do not couple the frontend directly to Python service URLs.
10. Generate or validate API types from `/openapi/v1.json` whenever possible.

## 23. Final Practical Advice To The Frontend Developer

If you want the frontend to integrate correctly from the first iteration:

- build against `/api/v1`
- use backend Swagger/OpenAPI in Development
- send enum values as strings
- implement JWT refresh from day one
- use the backend for all AI interaction
- poll async AI request endpoints
- connect SignalR with `access_token`
- do not build screens that depend on upload APIs or review-list APIs that do not exist yet

If the frontend follows this document, it will be aligned with the current backend and AI architecture without relying on assumptions.
