# Backend Endpoints Catalog

This catalog was extracted from the backend controllers under `src/Baytology.Api\Controllers` plus their request contracts and FluentValidation rules.

## ملاحظات عامة

- أغلب HTTP endpoints ماشية على base route: `/api/v1/{Controller}`. مثال: `PropertiesController` => `/api/v1/Properties`.
- `IdentityController` له مسارين لكل action: `/api/identity/...` و `/api/v1/identity/...`.
- الـ JSON enums بتتبعت/ترجع كـ strings بسبب `JsonStringEnumConverter`.
- أي endpoint عليه `Authorize` يحتاج JWT Bearer token. لو فيه `Roles = ...` لازم الـ user يكون من الأدوار المذكورة.
- الأخطاء ترجع غالبا `ProblemDetails`، والـ validation errors تتحول لـ `400`، والـ not found لـ `404`، والـ conflict لـ `409`، والـ forbidden لـ `403`.
- في Rate limit عام: 100 request / minute مع queue 10.
- `PaginatedList<T>` بيرجع: `items`, `pageNumber`, `pageSize`, `totalCount`, `totalPages`, `hasPreviousPage`, `hasNextPage`.

## Admin

Base route: `/api/v1/Admin`

كل Admin endpoints تحتاج JWT بدور `Admin`.

| Method | Path | يحتاج | يقدم | شروط / ملاحظات |
|---|---|---|---|---|
| GET | `/users` | Auth Admin | `200 List<UserSummaryDto>`: `userId`, `email`, `roles`, `isActive`, `emailConfirmed` | لا يوجد body. |
| GET | `/agents` | Auth Admin | `200 List<AdminAgentDto>`: بيانات agent/profile/verification/commission | لا يوجد body. |
| PATCH | `/users/{userId}/status` | path `userId`, body `{ isActive }`, Auth Admin | `200 OK` | `userId` مطلوب. يفعل/يعطل الحساب. |
| POST | `/users/{userId}/toggle-status` | نفس السابق | `200 OK` | Legacy hidden route. |
| PATCH | `/users/{userId}/role` | path `userId`, body `{ role }`, Auth Admin | `200 OK` | `role` لازم `Buyer` أو `Agent` أو `Admin`. عند إزالة Agent role لا يسمح لو عنده properties أو bookings نشطة أو conversations. |
| POST | `/users/{userId}/assign-role` | نفس السابق | `200 OK` | Legacy hidden route. |
| PATCH | `/agents/{agentUserId}/verification` | path `agentUserId`, Auth Admin | `200 OK` | المستخدم لازم يكون Agent وله AgentDetails. |
| POST | `/agents/{agentUserId}/verify` | نفس السابق | `200 OK` | Legacy hidden route. |
| PATCH | `/refunds/{refundId}/status` | path `refundId`, body `{ approve }`, Auth Admin | `200 OK` | refund لازم يكون موجود و`Pending`. الموافقة تتطلب payment قابل للـ refund. |
| POST | `/refunds/{refundId}/review` | نفس السابق | `200 OK` | Legacy hidden route. |
| GET | `/audit-logs` | query `pageNumber=1`, `pageSize=10`, Auth Admin | `200 PaginatedList<AuditLogDto>` | `pageNumber > 0`, `pageSize` من 1 لـ 100. |
| GET | `/payments` | pagination query, Auth Admin | `200 PaginatedList<PaymentAdminDto>` | `pageNumber > 0`, `pageSize` من 1 لـ 100. |
| GET | `/refunds` | pagination query, Auth Admin | `200 PaginatedList<RefundRequestAdminDto>` | `pageNumber > 0`, `pageSize` من 1 لـ 100. |
| GET | `/search-requests` | pagination query, Auth Admin | `200 PaginatedList<SearchRequestAdminDto>` | `pageNumber > 0`, `pageSize` من 1 لـ 100. |
| GET | `/recommendation-requests` | pagination query, Auth Admin | `200 PaginatedList<RecommendationRequestAdminDto>` | `pageNumber > 0`, `pageSize` من 1 لـ 100. |
| GET | `/domain-events` | pagination query, Auth Admin | `200 PaginatedList<DomainEventLogDto>` | `pageNumber > 0`, `pageSize` من 1 لـ 100. |

## Agents

Base route: `/api/v1/Agents`

| Method | Path | يحتاج | يقدم | شروط / ملاحظات |
|---|---|---|---|---|
| GET | `/{agentUserId}` | path `agentUserId` | `200 AgentDetailDto` | `agentUserId` لازم يكون user بدور Agent وله AgentDetails. |
| GET | `/me` | JWT بدور `Agent` أو `Admin` | `200 AgentDetailDto` | يقرأ user id من JWT. |
| PUT | `/me` | JWT بدور `Agent` أو `Admin`, body `{ agencyName?, licenseNumber?, commissionRate }` | `200 OK` | `agencyName` max 300، `licenseNumber` max 100، `commissionRate > 0 && < 1`. |

## AiAssistant

Base route: `/api/v1/AiAssistant`

كل endpoints هنا تحتاج JWT. أغلبها proxy لخدمات AI خارجية وترجع نفس payload الراجع من الخدمة.

| Method | Path | يحتاج | يقدم | شروط / ملاحظات |
|---|---|---|---|---|
| GET | `/status` | Auth | `200` JSON فيه `overallStatus`, `chatbot`, `recommendation`, `voiceRecognition`, `imageSearch` | يجمع status من الخدمات الخارجية. |
| POST | `/parse` | Auth, JSON body حر | `200` external chatbot response | يمرر body كما هو للـ chatbot parse API. |
| POST | `/question` | Auth, JSON body حر | `200` external chatbot response | يمرر body كما هو. |
| POST | `/search` | Auth, JSON body حر | `200` external chatbot response | يمرر body كما هو. |
| POST | `/rank` | Auth, JSON body حر | `200` external chatbot response | يمرر body كما هو. |
| POST | `/chat` | Auth, JSON body حر | `200` external chatbot response | يمرر body كما هو. |
| GET | `/recommend/{houseId}` | Auth, path `houseId:int`, query `topN=5` | `200` external recommendation response | `houseId` رقم صحيح. |
| POST | `/voice-chat` | Auth, `multipart/form-data`: `session_id`, `audio` | `200` external voice response | `session_id` مطلوب، `audio` مطلوب وغير فارغ، max 25 MB. |
| POST | `/image-search` | Auth, `multipart/form-data`: `image`, `top_n=10` | `200` external image search response | `image` مطلوب وغير فارغ، max 15 MB. |

## Bookings

Base route: `/api/v1/Bookings`

كل Bookings endpoints تحتاج JWT.

| Method | Path | يحتاج | يقدم | شروط / ملاحظات |
|---|---|---|---|---|
| GET | `/` | Auth, query `pageNumber=1`, `pageSize=10` | `200 PaginatedList<BookingListItemDto>` | يرجع bookings التي يكون المستخدم buyer أو agent فيها. `pageNumber > 0`, `pageSize` من 1 لـ 100. |
| GET | `/{id}` | Auth, path `id:guid` | `200 BookingDto` | المستخدم لازم يكون buyer أو agent الخاص بالحجز. |
| POST | `/` | Auth, body `CreateBookingRequest` | `201 CreateBookingResponse`: `bookingId`, `paymentId`, `redirectUrl` | `propertyId` مطلوب، startDate ليس في الماضي، endDate بعد startDate، amount > 0، commissionRate من 0 إلى أقل من 1، currency مطلوب max 10، payerEmail صحيح، payerName max 200، payerPhone max 50. لا يمكن حجز عقارك، العقار لازم Available، لا يوجد overlap booking، والـ agent profile لازم موجود. يبدأ Paymob payment intention. |
| PATCH | `/{bookingId}/status` | Auth, path `bookingId`, body `{ status }` | `200 OK` | `status` فقط `Confirmed` أو `Cancelled`. فقط agent يقدر يؤكد. buyer أو agent يقدر يلغي pending. لا يمكن إلغاء confirmed من هذا endpoint. التأكيد يحتاج payment completed. |

## Conversations

Base route: `/api/v1/Conversations`

كل Conversations endpoints تحتاج JWT.

| Method | Path | يحتاج | يقدم | شروط / ملاحظات |
|---|---|---|---|---|
| GET | `/` | Auth | `200 List<ConversationDto>` | يرجع conversations الخاصة بالمستخدم الحالي. |
| GET | `/{conversationId}/messages` | Auth, path `conversationId` | `200 List<MessageDto>` | المستخدم لازم يكون participant في conversation. |
| POST | `/` | Auth, body `{ propertyId }` | `200 CreateConversationResponse`: `conversationId` | property لازم موجود. لا يمكن فتح محادثة عن عقارك. agent profile لازم موجود. لو المحادثة موجودة يرجع نفس id. |
| POST | `/{conversationId}/messages` | Auth, body `{ content, attachmentUrl? }` | `200 SendMessageResponse`: `messageId` | conversation موجودة، sender لازم participant. الرسالة لازم تحتوي `content` أو `attachmentUrl`. `content` max 5000، `attachmentUrl` max 1000. |
| PATCH | `/messages/{messageId}/read` | Auth, path `messageId` | `200 OK` | الرسالة لازم تخص conversation يشارك فيها المستخدم. صاحب الرسالة لا يستطيع تعليمها كمقروءة. |

## Identity

Base routes: `/api/identity` and `/api/v1/identity`

| Method | Path | يحتاج | يقدم | شروط / ملاحظات |
|---|---|---|---|---|
| POST | `/register` | body `{ email, password, displayName, role="Buyer" }` | `200 RegisterUserResponse`: `userId` | email مطلوب وصحيح، password min 8، displayName مطلوب max 200، role فقط `Buyer` أو `Agent`. ينشئ profile، ولو Agent ينشئ AgentDetails. |
| POST | `/token/generate` | body `{ email, password }` | `200 TokenResponse`: `accessToken`, `refreshToken`, `expiresOnUtc` | email/password مطلوبين. الحساب لازم موجود، active، غير deleted، email confirmed، وكلمة المرور صحيحة. |
| POST | `/token/refresh` | body `{ refreshToken, expiredAccessToken }` | `200 TokenResponse` | tokenين مطلوبين. expired access token لازم صالح كـ principal، refresh token لازم يخص نفس user وغير منتهي. |
| GET | `/me` | JWT | `200 AppUserDto`: `userId`, `email`, `roles`, `claims`, `displayName` | user id من JWT لازم موجود ومستخدم حقيقي. |
| POST | `/external-login` | body `{ provider, idToken }` | `200 ExternalLoginResponse`: `tokens`, `isNewUser`, `userId` | provider لازم `Google` أو `Facebook`، idToken مطلوب وصالح. المستخدم الجديد يأخذ Buyer role افتراضيا. |
| POST | `/change-password` | JWT, body `{ currentPassword, newPassword }` | `200 OK` | currentPassword مطلوب. newPassword min 8 وبها uppercase/lowercase/digit/special. |
| POST | `/forgot-password` | body `{ email }` | `200 OK` | email مطلوب وصحيح. لا يكشف إن كان المستخدم غير موجود/غير confirmed. |
| POST | `/reset-password` | body `{ email, token, newPassword }` | `200 OK` | email صحيح، token مطلوب Base64Url، newPassword بنفس قواعد القوة. |
| POST | `/confirm-email` | body `{ userId, token }` | `200 OK` | userId/token مطلوبان، token Base64Url صالح. |
| POST | `/resend-confirmation` | body `{ email }` | `200 OK` | email مطلوب وصحيح. لو email confirmed يرجع conflict. |
| POST | `/logout` | JWT | `200 OK` | يلغي refresh tokens للمستخدم الحالي. |
| DELETE | `/account` | JWT | `200 OK` | soft delete: يلغي refresh tokens ويقفل الحساب. |

## Internal AI Worker

Base route: `/api/internal/ai`

هذه endpoints hidden من Swagger وتستخدم service-token header. اسم الهيدر الافتراضي `X-AI-Service-Token` أو القيمة من `AiWorker:ServiceTokenHeaderName`.

| Method | Path | يحتاج | يقدم | شروط / ملاحظات |
|---|---|---|---|---|
| POST | `/property-mappings/lookup` | service token, body `{ items: [{ sourceListingUrl?, title?, price?, city?, district?, propertyType?, area?, bedrooms? }] }` | `200 LookupPropertyMappingsResponse`: `results` | لو token ناقص/خطأ => `401`. عند application error يرجع `500`. |
| POST | `/search/{id}/resolve` | service token, path `id`, body `{ isSuccessful, results? }` | `200 OK` | لو `isSuccessful=true` لازم `results` ليست null. كل result يحتاج `propertyId`, `rank>0`, `relevanceScore>=0`, limits على snapshot fields. لو request already completed فالعملية idempotent. |
| POST | `/recommendations/{id}/resolve` | service token, path `id`, body `{ isSuccessful, results? }` | `200 OK` | لو `isSuccessful=true` لازم `results` ليست null. كل result يحتاج `rank>0`, `similarityScore>=0`, وإما `recommendedPropertyId` أو `externalReference`. |

## Notifications

Base route: `/api/v1/Notifications`

كل Notifications endpoints تحتاج JWT.

| Method | Path | يحتاج | يقدم | شروط / ملاحظات |
|---|---|---|---|---|
| GET | `/` | Auth, query `unreadOnly` | `200 List<NotificationDto>` | يرجع إشعارات المستخدم الحالي، ويمكن فلترة unread فقط. |
| PATCH | `/{id}/read` | Auth, path `id` | `200 OK` | notification لازم تكون مملوكة للمستخدم الحالي. العملية idempotent لو مقروءة بالفعل. |

## Payments

Base route: `/api/v1/Payments`

| Method | Path | يحتاج | يقدم | شروط / ملاحظات |
|---|---|---|---|---|
| GET | `/dev/checkout` | query `paymentId`, optional `status` | HTML page أو `200` بعد simulation | Hidden route. يعمل فقط في Development ومع `Paymob:EnableLocalSimulation=true`. `status` إما `success` أو `failed`. |
| POST | `/webhook` | Paymob token في header `X-Webhook-Token` أو query `token`, raw Paymob JSON | `200 OK` | لا يحتاج JWT. `Paymob:WebhookToken` لازم configured. payload لازم parse كـ PaymobWebhookRequest ويحتوي payment id أو gateway reference. |
| POST | `/refunds` | JWT, body `{ paymentId, reason, amount }` | `200 RequestRefundResponse`: `refundId` | payment لازم مملوك للمستخدم الحالي ومكتمل. reason مطلوب max 2000، amount > 0، ولازم يساوي كامل قيمة payment حاليا، ولا يوجد pending refund لنفس payment. |

## Properties

Base route: `/api/v1/Properties`

| Method | Path | يحتاج | يقدم | شروط / ملاحظات |
|---|---|---|---|---|
| GET | `/` | query filters: `city`, `district`, `propertyType`, `listingType`, `minPrice`, `maxPrice`, `minArea`, `maxArea`, `minBedrooms`, `maxBedrooms`, `agentUserId`, `pageNumber=1`, `pageSize=10` | `200 PaginatedList<PropertyListItemDto>` | `pageNumber > 0`, `pageSize` من 1 لـ 100، min لا يتجاوز max، القيم الرقمية غير سالبة، `propertyType` و`listingType` valid enums. |
| GET | `/{id}` | path `id:guid` | `200 PropertyDto` | property لازم موجود. |
| GET | `/saved` | JWT, pagination query | `200 PaginatedList<PropertyListItemDto>` | يرجع saved properties للمستخدم الحالي. `pageNumber > 0`, `pageSize` من 1 لـ 100. |
| POST | `/` | JWT بدور `Agent`, body `CreatePropertyRequest` | `201 CreatePropertyResponse`: `id` | Agent user id من JWT. `title` مطلوب max 500، `price>0`, `area>0`, bedrooms/bathrooms >=0، floor >=0، totalFloors >0، floor <= totalFloors، imageUrls كل عنصر max 1000. |
| PUT | `/{id}` | JWT بدور `Agent`, path `id`, body `UpdatePropertyRequest` | `200 OK` | نفس قواعد create، والـ property لازم مملوكة للـ agent الحالي. |
| DELETE | `/{id}` | JWT بدور `Agent`, path `id` | `200 OK` | property لازم مملوكة للـ agent. لا يسمح بالحذف لو لها bookings أو payments أو conversations أو reviews. |
| POST | `/{id}/images` | JWT بدور `Agent`, body `{ imageUrls }` | `200 OK` | property مملوكة للـ agent. `imageUrls` غير فارغة، كل URL مطلوب max 1000. أول صورة تصبح primary لو لا توجد صور سابقة. |
| POST | `/{id}/save` | JWT, path `id` | `200 SavePropertyResponse`: `savedId` | property لازم موجود. لو saved قبل كده يرجع `409`. |
| GET | `/{id}/save` | JWT, path `id` | `200 bool` | property لازم موجود. يرجع هل العقار saved للمستخدم الحالي. |
| DELETE | `/{id}/save` | JWT, path `id` | `200 OK` | لو العقار غير saved يرجع `404`. |
| POST | `/{id}/view` | optional JWT, path `id` | `200 RecordPropertyViewResponse`: `viewId` | property لازم موجود. يسجل user id لو موجود في JWT، ويسجل IP. |
| POST | `/reviews` | JWT, body `{ agentUserId, propertyId?, rating, comment? }` | `200 CreateAgentReviewResponse`: `reviewId` | `rating` من 1 لـ 5، `comment` max 2000. لو propertyId موجود لازم العقار يخص agent المحدد. المستخدم لازم عنده confirmed booking مع نفس agent/property. لا يسمح بتكرار review لنفس agent/property. |

## Recommendations

Base route: `/api/v1/Recommendations`

كل Recommendations endpoints تحتاج JWT. Resolve يحتاج Admin.

| Method | Path | يحتاج | يقدم | شروط / ملاحظات |
|---|---|---|---|---|
| GET | `/{id}` | JWT, path `id` | `200 RecommendationRequestDto` | request لازم موجود ومملوك للمستخدم الحالي. |
| POST | `/` | JWT, body `{ sourceEntityType, sourceEntityId?, topN=10 }` | `202 CreateRecommendationRequestResponse`: `requestId` | `sourceEntityType` مطلوب max 50، `sourceEntityId` max 200، `topN` من 1 لـ 50. |
| POST | `/{id}/resolve` | JWT بدور `Admin`, body `{ isSuccessful, results? }` | `200 OK` | نفس قواعد internal resolve. completed request يعتبر success بدون تعديل. |

## Search

Base route: `/api/v1/Search`

كل Search endpoints تحتاج JWT. Resolve يحتاج Admin.

| Method | Path | يحتاج | يقدم | شروط / ملاحظات |
|---|---|---|---|---|
| GET | `/{id}` | JWT, path `id` | `200 SearchRequestDto` | request لازم موجود ومملوك للمستخدم الحالي. |
| POST | `/` | JWT, body `CreateSearchRequest` | `202 CreateSearchRequestResponse`: `searchRequestId` | `inputType`: `Text/Voice/Image`, `searchEngine`: `Elastic/FAISS/Hybrid`. `rawQuery` max 2000 ومطلوب مع Text، `audioFileUrl` max 1000 ومطلوب مع Voice، `imageFileUrl` max 1000 ومطلوب مع Image. city/district max 100، propertyType max 30، listingType max 20، min/max غير سالبة وmin لا يتجاوز max. |
| POST | `/{id}/resolve` | JWT بدور `Admin`, body `{ isSuccessful, results? }` | `200 OK` | نفس قواعد internal search resolve. completed request يعتبر success بدون تعديل. |

## UserProfiles

Base route: `/api/v1/UserProfiles`

كل UserProfiles endpoints تحتاج JWT.

| Method | Path | يحتاج | يقدم | شروط / ملاحظات |
|---|---|---|---|---|
| GET | `/{userId}` | JWT, path `userId` | `200 UserProfileDto` | `userId` مطلوب، profile لازم موجود. |
| GET | `/me` | JWT | `200 UserProfileDto` | يقرأ user id من JWT. |
| POST | `/` | JWT, body `{ displayName, avatarUrl?, bio?, phoneNumber?, preferredContactMethod=Email }` | `201 CreateUserProfileResponse`: `profileId` | user id من JWT. `displayName` مطلوب max 200، `avatarUrl` max 500، `bio` max 2000، `phoneNumber` max 20. لو profile موجود يرجع conflict. |
| PUT | `/me` | JWT, body `{ displayName, avatarUrl?, bio?, phoneNumber?, preferredContactMethod=Email }` | `200 OK` | نفس validation. profile لازم موجود. |

## SignalR Hubs

These are not HTTP REST endpoints, but they are backend endpoints mapped in `Program.cs`.

| Hub | Path | يحتاج | يقدم / Methods | شروط |
|---|---|---|---|---|
| NotificationHub | `/hubs/notifications` | JWT | realtime notifications | الاتصال يحتاج Auth. |
| ChatHub | `/hubs/chat` | JWT | `JoinConversation(conversationId)`, `LeaveConversation(conversationId)`, `SendMessage(conversationId, content, attachmentUrl?)` | `conversationId` لازم Guid. `JoinConversation` و`SendMessage` يتأكدوا إن المستخدم participant. `SendMessage` يرجع `Guid messageId`. |

## Enums المهمة

- `BookingStatus`: `Pending`, `Confirmed`, `Cancelled`
- `ContactMethod`: `Email`, `Phone`, `WhatsApp`
- `FurnishingStatus`: `Unfurnished`, `SemiFurnished`, `FullyFurnished`
- `ListingType`: `Sale`, `Rent`
- `PropertyType`: `Apartment`, `Villa`, `Office`, `Land`
- `SearchEngine`: `Elastic`, `FAISS`, `Hybrid`
- `SearchInputType`: `Text`, `Voice`, `Image`
- `ViewType`: `Sea`, `Garden`, `Street`, `City`
