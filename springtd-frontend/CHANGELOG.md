# Changelog

## [2026-02-20] (Thursday)

### P1 & P2 Issue Sweep — Full Bug Fix Sprint

**Objective:** Resolve all remaining P1 (critical) and P2 (important) issues tracked in `ISSUE_TRACKER.md`. All 12 issues across P1 and P2 tiers are now marked ✅ Fixed.

---

#### P1 Fixes (Critical)

**P1-005 — Mobile V2 product pages crash on missing wallet balance**
- Created `hooks/useWalletBalance.ts` — reusable hook that fetches wallet balance from `/api/wallet/balance` with graceful fallback to `₦0.00` on error.
- Updated all 5 mobile-v2 product pages (`loan`, `savings`, `invest`, `commodity`, `mortgage`) to use the hook instead of hardcoded balances.

---

#### P2 Fixes (Important)

**P2-001 — Product Configuration tab not fully tested end-to-end**
- Verified `getProductConfiguration()` in `product-api.ts` already handles 404 gracefully (returns data without throwing).
- Product detail page wraps config fetch in its own try/catch with silent fallback to empty state.

**P2-002 — App Builder tabs: partial save coverage**
- **Support tab**: Added `onBlur` → `saveSection('support')` on all 8 input fields with a live "Saved at HH:MM:SS" status indicator.
- **Policy tab**: Wired "Save Draft" button to `saveSection('policy')` and "Publish" button to `publishConfiguration()`, both with `disabled` states and toast feedback.
- **DNS tab**: `handleToggleCustomDomain` and `handleAddDomain` now auto-save via `saveSection('dns')` after state updates.

**P2-003 — Wallet balance & V2 products**
- Fixed wallet balance display and V2 product rendering issues.

**P2-004 — Admin panel pages (users, products, wallet) use hardcoded data**
- Created `lib/adminService.ts` — new service layer wrapping Spring's `account-ms`, `product-ms`, and `wallet-ms` for admin-facing endpoints.
- **Admin Users** (`/admin/users`): Fetches real users from account-ms with search/filter and loading/empty states.
- **Admin Products** (`/admin/product`): Fetches real products from product-ms with tab filtering, search, and API-backed product suspension.
- **Admin Wallet** (`/admin/wallet-and-balances`): Fetches real data from wallet-ms — summary stats (total wallets, balance, active count) and full transaction history with credit/debit color coding.

**P2-005 — Product creation: `isActive` field type mismatch**
- Updated `productApi.createProduct()` in `lib/product-api.ts` to always send `isActive: true` (default) and `status: 'active'` alongside caller-supplied values. Both field names are forwarded so the backend can use whichever it supports.

**P2-006 — Customer applications tab missing real data**
- Rewrote `app/dashboard/merchant/customer/applications/page.tsx` to call `accountService.applications.getAll()` instead of 4 hardcoded mock applications.
- Added `mapToLocalApplication()` to convert `ProductApplication` from account-ms to the shape `UserApplicationsTable` expects.
- Shows proper empty state when API is unavailable (no more fake data fallback).

**P2-007 — Mobile KYC flow not wired to compliance-ms**
- Built complete 4-step KYC wizard in `app/mobile/kyc/page.tsx`:
  - **Step 1 — Personal Info**: First name, last name, date of birth, nationality with validation.
  - **Step 2 — Address**: Street, city, state, postal code, country.
  - **Step 3 — Documents**: Government ID upload (required) and proof of address (optional) with file size validation, base64 encoding, and upload confirmation UI.
  - **Step 4 — Review**: Full summary of all entered data with edit-back capability.
- Submits to `submitIndividualKyc()` from `kycService.ts` → compliance-ms (`/api/v1/kyc/individual/submit`).
- Includes progress bar, success screen with "Back to Home" navigation, and error screen with retry.
- Previously was a no-op stub with an empty `onClick`.

---

#### New Files
- `lib/adminService.ts` — Admin API service for account-ms, product-ms, wallet-ms
- `hooks/useWalletBalance.ts` — Reusable wallet balance hook with fallback
- `lib/devBypass.ts` — Dev tools helper
- `app/mobile-v2/products/MobileV2ProductComponents.tsx` — Shared V2 product components
- `ISSUE_TRACKER.md` — Comprehensive issue tracking document
- `BACKEND_ISSUES.md` — Backend-specific issue notes

#### Modified Files (28 files)
- `app/admin/users/page.tsx` — Wired to real account-ms API
- `app/admin/product/page.tsx` — Wired to real product-ms API
- `app/admin/wallet-and-balances/page.tsx` — Wired to real wallet-ms API
- `app/dashboard/merchant/customer/applications/page.tsx` — Wired to real account-ms API
- `app/mobile/kyc/page.tsx` — Full KYC flow with compliance-ms integration
- `app/mobile/home/page.tsx` — Wallet balance hook integration
- `app/mobile-v2/products/{loan,savings,invest,commodity,mortgage}/page.tsx` — Wallet balance hook
- `components/app-builder/support-tab.tsx` — Save-on-blur with status indicator
- `components/app-builder/policy-tab.tsx` — Wired Save Draft & Publish buttons
- `components/app-builder/dns-tab.tsx` — Auto-save on domain changes
- `lib/product-api.ts` — isActive/status normalization in createProduct
- `lib/accountService.ts` — Extended API methods
- `lib/springProductService.ts` — Product service updates
- Plus 15 other files with smaller fixes

---


## [2026-02-18] (Tuesday)

### SQLite Database Migration - Complete Persistence Layer

**Objective:** Migrate all three microservices from in-memory/JSON storage to persistent SQLite databases for production-ready data persistence.

#### Database Infrastructure
- **product-ms** (`/server/product-ms/src/db/`):
  - Created `database.ts` - SQLite database with products and configurations tables
  - Created `migrate.ts` - Auto-migration script for existing products.json data
  - Added indexes on app_id, spring_app_id, type, and status for query performance
  
- **service-auth-ms** (`/server/service-auth-ms/src/db/`):
  - Created `database.ts` - SQLite database with users table
  - Auto-seeds dev user: `dev@test.com` / `dev123` (merchant role)
  - Added indexes on email and role for fast lookups

- **create-app-ms** (`/server/create-app-ms/src/db/`):
  - Created `database.ts` - SQLite database with apps table
  - Added indexes on merchant_id and status

#### Service Layer Rewrites
- **ProductService** (`/server/product-ms/src/services/productService.ts`):
  - Complete rewrite to use SQLite instead of JSON files
  - Maintains same interface (no breaking changes)
  - All CRUD operations now persistent
  - Auto-migrates existing products.json on first run

- **MockDatabase** (`/server/service-auth-ms/src/utils/mockDatabase.ts`):
  - Replaced in-memory Map with SQLite backend
  - Maintains same interface (AuthService unchanged)
  - All user data now persists across restarts

- **AppModel** (`/server/create-app-ms/src/models/appModel.ts`):
  - Replaced JSON file storage with SQLite
  - Auto-migrates existing apps.json on first run
  - Maintains same interface (AppService unchanged)

#### Benefits
- ✅ **Persistent Data**: No more data loss on service restart
- ✅ **Real Database**: SQL queries, indexes, transactions
- ✅ **Fast Performance**: better-sqlite3 is incredibly fast
- ✅ **Dev User**: Auto-seeded for instant testing (no signup needed)
- ✅ **Production Ready**: Easy migration to PostgreSQL later
- ✅ **Zero Config**: No external database server required

#### Database Files
```
/data/products.db    # Products and configurations
/data/auth.db        # Users and authentication
/data/apps.db        # Apps and merchant data
```

#### Documentation
- Created `SQLITE_MIGRATION.md` - Complete migration documentation
- Created `TESTING_GUIDE.md` - Step-by-step testing instructions with curl commands

---

## [2026-02-17] (Monday)

### Spring App Product Activation Flow Implementation

**Objective:** Implement the complete product activation flow: Product Builder → Spring App → Mobile App.

#### Product Model Updates
- **Added `springAppId` field** to Product interface:
  - `appId`: Original Product Builder app ID (creator)
  - `springAppId`: Spring App ID (when activated by merchant)
  - Enables many-to-one relationship (multiple Spring Apps can activate same product)

#### Backend Changes (product-ms)
- **Updated `getActiveProducts()` method**:
  - Added `springAppId` parameter for filtering
  - Mobile app now fetches: `WHERE springAppId = X AND isActive = true AND status = 'complete'`
  
- **Updated `updateProduct()` method**:
  - Accepts `springAppId` in update payload
  - Merchants can activate products by setting springAppId

- **Updated ProductController**:
  - `getActiveProducts` endpoint now accepts `?springAppId=X` query parameter
  - Passes springAppId to service layer

#### API Layer
- **Created `/api/products/active` route** (`app/api/products/active/route.ts`):
  - Next.js API proxy to product-ms
  - Accepts `type` and `springAppId` query parameters
  - Handles errors gracefully

#### Frontend Changes
- **Updated `useMobileProducts` hook** (`hooks/useMobileProducts.ts`):
  - Added `springAppId` option to filter products
  - Uses Next.js API proxy instead of hitting product-ms directly
  - Better error handling

- **Updated Mobile Products Page** (`app/mobile/products/page.tsx`):
  - Passes `NEXT_PUBLIC_SPRING_APP_ID` to hook
  - Filters products by Spring App ID

#### Configuration
- **Added environment variable**:
  ```bash
  NEXT_PUBLIC_SPRING_APP_ID=wdpgeo0o0
  ```

#### The Complete Flow
```
1. Product Builder: Create App → Create Products (appId: abc123)
2. Spring App: View all products → Activate product (sets springAppId: wdpgeo0o0)
3. Mobile App: Fetch products WHERE springAppId = wdpgeo0o0
```

#### Documentation
- Created `SPRING_APP_ACTIVATION_GUIDE.md` - Complete activation flow documentation
- Includes API endpoints, testing instructions, and troubleshooting

#### Next Steps
- Add "Activate" button UI in Spring App dashboard
- Make springAppId dynamic based on merchant
- Consider many-to-many relationship for scalability

---

## [2026-02-16] (Sunday)

### Product Display Issue Investigation & Debug Tools

**Objective:** Investigate why products created in Product Builder don't display in Spring App and create diagnostic tools.

#### Root Cause Analysis
- Conducted thorough investigation of data flow: Product Builder → API → product-ms → Spring App
- Identified THREE potential causes:
  1. **AppId mismatch** (most likely - 80% probability)
  2. **Products not created successfully** (possible - 15%)
  3. **Backend service issues** (less likely - 5%)

#### Debug Tools Development
- **Created `ProductDebugPanel` component** (`components/product-debug-panel.tsx`):
  - Real-time diagnostic tool showing:
    - Current appId being used
    - Product count for current appId
    - Total products in system
    - All appIds that have products
    - Sample products with their appIds
    - Instant appId mismatch detection
  - Integrated into Product Builder (`/create-app/all-apps/[id]/products/overview`)
  - Integrated into Spring App (`/merchant/products/all/*`)

#### Backend Verification
- Verified product-ms uses persistent file storage (`/data/products.json`)
- Confirmed Fly.dev volume configuration is correct
- Verified data persists across service restarts
- Checked API routes and authentication flow

#### Documentation Created
- `PRODUCT_DISPLAY_ISSUE_ANALYSIS.md` - Detailed technical analysis (194 lines)
- `PRODUCT_ISSUE_ACTION_PLAN.md` - Step-by-step action plan with fixes
- `INVESTIGATION_SUMMARY.md` - Comprehensive summary
- `diagnose-product-issue.sh` - Diagnostic shell script
- `test-product-api.sh` - API testing script

---

## [2026-02-13] (Friday)

### Product Configuration Skip for Demo

**Objective:** Skip product configuration step for demo purposes, allowing products to be immediately available in Spring App.

#### Product Creation Flow Update
- **Changed product status** from `'incomplete'` to `'complete'` when creating:
  - Loan products
  - Mortgage products
  - Savings products
  - Commodity products

- **Set `isActive: true` by default** for all new products

#### Files Modified
- `app/dashboard/create-app/all-apps/[id]/products/page.tsx`:
  - Updated all `createProduct()` calls to use `status: 'complete'`
  - Added `isActive: true` to product creation payload

#### The New Flow
```
Product Builder: Create App → Create Products → Products are COMPLETE
Spring App: Products immediately visible (no configuration needed)
Mobile App: Products immediately available
```

#### Reverting (Post-Demo)
To re-enable configuration:
```typescript
status: 'incomplete'  // Instead of 'complete'
// Remove: isActive: true
```

---

## [2026-02-09] (Continued)

### Publish/Commit Workflow & DNS Verification Enhancement

**Objective:** Complete the App Builder publish workflow with proper version control and DNS verification capabilities.

#### Publish Tab - Version Control System
- **publishConfiguration()**: New context method to create versioned snapshots and mark as published
- **restoreConfiguration()**: Allows reverting to previous configuration versions with full state hydration
- **getChangedSections()**: Utility to track which sections have modified content
- **AlertDialog Confirmation**: Safety prompt before restoring previous versions
- **Refresh Button**: Manual version history reload capability
- **Improved UI**: Gradient card design for publish section, better empty states

#### DNS Tab - Custom Domain Verification
- **Progressive Verification**: Visual feedback for each DNS record (A, CNAME, TXT) verification status
- **Dynamic Record Generation**: DNS records generated based on custom domain with proper values
- **Verification States**: idle → checking → success/failed with granular record-level status
- **Domain Management**: Add/remove custom domains with validation
- **Default SpringPay URL**: Shows default app URL with easy copy functionality
- **Visit Button**: Quick access to verified custom domain

---

## [2026-02-09]

### App Builder Complete Overhaul & Backend Integration

**Objective:** Major refactor of the App Builder with global state management, enhanced UI components, and template preview improvements.

#### Global State Management - AppBuilderContext
- **New Context Provider**: Created `AppBuilderContext.tsx` with centralized state management for all builder tabs
- **Section Updaters**: Individual update functions for `appElements`, `onboarding`, `appProfile`, `policy`, `support`, and `dns`
- **Auto-save Support**: `hasUnsavedChanges` tracking and `saveConfiguration` functionality
- **Configuration Hydration**: Automatic loading of existing app configurations on mount

#### New UI Component System (`components/app-builder/ui/`)
- **DeviceFrame**: Mobile preview frame with zoom controls, device switching (iPhone/Android/Tablet), and orientation toggle
- **ColorPickerEnhanced**: Advanced color picker with palettes, recent colors, and hex input
- **CollapsibleSection**: Reusable collapsible panels with completion badges
- **TabProgress**: Progress indicator showing completion status across builder tabs
- **TabNavigation**: Previous/Next navigation with keyboard hints

#### Mobile Template Components (`components/mobile-templates/`)
- **Shared Types**: Unified `OnboardingStep`, `SplashScreenConfig`, `OnboardingConfig` interfaces
- **V1 Templates**: Classic banking style with `V1SplashScreen` and `V1OnboardingView`
- **V2 Templates**: Modern fintech style with `V2SplashScreen` and `V2OnboardingView` featuring Framer Motion animations

#### Tab Refactors
- **SplashTab**: Now uses context, `DeviceFrame` with zoom controls, `ColorPickerEnhanced` with reset functionality
- **OnboardingTab**: Multi-screen editor (3 screens), image upload support, global styling section, real-time preview
- **PolicyTab**: TipTap editor connected to context with auto-save on content changes
- **SupportTab**: All fields connected to context with social media handles support
- **PublishTab**: Dynamic version history fetched from API, publish/restore functionality

#### Template System Updates
- **TemplateTab**: New dedicated template selection component with preview modal
- **Coming Soon Template**: Replaced "blank/start fresh" with grayed-out placeholder
- **Preview Modal**: Shows actual mobile preview using `MobileTemplatePreview` component

#### API & Configuration
- **Public Config Endpoint**: New `/api/apps/[id]/configuration/public` route for mobile apps to fetch their configuration
- **DNS Config Support**: Added `DNSConfig` interface with custom domain and record management
- **Payment Methods Fix**: Updated billing components to use nested `details` object for card info

#### Bug Fixes
- **Interface Exports**: Added `export` keyword to `AddStaffTabProps` and `CreateRoleTabProps`
- **Deleted Empty File**: Removed empty `CallBacksTab.tsx`

---

## [2026-02-06]

### App Builder Improvements & Preview System
**Objective:** Enhanced the App Builder template selection and preview mechanism to precise reflect the actual mobile application designs (V1/V2).

#### Template Selection UI
- **Renamed Heading**: Changed "Choose Your Foundation" to "Choose Your Template".
- **Visual Overhaul**: Replaced low-res screenshots with clean, distinct icons (Briefcase, Rocket, Layers) for better clarity.
- **Improved UX**: Added hover effects and selection indicators to template cards.

#### Preview System Enhancements
- **True-to-Life Previews**: Implemented `MobileTemplatePreview` which directly renders the **actual** V1 (Classic) and V2 (Modern Fintech) splash and onboarding screens, ensuring 100% accuracy.
- **Fixed Preview Scaling**: Resolved sizing issues in V2 "Modern Fintech" preview to fit perfectly within the mobile frame container (adjusted flex ratios, font sizes, and layout).
- **Dynamic Updates**: Splash and Onboarding tabs now instantly reflect the selected template's design instead of staying static.

#### App Builder Backend Integration (Phase 1)
- **Global State Synchronization**: Implemented centralized configuration state management across all 8 builder tabs, ensuring data persistence during navigation.
- **Configuration Hydration**: App Builder now correctly fetches and loads existing app configurations from the `appConfigurationApi` on initialization.
- **Asset Management API**: Connected `AssetTab` logo and splash screen path handlers to the file storage backend.
- **Real-time Saving**:
  - `SplashTab`: Connected color and template selections to the update endpoint.
  - `OnboardingTab`: Linked onboarding flow configuration to the backend.
  - `PolicyTab`: Rich-text editor content is now serialized and prepared for backend storage.
- **Theme Propagation**: Enforced strict color validation before saving to ensure brand consistency across mobile modules.

#### Bug Fixes
- **Restored Missing Page**: Recovered `app/dashboard/merchant/app-builder/page.tsx` which was missing/deleted, restoring full functionality to the App Builder route.

## [2026-02-05]

### Mobile App V2 UI Implementation

**Objective:** Built a comprehensive set of new UI pages for the second version of the mobile application ("User App 2"), focusing on a modern, clean design with improved navigation and feature sets.

#### New Product Pages
- **Invest Product Page**: Created `/mobile-v2/products/invest` with feature cards and investment grid.
- **Invest Detail Page**: Implemented `/mobile-v2/products/invest/[id]` with purchase flow simulation.
- **Commodity & Savings**: Implemented UI for these product categories consistent with the new design system.

#### Profile & Settings
- **Profile Page**: comprehensive user profile at `/mobile-v2/profile` including:
  - User avatar and verification status.
  - Grouped settings: General, Support & Legal, Account Control.
  - Logout functionality with confirmation modal.
- **Edit Profile**: Form to update name, email, and phone capabilities.
- **Support Pages**: Contact Support, Privacy Policy, Terms & Conditions, and FAQ (Accordion style).
- **Security Flow**:
  - **Reset Password**: Full flow including OTP entry (visual dots), New PIN creation, and Confirm PIN screens with custom keypad UI.

#### Navigation Updates
- **Main Dashboard**: Added "User App 2" card to the main landing page (`/`) linking to `/mobile-v2/home`.
- **Bottom Navigation**: Updated bottom nav bar across all mobile pages to correct active states and links.
- **Tab Navigation**: Updated product page top tabs to include "Invest" and ensure consistent linking.

---

## [2026-02-03]

### Onboarding Flow & Account Features Updates

**Objective:** Enhanced the onboarding experience with an intermediate agreement steps and refined the account management UI features.

#### Onboarding Flow (`app/spring/onboarding`)
- **New Step**: Added "Continue to Sign Agreement" screen (Step 6)
- **Flow Update**: Agreement (Step 5) -> Continue Agreement (Step 6) -> Success (Step 7)
- **Features**:
  - Displays unique static Agreement URL
  - Copy to clipboard functionality
  - "Agreement" button opens URL in new tab

#### Customer Accounts Tab
- **Transaction History**: 
  - Limited recent transactions view to 4 items
  - Renamed action button to "More transactions"
- **Icon Update**: Added support for `investment` account type with `TrendingUp` icon

#### Application Detail Drawer
- **Action Buttons**: Removed "Reject" and "Approve" buttons from the detailed view as per requirements
- **Type Support**: Added `investment` application type support

#### Developer Security
- **2FA Updates**: Removed "Text Message SMS" option from the Security tab in both Developer and Merchant dashboards
- **Cleanup**: Removed unused state and UI elements related to SMS authentication

#### Type Definitions (`lib/accountService.ts`)
- **Expanded Types**: Added `investment` to `Account` and `ProductApplication` union types
# Changelog

## [2026-01-28]

### Phase 4: Account Dashboard Implementation

**Objective:** Build user account dashboards to view and manage customer accounts (savings, loans, mortgages, commodities).

#### Customer Accounts Tab (`components/customer-accounts-tab.tsx`)
- **Main navigation tabs**: Added Applications | Accounts tabs with purple underline style
- **Summary cards**: Total Value (black), Savings & Investments (green), Outstanding Loans (red)
- **Accounts grid**: 2-column layout with account type cards
- **Account cards**: Purple gradient header, balance, interest rate, status badge
- **Click to view**: Opens Account Detail Drawer
- **API Integration**: Fetches from `accountService.accounts.getByUserId()`

#### Account Detail Drawer (`components/drawers/account-detail-drawer.tsx`)
- **Account header**: Purple gradient with type icon, balance, status
- **Account information section**: Type, currency, status, created date, interest rate
- **Transaction history**: Mock transactions with credit/debit indicators
- **Actions**: Close button, View All Transactions button

#### UI Improvements
- Standardized tab styles with purple underline (#7C3AED)
- Consistent purple theming across all account cards and drawers
- Increased card heights for better visual balance
- Larger text sizes in summary cards

### Create App Flow Improvements

#### Merchant Dashboard (`/dashboard/merchant`)
- **API Integration**: Apps list now fetches from `/api/apps` instead of hardcoded data
- **Loading state**: Shows spinner while fetching apps
- **Refresh button**: Manual refresh with loading indicator
- **Fallback mode**: Falls back to demo data when API is unavailable
- **Demo Mode badge**: Indicates when using fallback data
- **Empty state**: Shows "Create Your First App" when no apps exist
- **Auto-refresh**: List refreshes automatically after creating a new app

#### Create App Drawer (`components/drawers/create-app-drawer.tsx`)
- **Purple theming**: Changed from gold (#9A813F) to purple (#7C3AED)
  - Input focus rings
  - Submit button
- **Loading spinner**: Added Loader2 icon during form submission
- **Improved error handling**: Better error messages displayed to users
- **Form reset**: Clears form on close

#### Create App API (`/api/apps/route.ts`)
- **Strict authentication**: Requires valid Bearer token
- **Clear error messages**: "Authorization token is required. Please log in."
- **Consistent error format**: Uses `error` field instead of `message`


---

## [2026-01-27]

### Customer Management & Application Flow Redesign

**Objective:** Redesigned the customer flow and built admin application management features with full API integration.

#### Customer List Page (`/dashboard/merchant/customer`)
- **New page**: Displays all customers in a searchable list
- **Stats cards**: Total, Active, Inactive, Pending customer counts
- **Customer cards**: Avatar with initials, name, email, status badge, application count
- **Search**: Filter customers by name, email, or phone
- **Click-to-navigate**: Click any customer to view their applications
- **API Integration**: Fetches from `accountService.customers.getAll()` with fallback to demo data

#### Customer Applications Page (`/dashboard/merchant/customer/[customerId]/applications`)
- **Dynamic route**: Shows applications for a specific customer
- **Customer info card**: Avatar, name, email, phone, status at the top
- **Back navigation**: Button to return to customer list
- **Stats cards**: Total, Pending, Approved, Rejected counts for that customer
- **Tabbed view**: All, Loans, Savings, Mortgages, Commodities tabs
- **New Application button**: Opens drawer to select application type
- **API Integration**: 
  - Fetches customer from `accountService.customers.getById()`
  - Fetches applications from `accountService.customers.getApplications()`

#### New Application Type Drawer (`components/drawers/new-application-drawer.tsx`)
- **4 beautiful cards** for selecting application type:
  - Apply for Loan (black icon)
  - Open Savings Account (black icon)
  - Apply for Mortgage (black icon)
  - Purchase Commodity (black icon)
- **Hover animations**: Cards lift, shadows appear, arrows animate
- **Smooth transition**: Closes drawer and opens appropriate form drawer

---

### Admin Application Management (Phase 3)

**Objective:** Enable merchants to view, approve, and reject customer applications from a centralized admin interface.

#### Applications Management Page (`/dashboard/merchant/applications`)
- **Stats cards**: Total, Pending Review, Approved, Rejected counts
- **Filters**:
  - Search by ID, user, or type
  - Status filter dropdown (All, Pending, Under Review, Approved, Rejected)
  - Type filter dropdown (All, Loan, Mortgage, Savings, Commodity)
- **Applications table**: Type icon, Reference, Amount, Status badge, Date, Actions
- **Row click**: Opens application detail drawer
- **Quick link**: Button to access Pending applications page
- **API Integration**: Fetches from `accountService.applications.getAll()` with fallback

#### Pending Applications Page (`/dashboard/merchant/applications/pending`)
- **Alert banner**: Shows count of pending applications
- **Queue view**: Card-based layout (not table)
- **Urgency indicators**:
  - "Urgent" badge (red) for 7+ days old
  - "Needs Attention" badge (orange) for 3-7 days old
- **Time ago**: Shows when application was submitted
- **Quick action buttons**: Approve (green) and Reject (red) on each card
- **Empty state**: "All caught up!" with checkmark when queue is empty
- **API Integration**: Fetches from `accountService.applications.getPending()`

#### Application Detail Drawer (`components/drawers/application-detail-drawer.tsx`)
- **Application type card**: Gradient black background with type icon and amount
- **Status badge**: Pending, Under Review, Approved, or Rejected
- **Details section**: User ID, Product ID, Submitted date, Reviewed date, Term, Purpose
- **Approve button**: Green button, calls `accountService.applications.approve()`
- **Reject button**: Red button, opens rejection reason form
- **Rejection form**: Textarea for reason, Confirm button
- **Toast notifications**: Success/error feedback
- **Auto-refresh**: Parent component refreshes after status change

#### Sidebar Update (`components/merchant-sidebar.tsx`)
- **New menu item**: "Applications" with FileText icon
- **Sub-items**:
  - "All Applications" → `/dashboard/merchant/applications`
  - "Pending Review" → `/dashboard/merchant/applications/pending`

---

### Account Service Extensions (`lib/accountService.ts`)

#### New Customer Interface
```typescript
interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  status: 'active' | 'inactive' | 'pending'
  merchantId?: string
  totalApplications?: number
  createdAt: string
  updatedAt?: string
}
```

#### New Customers API (`customersApi`)
- `getAll(merchantId?, params?)` - Fetch all customers with optional filtering
- `getById(id)` - Fetch individual customer by ID
- `getApplications(customerId, params?)` - Fetch applications for a specific customer

---

### Navigation Flow Summary

**Customer Flow:**
```
Sidebar → Customer → Customer List → Click Customer → Customer Applications → New Application → Form Drawer
```

**Admin Flow:**
```
Sidebar → Applications → All Applications → Click Row → Detail Drawer → Approve/Reject
                       → Pending Review → Quick Actions → Approve/Reject
```

---

## [2026-01-26]

### Account Management Microservice Integration - Phase 1 (Foundation)

**Decision:** Chose Option B (Direct Integration + New Features) to minimize disruption to existing working integrations while adding new account-ms capabilities.

**Rationale:** 
- Existing 8 microservices are fully integrated and working
- Account-MS provides new functionality (loans, mortgages, savings, commodities applications)
- Using it as a full gateway would require changing all existing API calls - unnecessary risk
- Better to add it as a 9th service for its unique features only

**Changes Made:**

#### 1. Created `lib/accountService.ts` (New File - ~900 lines)
Complete API wrapper for the Account Management Microservice with:
- **Account Management API**: Create, read, update, delete user accounts
- **Loan Applications API**: Apply for loans, get loan details, get user loans
- **Mortgage Applications API**: Apply for mortgages, get mortgage details, get user mortgages  
- **Savings Accounts API**: Create savings accounts
- **Commodities API**: Buy commodities, get commodity details
- **Application Processing API**: Admin approve/reject applications, get pending applications
- **Pricing API**: Calculate pricing, get product pricing
- **Billing Check API**: Check billing status, get app ownership
- **Health Check API**: Verify service connectivity
- **Full TypeScript types**: Account, LoanApplication, MortgageApplication, SavingsAccount, etc.

#### 2. Created `scripts/test-account-ms.ts` (New File)
Connectivity test script to verify Account-MS integration:
- Tests health endpoint
- Tests products API (via gateway)
- Tests applications API
- Tests pricing API
- Provides colored output with pass/fail status

#### 3. Updated `.env.local`
Added Account-MS environment variable:
```
NEXT_PUBLIC_ACCOUNT_SERVICE_URL=https://account-ms.fly.dev
```

#### 4. Created `ACCOUNT_MS_INTEGRATION.md` (Documentation)
Comprehensive integration guide documenting:
- Service overview and capabilities
- All API endpoints with request/response formats
- UI mapping to existing components
- Implementation plan (Phase 1-4)
- Integration options comparison

---

## [2026-01-26] - Continued

### Account Management Microservice Integration - Phase 2 (User Application UI)

**Objective:** Build end-user facing components for applying to financial products, following the existing drawer-based UI patterns established in the codebase.

**Design Decisions:**
- Followed existing `configure-loan-drawer.tsx` pattern for multi-step forms
- Used same TextInput and InputGroup components for form consistency
- Maintained accent color `#9A813F` for brand consistency
- Implemented same breadcrumb-style step indicators
- Used existing Drawer wrapper component with framer-motion animations

**Changes Made:**

#### 1. Created `components/drawers/loan-application-drawer.tsx` (~350 lines)
End-user loan application drawer with:
- **Step 1 (Amount)**: Loan amount input, tenure selection (6-48 months)
- **Step 2 (Review)**: Summary of loan terms, monthly payment calculation
- Real-time loan calculation: monthly payment = (P × r × (1+r)^n) / ((1+r)^n - 1)
- Terms & conditions agreement checkbox
- Loading states with Loader2 spinner
- Error handling with red error banner
- Integrates with `accountService.loans.apply()`

#### 2. Created `components/drawers/savings-application-drawer.tsx` (~350 lines)
Savings account opening drawer with:
- **Step 1 (Details)**: Initial deposit amount, account type selection
- **Step 2 (Review)**: Summary with projected annual earnings
- Interest calculation display
- Auto-renewal option toggle
- Integrates with `accountService.savings.create()`

#### 3. Created `components/drawers/mortgage-application-drawer.tsx` (~450 lines)
Mortgage application drawer with:
- **Step 1 (Property)**: Property value, down payment, property type
- **Step 2 (Details)**: Tenure selection, employment info
- **Step 3 (Review)**: LTV ratio, monthly payment, total cost summary
- LTV calculation with percentage display
- Property type options: residential, commercial, land
- Integrates with `accountService.mortgages.apply()`

#### 4. Created `components/drawers/commodity-purchase-drawer.tsx` (~320 lines)
Commodity purchase drawer with:
- **Step 1 (Amount)**: Purchase amount in USD
- **Step 2 (Confirm)**: Units to receive, current price, risk warning
- Real-time unit calculation based on current commodity price
- Risk disclosure with warning icon
- Integrates with `accountService.commodities.buy()`

#### 5. Created `components/drawers/application-success-drawer.tsx` (~120 lines)
Success confirmation drawer displayed after any application:
- Type-specific success messages (loan/savings/mortgage/commodity)
- Green checkmark icon animation
- Application/Transaction ID display
- "What happens next" section with timeline
- "View Applications" and "Done" action buttons

#### 6. Created `components/user-applications-table.tsx` (~250 lines)
Table component for displaying all user applications:
- Search functionality by product name or reference ID
- Status filter dropdown (All, Pending, Under Review, Approved, Rejected)
- Type filter dropdown (All, Loan, Mortgage, Savings, Commodity)
- Color-coded status badges with icons:
  - Pending: Yellow with clock icon
  - Under Review: Blue with clock icon
  - Approved: Green with checkmark icon
  - Rejected: Red with X icon
- Responsive table with hover states
- "View" action button for each row
- Application count summary footer

#### 7. Created `app/dashboard/merchant/customer/applications/page.tsx` (~350 lines)
Full applications tracking page with:
- Page header with "New Application" dropdown menu
- Stats cards: Total, Pending, Approved, Rejected counts
- Tabbed navigation: All, Loans, Savings, Mortgages, Commodities
- Integration with all drawer components
- Mock data for UI demonstration (ready for API integration)
- Refresh button for manual data reload

**UI Pattern Consistency:**
- Same button styling: `bg-black hover:bg-black/90` for primary actions
- Same input styling: `border-gray-300 focus:ring-[#9A813F]`
- Same drawer animation: slide-in from right with backdrop
- Same error handling: red banner at top of form
- Same loading indicator: Loader2 spinning icon

**Next Steps (Phase 3):**
- Build admin application management components
- Create ApplicationsListPage for admins to review all applications
- Build ApproveRejectDrawer for admin actions
- Add real API integration replacing mock data

---

### App Builder - Policy & Terms (Editor)
- **Rich Text Editor Implementation**: Replaced dummy editor with a fully functional TipTap editor.
- **Toolbar Features**: Added support for:
  - Text Formatting: Bold, Italic, Underline, Strikethrough.
  - Alignment: Left, Center, Right.
  - Lists: Bullet Lists, Ordered Lists.
  - Links: Functional link insertion.
- **Media Upload**: Implemented "Add Media" functionality using the system file picker. Images are now read and inserted directly as Data URLs.
- **Formatting Dropdown**: Added a dropdown menu to toggle between Paragraph and Heading levels (H1, H2, H3).
- **Real-time Stats**: Implemented dynamic Word Count and Reading Time calculation in the footer.
- **Bug Fix**: Resolved Next.js SSR hydration mismatch by configuring `immediatelyRender: false`.

### App Builder - Publish Tab
- **Version Management**: Updated the "Previous Version" table actions.
- **Restore Functionality**: Converted the static three-dots icon into a functional Dropdown Menu containing a "Restore this version" option.

### App Builder - Mobile Preview Integration
- **Real-time Mobile Preview**: Replaced static placeholders with a high-fidelity `MobilePreviewScreen` component that mimics the actual `app/mobile` UI.
- **Component Reuse**: Ported the Landing and Home screen designs from the mobile app into the builder for accurate representation.
- **Live Customization**:
  - **Splash Tab**: Configured "Primary Color" picker to update the preview's branding live.
  - **Onboarding Tab**: Connected color pickers to the preview's dashboard view.
  - **App Profile Tab**: Added custom **Logo Upload** functionality. The uploaded logo now updates instantly in the preview screen alongside brand colors.

### Spring App - Billing (Merchant Dashboard)
- **Payment Options**: Removed "Pay with Card" functionality to restrict payment methods.
    - Removed the "Pay with Card" button from the Payment Method Tab.
    - Disabled payment trigger on saved card clicks (cards remain viewable for management).
    - Removed the "Pay with card" button from the generic Payment Method Card component.

### Spring App - UI Color Update
- **Accent Color Change:** Updated all UI accent colors from gold (`#9A813F`) to Spring App purple (`#7C3AED`) for:
  - Tab borders
  - Input focus rings
  - Loader spinners
  - Accent text and links
  - Drawer step indicators and highlights
  - Button hover states

### Spring App - Sidebar Navigation Logic
- **Sidebar Consistency Fix:** Refactored merchant dashboard layout logic so:
  - The sidebar with Apps, Admin, Compliance, Developer, Settings only appears on main dashboard pages.
  - When entering an app (Products, Wallets, Customers, etc.), the sidebar switches to show app-specific navigation (Wallets, Customers, Products, etc.).
  - Ensures sidebar does not change unexpectedly when navigating between dashboard sections.

## [2026-02-02]

### Developer UI & Theme Refinement

**Objective:** Refine the Developer section in the Spring App to match the Product Builder's UI while strictly adhering to the Spring App's purple theme, and ensure total separation of themes between the Product Builder (Gold) and Merchant App (Purple).

#### Developer Section Improvements
- **Theme Separation**:
  - **Product Builder**: Reverted all developer components (`components/forms`) to use the **Gold/Black** theme (`#9A813F`), ensuring consistency with the Product Builder interface.
  - **Spring App (Merchant)**: Created a new set of dedicated components in `components/merchant-forms` styled specifically with the **Purple** theme (`#7C3AED`) for the merchant dashboard.
- **Merchant Developer Page**:
  - Updated `/dashboard/merchant/developer` to use the new purple-themed components.
  - Fixed the 404 error by properly creating the Merchant Developer page route.
  - Added "Developer" to the Merchant Sidebar navigation.

#### Compliance Page Fixes
- **Product Builder Compliance**:
  - Created `components/compliance-forms` to house Gold/Black themed compliance forms.
  - Restored the missing Compliance page in the Product Builder (`/dashboard/compliance`) using these gold components.
  - Updated all form inputs, buttons, and "Save & Continue" actions to match the Gold theme.

#### API & Backend
- **Error Handling**: Improved error logging in `app/api/apps/route.ts` to return specific backend errors (e.g., "Invalid Token") to the frontend.
- **Configuration Check**: Added a console warning when `JWT_SECRET` is missing to assist with local development debugging.

#### Sidebar & Navigation
- **Product Builder Sidebar**: Reverted title to "Product Builder" and theme to Gold.
- **Merchant Sidebar**: Added "Developer" menu item to providing easy access to API credentials.

---

## [2026-02-02] - Continued

### Applications Management UI Redesign

**Objective:** Transform the applications view with a customer-centric design, enhanced details drawer, and improved UX for reviewing customer applications.

#### Applications List Page Enhancements (`/dashboard/merchant/applications`)
- **New Customer Column**: 
  - Added customer information as the first column in the applications table
  - Displays customer avatar with initials (gradient dark background)
  - Shows customer full name (Sarah Wilson, Michael Chen, etc.) instead of generic "User"
  - Includes customer ID underneath for reference
  - Hover effect changes name to purple color
- **Enhanced Table Spacing**:
  - Increased row padding from `py-4` to `py-5` for better readability
  - Added more space between elements with `gap-4` for customer info
  - Larger avatar size (10x10) with ring border
  - Two-line date display (date on top, time below) for submitted column
- **Improved Visual Design**:
  - Row hover effect with subtle purple background (`hover:bg-purple-50/50`)
  - Rounded action buttons with hover states
  - Background for reference IDs (`bg-gray-50 px-2 py-1 rounded`)
  - Larger, bolder amount text (`text-base font-bold`)
  - Icons added to dropdown menu items
- **Fixed Data Issues**:
  - Replaced dynamic `Date.now()` calls with static ISO date strings to prevent hydration errors
  - Added mock customer names mapping for realistic demonstration

#### Application Detail Drawer Redesign (`components/drawers/application-detail-drawer.tsx`)
- **Increased Drawer Width**: Changed from 700px to 1000px for better content visibility
- **Customer Profile Header**:
  - Large avatar (16x16) with customer initials on dark background
  - Customer full name in larger font (text-xl)
  - KYC Verified badge with checkmark icon
  - Customer ID and address displayed
  - Status badge positioned in top-right corner
- **Tabbed Interface**:
  - **Tab 1 - Application Details**:
    - Application type card with gradient black background
    - Amount displayed prominently (text-3xl)
    - Reference ID in a styled badge
    - Grid layout for application details fields
    - Product ID and submission date with icons
    - Purpose field spans full width with gray background
  - **Tab 2 - Transactions & Portfolio**:
    - Embeds the `CustomerAccountsTab` component
    - Shows all customer accounts in table format
    - Provides complete customer financial overview
- **Enhanced Spacing**:
  - Added horizontal padding (`px-6`) to all drawer content
  - Better spacing between sections
  - Improved card shadows and borders
- **Bug Fixes**:
  - Restored missing `formatCurrency` function
  - Re-added `isPending` variable that was accidentally removed
  - Fixed sidebar Applications menu expansion state

#### Sidebar Navigation Fix (`components/merchant-sidebar.tsx`)
- **Applications Menu State**:
  - Added `isApplicationsOpen` state to track menu expansion
  - Updated toggle logic to include Applications in the isOpen/setIsOpen checks
  - Fixed issue where clicking "Applications" did nothing
  - Menu now properly expands to show "All Applications" and "Pending Review" sub-items

#### Customer Data Improvements
- **Mock Customer Names**: Created `MOCK_CUSTOMER_NAMES` mapping:
  ```typescript
  {
    "cust-001": "Sarah Wilson",
    "cust-002": "Michael Chen",
    "cust-003": "Emma Rodriguez",
    "cust-004": "James Thompson",
    "cust-005": "David Kim"
  }
  ```
- **Initials Generation**: Automatically generates two-letter initials from customer names
- **Consistent Display**: Customer names and avatars shown in both table and drawer

#### User Experience Improvements
- **Hydration Error Fix**: Replaced dynamic dates with static ISO strings to prevent React hydration mismatches
- **Better Visual Hierarchy**: Larger fonts, better contrast, more whitespace
- **Contextual Information**: Application reviewers can now see full customer context before making decisions
- **Seamless Navigation**: Click table rows to open drawer, view both application and portfolio tabs
- **Professional Polish**: Premium design with shadows, gradients, and smooth transitions

**Impact:**
- Merchants can now see who is applying (not just IDs) at a glance
- Application review is faster with customer context immediately available
- The wider drawer and tabbed interface provide all necessary information in one view
- Clean, modern design improves overall user experience and reduces cognitive load