# Zer0Flow

## Product

Zer0Flow is a personal Client Acquisition Operating System.

It is initially built for a single user and is designed around this workflow:

Discover → Research → Personalize → Contact → Follow Up → Book → Close → Retain

Zer0Flow is NOT a generic CRM.

The primary goal is to help the user answer:

> "What should I do today that is most likely to make money?"

Every active lead should have a clear next action.

---

## Target Clients

Initial target prospects:

- Coaches
- Consultants

Primary services sold:

- Website rebuilds
- Landing pages
- Conversion optimization
- Website + ongoing optimization

Typical project value:

$1,000–$2,500

---

## Core Product Modules

### 1. Dashboard

The dashboard should prioritize actions instead of displaying meaningless CRM statistics.

Important sections:

- Today's actions
- Overdue follow-ups
- Hot leads
- Upcoming calls
- Proposals requiring attention
- Pipeline value
- Weighted pipeline
- Recent activity

---

### 2. Leads

Each lead can contain:

- Contact information
- Company information
- Website
- LinkedIn URL
- Email
- Phone
- Niche
- Location
- Lead source
- ICP score
- Website score
- Opportunity score
- Deal value
- Temperature
- Status
- Next action
- Next action date
- Notes
- Tags

---

### 3. Pipeline

Pipeline stages:

PROSPECT
RESEARCHED
CONTACTED
REPLIED
QUALIFIED
CALL_BOOKED
CALL_DONE
PROPOSAL
NEGOTIATION
WON
LOST
NURTURE

Every deal should support:

- Deal value
- Probability
- Expected revenue
- Expected close date
- Next action
- Next action date

---

### 4. Activities

Track events such as:

- Lead created
- Website audited
- LinkedIn profile researched
- Connection sent
- Email sent
- Message sent
- Reply received
- Call booked
- Call completed
- Proposal sent
- Proposal viewed
- Deal won
- Deal lost
- Follow-up completed
- Note added

Activities should create a chronological relationship timeline.

---

### 5. Website Intelligence

The user can enter a website URL.

Zer0Flow should eventually analyze:

#### Conversion

- Hero clarity
- Offer clarity
- CTA quality
- Lead capture
- Booking flow
- Social proof
- Trust signals
- Navigation
- Conversion friction

#### UX

- Mobile experience
- Visual hierarchy
- Readability
- Navigation
- Content structure
- User friction

#### Technical

- Performance
- SEO basics
- HTTPS
- Broken links
- Accessibility basics

The system should generate:

- Overall score
- Conversion score
- UX score
- Trust score
- Technical score
- Problems
- Opportunities
- Recommended improvements
- Recommended service

---

### 6. AI Sales Intelligence

AI should help answer:

- Is this a good prospect?
- Why should I contact them?
- Why now?
- What problem can I identify?
- What service should I recommend?
- What should I say?
- When should I follow up?
- What should I do next?

AI features eventually include:

- ICP scoring
- Lead scoring
- Website analysis
- Buying signals
- Research briefs
- Offer recommendations
- Personalized outreach
- Follow-up generation
- Objection handling
- Lead summaries

AI should never invent facts about a prospect.

When information is unavailable, explicitly mark it as unknown.

---

## 7. Outreach

Support:

- LinkedIn outreach
- Cold email
- Follow-ups
- Nurture messages

Example sequence:

Day 0:
Initial outreach

Day 3:
Follow-up

Day 7:
Value-based follow-up

Day 14:
Final follow-up

Day 30:
Nurture

The system should stop automated sequences when a prospect replies.

Initial versions should generate messages for manual approval rather than automatically sending messages.

---

## 8. Next Action Engine

This is one of the most important parts of Zer0Flow.

Every active lead should have:

- next_action
- next_action_at

Examples:

- Send connection request
- Research website
- Send first message
- Follow up
- Book call
- Prepare proposal
- Follow up on proposal
- Ask for testimonial
- Ask for referral

The dashboard should surface the most important actions first.

---

## 9. Telegram Assistant

Telegram will act as a two-way sales assistant.

Notifications:

- Follow-up due
- Call reminder
- Proposal reminder
- Overdue lead
- New lead
- Website audit completed
- Daily briefing
- Weekly report

Commands eventually include:

/today
/pipeline
/leads
/overdue
/lead
/add

The assistant should eventually understand natural language.

Example:

"Remind me to follow up with Sarah tomorrow at 10am."

"What leads need attention today?"

"What should I do with Sarah?"

---

## 10. Analytics

Track:

- Leads generated
- Leads contacted
- Replies
- Calls booked
- Calls completed
- Proposals
- Wins
- Revenue
- Conversion rates
- Lead sources
- Offer performance

Important acquisition sources:

- LinkedIn
- Cold email
- Referrals
- Website
- Other

---

# Technical Stack

## Frontend / Application

- Next.js
- TypeScript
- App Router
- Server Components
- Server Actions where appropriate
- Tailwind CSS
- shadcn/ui

## Database / Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime where useful
- Row Level Security

## Background Jobs

- Trigger.dev

Use Trigger.dev for:

- Website audits
- AI processing
- Scheduled follow-ups
- Telegram reminders
- Long-running tasks
- Retryable jobs

Do NOT introduce Redis, BullMQ, or another queue system unless there is a demonstrated requirement.

## Website Analysis

- Playwright

## Notifications

- Telegram Bot API

## AI

Use an AI provider abstraction.

Do not tightly couple business logic to a single AI provider.

## Deployment

- Coolify
- GitHub

---

# Architecture Principles

### Keep it simple

Do not over-engineer the application.

Prefer:

Next.js
↓
Supabase
↓
Trigger.dev for background work

Avoid introducing unnecessary services.

---

### Security

Never expose:

- Supabase service role key
- Telegram bot token
- AI API keys
- Other server secrets

to the browser/client.

Use environment variables.

Use Supabase RLS for database security.

---

### Multi-tenancy

The first version is for one user.

However, database entities should be designed with:

workspace_id

where appropriate.

Do not build a complete multi-tenant SaaS system yet.

Just make the architecture capable of supporting it later.

---

### Type Safety

Use TypeScript throughout.

Avoid:

- `any`
- unnecessary type assertions
- duplicated types
- untyped database responses

Prefer generated Supabase database types.

---

### Components

Build reusable components.

Do not create huge components containing:

- database logic
- business logic
- UI
- AI calls

Keep responsibilities separated.

---

### Server / Client

Prefer Server Components.

Use Client Components only when interactivity requires them.

Do not turn entire pages into Client Components unnecessarily.

---

### Database

Database schema should be designed before building complicated UI.

Use migrations.

Never manually modify production database structure.

---

### AI

AI-generated information must be treated as untrusted output.

Validate structured AI responses before saving them.

Never allow AI to silently overwrite important CRM data.

---

# UI / UX Direction

Zer0Flow should feel like a modern premium sales operating system.

Design principles:

- Minimal
- Clean
- Fast
- Dense but readable
- Professional
- Personal
- Not a generic enterprise CRM

Avoid:

- Excessive gradients
- Huge dashboards full of meaningless charts
- Generic SaaS templates
- Excessive animations
- Cluttered tables
- Unnecessary modals

The interface should prioritize:

1. What needs attention
2. Why it matters
3. What action should be taken
4. How to take that action quickly

---

# Development Rules

Before implementing a feature:

1. Understand the existing architecture.
2. Check whether a reusable component/service already exists.
3. Avoid duplicating functionality.
4. Keep changes focused.
5. Run type checking.
6. Run linting.
7. Test the affected functionality.

Do not rewrite unrelated parts of the application.

Do not install a package when the functionality can reasonably be implemented using the existing stack.

Do not create fake data as a substitute for implementing the real functionality unless explicitly requested.

---

# Development Strategy

Build in vertical slices.

Phase 1:

Authentication
→ Workspace
→ Dashboard
→ Leads
→ Pipeline
→ Activities
→ Tasks
→ Next Actions

Phase 2:

Website Audit
→ Playwright
→ AI Analysis
→ Lead Scoring
→ Opportunity Detection

Phase 3:

AI Outreach
→ Research Brief
→ Offer Recommendation
→ Message Generation
→ Follow-up Generation

Phase 4:

Trigger.dev
→ Background Jobs
→ Scheduled Tasks
→ Follow-ups
→ Reminders

Phase 5:

Telegram
→ Webhook
→ Commands
→ Daily Briefing
→ Notifications

Phase 6:

Analytics
→ Acquisition
→ Conversion
→ Revenue
→ Forecasting

Do not attempt to implement all phases at once.