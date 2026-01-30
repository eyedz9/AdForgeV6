# PRD: Admin Dashboard

## Introduction

Build a comprehensive Admin Dashboard for AdForge that provides full platform oversight and management. The admin dashboard enables authorized administrators (identified via a database role column) to manage users, moderate content, oversee billing/subscriptions, monitor system health, and analyze platform metrics in real-time. The initial admin account is `jason.solomons@eyedz9.com`.

Currently, AdForge has no admin infrastructure — no role system, no admin routes, no audit logging, and no platform-wide analytics. This PRD covers the full buildout from database schema changes through to the admin UI.

## Goals

- Provide full platform oversight: user management, content moderation, system health, billing oversight, and analytics
- Enable full user control: view, disable/enable accounts, impersonate users, manually assign subscription tiers, override limits, delete accounts
- Implement role-based access via a database column (`role` enum on a user profiles table)
- Deliver full content moderation: browse all user content, flag/remove inappropriate content, disable brands
- Provide comprehensive analytics: basic dashboards, detailed cohort/churn/LTV analytics, and real-time monitoring (live activity, API health, error rates)

## User Stories

### US-100: Create admin role system in database
**Description:** As a developer, I need a role system in the database so that admin access can be determined and enforced.

**Acceptance Criteria:**
- [ ] Create `user_profiles` table with columns: `id` (UUID, references auth.users), `role` (enum: 'user' | 'admin', default 'user'), `created_at`, `updated_at`
- [ ] Insert profile row for `jason.solomons@eyedz9.com` with `role = 'admin'`
- [ ] Create RLS policy: users can read their own profile; admins can read all profiles
- [ ] Create a database trigger that auto-creates a `user_profiles` row with `role = 'user'` when a new auth.users entry is created
- [ ] Migration runs successfully
- [ ] Typecheck passes

### US-101: Create admin middleware and auth utilities
**Description:** As a developer, I need server-side utilities to check admin status so that admin routes are protected.

**Acceptance Criteria:**
- [ ] Create `lib/supabase/admin.ts` with a `createAdminClient()` function using the service role key (bypasses RLS)
- [ ] Create `lib/auth/admin.ts` with:
  - `isAdmin(supabase, userId)` — checks `user_profiles.role`
  - `requireAdmin(supabase)` — gets current user, checks admin role, throws 403 if not admin
- [ ] Admin client uses `SUPABASE_SERVICE_ROLE_KEY` env variable
- [ ] Non-admin users receive 403 Forbidden when accessing admin endpoints
- [ ] Typecheck passes

### US-102: Create admin layout and navigation shell
**Description:** As an admin, I want a dedicated admin layout with navigation so that I can access all admin features.

**Acceptance Criteria:**
- [ ] Create route group `app/(admin)/` with server component layout (`force-dynamic`)
- [ ] Create `AdminShell.tsx` client component with sidebar navigation containing: Dashboard, Users, Content, Subscriptions, Analytics, System, Audit Log
- [ ] Layout checks admin role on load; redirects non-admins to `/` with error toast
- [ ] Admin nav is visually distinct from user dashboard (e.g., different accent color or header badge)
- [ ] Responsive sidebar (collapsible on mobile)
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-103: Build admin overview dashboard page
**Description:** As an admin, I want a high-level dashboard showing key platform metrics so I can quickly assess platform health.

**Acceptance Criteria:**
- [ ] Route: `/admin` — overview dashboard
- [ ] Display metric cards: Total Users, Active Subscriptions, MRR (Monthly Recurring Revenue), Total Brands, Total Personas Generated, Total Images Generated, Total Videos Generated
- [ ] Show growth indicators (% change vs. previous period) on each metric
- [ ] Include a "Recent Activity" feed showing last 20 user actions (sign-ups, subscription changes, content generation)
- [ ] Include a "System Health" status indicator (API response times, error rate in last hour)
- [ ] All data fetched via admin Supabase client (service role, bypasses RLS)
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-104: Build user management — list and search
**Description:** As an admin, I want to see all platform users with search and filtering so I can find and manage specific users.

**Acceptance Criteria:**
- [ ] Route: `/admin/users`
- [ ] Paginated table of all users with columns: Email, Name, Role, Subscription Tier, Status (active/disabled), Sign-up Date, Last Active
- [ ] Search by email or name (debounced, server-side)
- [ ] Filter by: subscription tier (free/starter/professional/agency/enterprise), role (user/admin), status (active/disabled)
- [ ] Sort by: sign-up date, last active, name, subscription tier
- [ ] Show total user count and filtered count
- [ ] Click row to navigate to user detail page
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-105: Build user detail and management page
**Description:** As an admin, I want to view full user details and take management actions so I can resolve support issues and manage accounts.

**Acceptance Criteria:**
- [ ] Route: `/admin/users/[userId]`
- [ ] Display user profile: email, name, avatar, role, sign-up date, last active
- [ ] Display subscription info: tier, status, Stripe customer ID (linked to Stripe dashboard), period dates, cancel status
- [ ] Display usage stats: current period usage vs. limits (personas, images, videos, reports)
- [ ] Display user's brands list with brand names and creation dates
- [ ] Action buttons:
  - **Change Role**: Toggle between 'user' and 'admin' (with confirmation dialog)
  - **Disable Account**: Sets a `disabled_at` timestamp, prevents login (with confirmation)
  - **Enable Account**: Clears `disabled_at`, re-enables login
  - **Delete Account**: Permanently deletes user and all associated data (with double confirmation — type user email to confirm)
- [ ] All actions create audit log entries
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-106: Implement user impersonation
**Description:** As an admin, I want to impersonate a user so I can see exactly what they see for debugging and support purposes.

**Acceptance Criteria:**
- [ ] "Impersonate" button on user detail page
- [ ] Impersonation creates a temporary session viewing the platform as that user
- [ ] Persistent banner at top of page: "You are viewing as [user email] — Exit Impersonation"
- [ ] Impersonation is read-only by default (cannot modify data as the impersonated user)
- [ ] Clicking "Exit Impersonation" returns to admin dashboard
- [ ] Impersonation sessions are logged in audit log
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-107: Build subscription management for admins
**Description:** As an admin, I want to manually manage user subscriptions so I can handle special cases, give trials, and override limits.

**Acceptance Criteria:**
- [ ] Route: `/admin/subscriptions`
- [ ] Table of all subscriptions: user email, tier, status, MRR contribution, period dates, cancel status
- [ ] Filter by tier and status
- [ ] From user detail page, admin can:
  - **Override Tier**: Manually set subscription tier without Stripe (e.g., grant Agency tier for a partner)
  - **Override Limits**: Set custom limits for personas, images, videos, brands (overrides tier defaults)
  - **Reset Usage**: Reset a user's current period usage counters to 0
  - **Extend Trial**: Add days to an existing trial period
- [ ] All overrides are logged in audit log with reason field
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-108: Build content moderation — browse all content
**Description:** As an admin, I want to browse all user-generated content across the platform so I can review and moderate it.

**Acceptance Criteria:**
- [ ] Route: `/admin/content`
- [ ] Tabs: Brands, Personas, Creatives, Intelligence Reports
- [ ] **Brands tab**: Table of all brands with owner email, name, industry, creation date, status (active/flagged/disabled)
- [ ] **Personas tab**: Table/grid of all personas with owner, brand, name, photo thumbnail, creation date, status
- [ ] **Creatives tab**: Grid of all generated creatives with thumbnails, owner, type, generation date, status
- [ ] **Intelligence Reports tab**: Table of all reports with owner, brand, type, generation date
- [ ] Search across all content by keyword
- [ ] Filter by status: all, flagged, disabled
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-109: Implement content moderation actions
**Description:** As an admin, I want to flag, disable, and remove inappropriate content so I can maintain platform quality.

**Acceptance Criteria:**
- [ ] Each content item has a moderation dropdown with actions:
  - **Flag**: Mark as flagged with reason (dropdown: inappropriate, copyright, spam, other + free text)
  - **Disable**: Hide content from user's view (soft delete) with reason
  - **Restore**: Un-flag or re-enable previously disabled content
  - **Delete**: Permanently remove content and associated files from storage (with confirmation)
- [ ] Add `moderation_status` column (enum: 'active' | 'flagged' | 'disabled' | 'deleted') and `moderation_notes` (text) to brands, personas, creatives tables
- [ ] Flagged/disabled content shows warning banner when user views it
- [ ] All moderation actions create audit log entries
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-110: Create audit log system
**Description:** As an admin, I want a comprehensive audit log so I can track all admin actions and significant platform events.

**Acceptance Criteria:**
- [ ] Create `audit_logs` table: id, actor_id (admin who performed action), target_type (user/brand/persona/creative/subscription), target_id, action (string), details (JSONB), ip_address, created_at
- [ ] Route: `/admin/audit-log`
- [ ] Paginated table with columns: Timestamp, Admin, Action, Target, Details
- [ ] Filter by: action type, admin user, target type, date range
- [ ] Search by target ID or action description
- [ ] Auto-log all admin actions: role changes, account disable/enable/delete, impersonation, subscription overrides, content moderation actions
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-111: Build basic analytics dashboard
**Description:** As an admin, I want basic analytics dashboards showing user growth, revenue, and usage so I can track business health.

**Acceptance Criteria:**
- [ ] Route: `/admin/analytics`
- [ ] **User Growth chart**: New sign-ups per day/week/month (line chart), cumulative total users
- [ ] **Revenue chart**: MRR over time, breakdown by tier (stacked area chart)
- [ ] **Subscription Distribution**: Pie/donut chart of users by tier
- [ ] **Usage Overview**: Total personas/images/videos generated per day/week/month (bar chart)
- [ ] Date range selector (last 7d, 30d, 90d, 1y, custom)
- [ ] All charts use a charting library (e.g., Recharts)
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-112: Build detailed analytics — cohorts, churn, LTV
**Description:** As an admin, I want detailed analytics including cohort analysis, churn metrics, and lifetime value so I can make informed business decisions.

**Acceptance Criteria:**
- [ ] Sub-route or tab: `/admin/analytics/detailed`
- [ ] **Cohort Retention Table**: Monthly cohorts showing retention at month 1, 2, 3... (heatmap style)
- [ ] **Churn Metrics**: Monthly churn rate, churned users list, churn by tier
- [ ] **LTV Calculation**: Average LTV by tier, LTV distribution chart
- [ ] **Feature Adoption**: Percentage of users who have created brands, generated personas, generated images, generated videos, created audiences, generated intelligence reports
- [ ] **Conversion Funnel**: Sign-up → First Brand → First Persona → First Creative → Paid Subscription
- [ ] Data computed from existing database tables (subscriptions, usage_tracking, brands, personas, creatives)
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-113: Build real-time monitoring dashboard
**Description:** As an admin, I want real-time monitoring of system health and user activity so I can detect and respond to issues quickly.

**Acceptance Criteria:**
- [ ] Sub-route or tab: `/admin/analytics/realtime`
- [ ] **Live Activity Feed**: Real-time stream of user actions (sign-ups, generations, subscription changes) using Supabase Realtime or polling
- [ ] **API Health**: Response time averages (last 5 min, 1 hr), error rate percentage, top errors
- [ ] **Generation Queue**: Active AI generation jobs (persona, image, video, intelligence), success/failure rates
- [ ] **Active Users**: Currently active users count (users with activity in last 15 minutes)
- [ ] Auto-refresh every 30 seconds (with manual refresh button)
- [ ] Visual alert indicators when error rate exceeds threshold (e.g., >5%)
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-114: Create system settings page
**Description:** As an admin, I want a system settings page so I can configure platform-wide settings without code changes.

**Acceptance Criteria:**
- [ ] Route: `/admin/system`
- [ ] Create `system_settings` table: key (text primary key), value (JSONB), updated_at, updated_by
- [ ] Configurable settings:
  - **Default trial days** (number, default: 14)
  - **Maintenance mode** (boolean, default: false) — shows maintenance banner to all users
  - **Registration enabled** (boolean, default: true) — disable new sign-ups
  - **Tier limits**: edit default limits per tier (brands, personas, images, videos)
  - **AI model configuration**: default models for persona/image/video generation
- [ ] Settings form with save button and confirmation
- [ ] Changes logged in audit log
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-115: Add admin access protection to existing user flows
**Description:** As a developer, I need to integrate the admin role system with existing auth flows so that disabled accounts can't log in and admin status is available client-side.

**Acceptance Criteria:**
- [ ] On login, check `user_profiles.disabled_at` — if set, return error "Account disabled. Contact support."
- [ ] On login, fetch user role and include in session/client state
- [ ] Add "Admin Dashboard" link in DashboardShell sidebar (only visible to admin users)
- [ ] Existing user-facing pages respect `moderation_status` on content (hide disabled/deleted content)
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

## Functional Requirements

- FR-1: The system must have a `user_profiles` table with a `role` enum column ('user' | 'admin') and a `disabled_at` timestamp column
- FR-2: A database trigger must auto-create a `user_profiles` row with `role = 'user'` when a new auth user is created
- FR-3: The admin dashboard must be accessible only to users with `role = 'admin'` in their profile
- FR-4: All admin operations must use a Supabase service role client to bypass RLS
- FR-5: The admin overview must display: total users, active subscriptions, MRR, total brands, total content generated, growth indicators
- FR-6: User management must support: listing, searching, filtering, viewing details, changing roles, disabling/enabling, deleting accounts
- FR-7: User impersonation must provide a read-only view of the platform as the target user with a persistent exit banner
- FR-8: Subscription management must allow: manual tier assignment, custom limit overrides, usage resets, trial extensions
- FR-9: Content moderation must allow: browsing all content across the platform, flagging, disabling, restoring, and deleting content with reasons
- FR-10: The audit log must record all admin actions with actor, target, action type, details, and timestamp
- FR-11: Analytics must include: user growth charts, revenue/MRR charts, subscription distribution, usage trends, cohort retention, churn metrics, LTV calculations, feature adoption, conversion funnel
- FR-12: Real-time monitoring must show: live activity feed, API health metrics, generation queue status, active user count
- FR-13: System settings must allow configuration of: trial duration, maintenance mode, registration toggle, tier limits, AI model settings
- FR-14: Disabled accounts must be prevented from logging in with a clear error message
- FR-15: All moderated content (flagged/disabled) must show appropriate indicators to the owning user
- FR-16: The admin link must only appear in the sidebar for users with the admin role

## Non-Goals (Out of Scope)

- No multi-tenancy or organization-level admin roles (single admin role only)
- No admin API for external integrations
- No automated content moderation (AI-based flagging) — manual only
- No email notification system for admin actions (e.g., notifying users of account changes)
- No admin mobile app or mobile-optimized admin layout
- No granular permission system (all admins have full access)
- No data export/import functionality from admin dashboard
- No A/B testing or feature flag system
- No customer support ticket system
- No direct Stripe dashboard integration (link to Stripe only)

## Design Considerations

- Admin dashboard should use the existing dark theme and glass-morphism design system but with a distinct accent color (e.g., amber/gold instead of violet) to visually differentiate from the user dashboard
- Reuse existing UI components (cards, tables, buttons, badges) from `components/ui/`
- Charts should use Recharts (React-based, SSR-compatible)
- Tables should support pagination, sorting, and filtering with URL search params for shareable state
- Confirmation dialogs for destructive actions (disable, delete) should use a modal with explicit confirmation (e.g., type the user's email to delete)
- Admin layout should have a breadcrumb navigation for deep pages

## Technical Considerations

- **Service Role Key**: Admin operations require `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. This key must NEVER be exposed to the client — all admin data fetching happens server-side (Server Components or API routes)
- **Supabase Realtime**: Can be used for live activity feed on the monitoring dashboard; alternatively, use polling every 30 seconds
- **Charting Library**: Add `recharts` as a dependency for analytics charts
- **Impersonation**: Implemented by querying data with `user_id = targetUserId` filter via admin client, NOT by actually switching auth sessions (security risk)
- **Performance**: Admin queries may scan large tables — add database indexes on frequently queried columns (e.g., `user_profiles.role`, `brands.moderation_status`, `audit_logs.created_at`)
- **Database Migrations**: Multiple migrations needed — group logically (profiles table, moderation columns, audit log, system settings)
- **Environment Variables**: New variables needed: `SUPABASE_SERVICE_ROLE_KEY` (may already exist)

## Success Metrics

- Admin can view any user's full account details within 2 clicks from the user list
- Admin can disable a problematic account within 30 seconds
- Overview dashboard loads with all metrics in under 3 seconds
- Analytics charts render with data for any selected date range
- All admin actions are tracked in the audit log with no gaps
- Content moderation actions take effect immediately (flagged content hidden from user's next page load)
- Impersonation provides accurate representation of user's view

## Open Questions

- Should we add email notifications to users when their account is disabled or content is moderated?
- Should impersonation allow write access with an additional confirmation step, or remain strictly read-only?
- Should there be a "super admin" role that can manage other admins, or is a flat admin role sufficient?
- What data retention policy should apply to audit logs (keep forever vs. 90 days vs. 1 year)?
- Should the real-time monitoring integrate with an external monitoring service (e.g., Sentry, Datadog) or remain self-contained?
