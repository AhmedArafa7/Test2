# 🏠 Baytology — Real Estate Platform Backend

A production-grade backend for an AI-powered real estate platform built with **.NET 10**, following **Clean Architecture**, **CQRS**, and **Domain-Driven Design** principles.

---

## 📐 Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Baytology.Api                              │
│              Controllers · Middleware · Swagger/OpenAPI              │
├──────────────────────────────────────────────────────────────────────┤
│                       Baytology.Contracts                            │
│                 Request/Response DTOs · API Contracts                │
├──────────────────────────────────────────────────────────────────────┤
│                       Baytology.Application                          │
│         CQRS Commands/Queries · MediatR Behaviors · Interfaces      │
├──────────────────────────────────────────────────────────────────────┤
│                       Baytology.Infrastructure                       │
│    EF Core · Identity · RabbitMQ · Paymob · SignalR · AI Fallback   │
├──────────────────────────────────────────────────────────────────────┤
│                         Baytology.Domain                             │
│         Entities · Value Objects · Domain Events · Result Pattern     │
└──────────────────────────────────────────────────────────────────────┘
```

**Dependency Rule**: Dependencies point inward. `Baytology.Domain` has zero project references, `Baytology.Application` depends on `Baytology.Domain`, `Baytology.Infrastructure` depends on `Baytology.Application` and `Baytology.Domain`, and `Baytology.Api` acts as the composition root over `Contracts`, `Application`, and `Infrastructure`.

---

## 🚀 Tech Stack

| Category | Technology |
|---|---|
| **Runtime** | .NET 10 |
| **API** | ASP.NET Core Web API, API Versioning, OpenAPI/Swagger |
| **ORM** | Entity Framework Core 10 (SQL Server) |
| **Authentication** | ASP.NET Identity + JWT Bearer + Refresh Tokens |
| **Messaging** | RabbitMQ (via `RabbitMQ.Client`) |
| **Real-time** | SignalR (Notifications Hub + Chat Hub) |
| **Payments** | Paymob Gateway + Local Simulation Mode |
| **Caching** | HybridCache (in-memory + distributed) |
| **Logging** | Serilog (Console + File sinks) |
| **Testing** | xUnit + EF Core InMemory + WebApplicationFactory |
| **Resilience** | Microsoft.Extensions.Http.Resilience |

---

## 🧩 Engineering Patterns

| # | Pattern | Where |
|---|---|---|
| 1 | Clean Architecture | Project structure |
| 2 | CQRS | Commands/Queries via MediatR |
| 3 | Domain-Driven Design | Entities, Value Objects, Domain Events |
| 4 | Result Pattern | `Result<T>` instead of exceptions for flow control |
| 5 | Outbox Pattern | `DomainEventLog` table + `OutboxProcessor` |
| 6 | Repository (via DbContext) | `IAppDbContext` abstraction |
| 7 | Pipeline Behaviors | Validation, Caching, Cache Invalidation, Logging, Performance |
| 8 | Factory Method | `Payment.Create()`, `Booking.Create()`, `AgentDetail.Create()` |
| 9 | Saga (Choreography) | Domain Events → Event Handlers → Commands |
| 10 | Strategy Pattern | `IAiDispatchPolicy` + `IAiSearchFallbackService` |
| 11 | Proxy Pattern | `AiAssistantController` proxies external AI APIs |
| 12 | Interceptor Pattern | `AuditInterceptor`, `DomainEventInterceptor` |
| 13 | Background Service | `OutboxProcessor`, `AiFallbackRecoveryProcessor` |
| 14 | Global Exception Handling | `GlobalExceptionHandler` (env-aware) |

---

## 📁 Project Structure

```
src/
├── Baytology.Domain/           # Entities, Events, Errors, Enums
│   ├── AISearch/               # SearchRequest, TextSearch, VoiceSearch, ImageSearch
│   ├── Recommendations/        # RecommendationRequest, RecommendationResult
│   ├── Properties/             # Property, PropertyImage, PropertyAmenity, AgentReview
│   ├── Bookings/               # Booking entity
│   ├── Payments/               # Payment, PaymentTransaction, RefundRequest
│   ├── Conversations/          # Conversation, Message
│   ├── Notifications/          # Notification entity
│   ├── Identity/               # RefreshToken entity
│   ├── UserProfiles/           # UserProfile entity
│   ├── AgentDetails/           # AgentDetail entity
│   ├── AuditLogs/              # AuditLog entity
│   ├── DomainEvents/           # DomainEventLog (Outbox)
│   └── Common/                 # Entity, AuditableEntity, DomainEvent, Result<T>
│
├── Baytology.Application/      # Business Logic (CQRS)
│   ├── Features/
│   │   ├── AISearch/           # Commands, Queries, EventHandlers, DTOs
│   │   ├── Recommendations/    # Commands, Queries, EventHandlers, DTOs
│   │   ├── Properties/         # CRUD + Search + Save + Views
│   │   ├── Bookings/           # Create, Confirm, Cancel, GetMyBookings
│   │   ├── Payments/           # CreatePaymentIntention, ProcessWebhook, Refunds
│   │   ├── Conversations/      # Create, SendMessage, MarkRead, GetConversations
│   │   ├── Admin/              # Dashboard, UserManagement, ReviewRefund
│   │   └── InternalAi/         # PropertyMappings lookup for AI Worker
│   └── Common/
│       ├── Behaviors/          # Validation, Caching, CacheInvalidation, Logging, Performance
│       ├── Caching/            # ICacheable, ICacheInvalidation, CacheTags
│       └── Interfaces/         # IAppDbContext, IPaymentGateway, IIdentityService, etc.
│
├── Baytology.Infrastructure/   # External Concerns
│   ├── AI/                     # Fallback services, Dispatch policy, External API clients
│   ├── BackgroundJobs/         # OutboxProcessor, AiFallbackRecoveryProcessor
│   ├── Caching/                # HybridQueryCache
│   ├── Data/                   # AppDbContext, Configurations, Migrations, Seeders
│   ├── Identity/               # IdentityService, TokenProvider
│   ├── Interceptors/           # AuditInterceptor, DomainEventInterceptor
│   ├── Messaging/              # RabbitMqPublisher
│   ├── Notifications/          # NotificationService (DB + SignalR)
│   ├── Payments/               # PaymobGateway
│   ├── RealTime/               # NotificationHub, ChatHub
│   └── Settings/               # All configuration POCOs
│
├── Baytology.Contracts/        # Shared DTOs (Request/Response)
│
└── Baytology.Api/              # Entry Point
    ├── Controllers/            # 14 controllers (versioned)
    ├── Infrastructure/         # GlobalExceptionHandler, Middleware
    └── Program.cs              # App bootstrap

tests/
├── Baytology.Domain.Tests/     # 24 unit tests (entities, validation, events)
├── Baytology.Application.Tests/ # 38 unit tests (handlers, behaviors, persistence)
└── Baytology.Api.Tests/        # 16 integration tests (WebApplicationFactory)
```

---

## ⚡ Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [SQL Server](https://www.microsoft.com/en-us/sql-server) (LocalDB or full instance)
- [Docker](https://www.docker.com/) (optional — for RabbitMQ)

### 1. Clone & Restore

```bash
git clone <repository-url>
cd GraduationProject
dotnet restore
```

### 2. Configure Secrets

Set these values via `appsettings.json` or `dotnet user-secrets`:

```bash
dotnet user-secrets set "JwtSettings:Secret" "your-256-bit-secret-key-here-minimum-32-chars"
dotnet user-secrets set "AdminSettings:DefaultPassword" "Admin@123456"
```

### 3. Create Database

```bash
cd src/Baytology.Api
dotnet ef database update --project ../Baytology.Infrastructure
```

### 4. Run

```bash
dotnet run --project src/Baytology.Api
```

The API will be available at `https://localhost:5001` with Swagger UI.

### 5. (Optional) Start RabbitMQ

```bash
docker compose -f docker-compose.rabbitmq.yml up -d
```

Management UI: http://localhost:15672 (guest/guest)

---

## ⚙️ Configuration

All settings are in `appsettings.json`:

| Section | Key Settings | Purpose |
|---|---|---|
| `ConnectionStrings` | `DefaultConnection` | SQL Server connection |
| `JwtSettings` | `Secret`, `Issuer`, `Audience` | JWT authentication |
| `RabbitMq` | `Enabled`, `HostName`, `Port` | Message broker |
| `Paymob` | `EnableLocalSimulation`, `ApiKey` | Payment gateway |
| `AiProcessing` | `EnableInProcessFallback` | Internal AI fallback |
| `ExternalAiServices` | `ChatbotBaseUrl`, `RecommendationBaseUrl`, `VoiceRecognitionBaseUrl`, `ImageSearchBaseUrl` | External AI APIs |
| `AiWorker` | `ServiceToken` | AI Worker authentication |
| `AdminSettings` | `DefaultEmail`, `DefaultPassword` | Initial admin seed |

### Quick Mode Switches

| Scenario | Config |
|---|---|
| **No RabbitMQ** (dev mode) | `RabbitMq.Enabled = false` + `AiProcessing.EnableInProcessFallback = true` |
| **Simulate payments** | `Paymob.EnableLocalSimulation = true` |
| **No external AI** | `ExternalAiServices.ChatbotEnabled = false` + `ExternalAiServices.VoiceRecognitionEnabled = false` |

---

## 🧪 Testing

```bash
# Run all 78 tests
dotnet test

# Run a specific project
dotnet test tests/Baytology.Domain.Tests
dotnet test tests/Baytology.Application.Tests
dotnet test tests/Baytology.Api.Tests
```

| Project | Tests | Coverage |
|---|---|---|
| Domain Tests | 24 | Entity validation, state transitions, domain events |
| Application Tests | 38 | Command handlers, behaviors, persistence |
| API Integration Tests | 16 | Full endpoint flows with WebApplicationFactory |

---

## 🔐 Security

- **JWT Bearer** authentication with refresh token rotation
- **Role-based authorization** (Buyer, Agent, Admin)
- **Rate limiting** on sensitive endpoints
- **CORS** policy with configurable origins
- **Constant-time comparison** for webhook/service tokens (`CryptographicOperations.FixedTimeEquals`)
- **Environment-aware error responses** — production never leaks exception details
- **Sensitive secrets** stored via `user-secrets` (never in `appsettings.json`)

---

## 📡 Real-time Features

| Hub | Route | Purpose |
|---|---|---|
| NotificationHub | `/hubs/notifications` | Push notifications to users |
| ChatHub | `/hubs/chat` | Real-time messaging |

Connect via SignalR client with JWT token in query string:
```
wss://localhost:5001/hubs/notifications?access_token=<jwt>
```

---

## 🤖 AI Integration

The platform supports a **hybrid AI architecture**:

1. **RabbitMQ Path** — Search/Recommendation requests are queued for external AI workers
2. **Internal Fallback** — Smart database scoring when AI workers are unavailable
3. **Recovery Processor** — Background service auto-resolves stale pending requests
4. **External API Proxy** — Direct proxy to Chatbot and Recommendation APIs

5. **Voice Recognition Proxy** - Audio uploads are forwarded to the chatbot voice endpoint through the ASP.NET gateway.

See [AI Integration Walkthrough](docs/ai-integration.md) for detailed documentation.

---

## 💳 Payment Flow

1. Buyer creates a payment intention → Paymob integration
2. Webhook callback confirms payment → `ProcessPaymentWebhookCommand`
3. Payment marked as completed → `PaymentCompletedEvent` triggers notification
4. Refund flow: Request → Admin Review → Approve/Reject → Process

**Local simulation mode** (`Paymob.EnableLocalSimulation = true`) allows testing without real Paymob credentials.

---

## 📝 API Endpoints Overview

| Area | Endpoints | Auth |
|---|---|---|
| **Identity** | Register, Login, Refresh Token, Profile | Public / Authenticated |
| **Properties** | CRUD, Search, Save, Views, Reviews | Buyer / Agent |
| **Bookings** | Create, Confirm, Cancel, List | Buyer / Agent |
| **Conversations** | Create, Send Message, Mark Read | Authenticated |
| **Payments** | Create Intention, Webhook, Refunds | Buyer / Admin |
| **AI Search** | Create, Get Status, Resolve | Authenticated / Admin |
| **Recommendations** | Create, Get Status, Resolve | Authenticated / Admin |
| **AI Assistant** | Parse, Question, Search, Rank, Chat, Voice Chat, Image Search, Recommend | Authenticated |
| **Admin** | Dashboard, Users, Refund Review, Properties | Admin |
| **Notifications** | List, Mark Read | Authenticated |

Full API documentation available at `/swagger` when running in Development mode.

---

## 👥 Roles

| Role | Capabilities |
|---|---|
| **Buyer** | Browse properties, save/unsave, book viewings, make payments, chat, AI search |
| **Agent** | List properties, manage bookings, receive payments, chat with buyers |
| **Admin** | Dashboard, user management, review refunds, resolve AI requests |

---

## 📄 License

This project was built as a graduation project for educational purposes.
