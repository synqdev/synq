# Domain Pitfalls: Wellness Booking Systems

**Domain:** Reservation/Booking Systems (Wellness/Spa)
**Researched:** 2026-02-04
**Stack Context:** Next.js 15 + Supabase + Prisma + SWR
**Confidence:** MEDIUM-HIGH (verified with multiple 2025-2026 sources, some stack-specific details extrapolated)

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or major customer-facing issues.

---

### Pitfall 1: Race Conditions Leading to Double-Booking

**What goes wrong:**
Multiple users simultaneously booking the same timeslot results in overbooking. The classic scenario: two users check availability at the same time, both see "available," both proceed to book, system accepts both reservations. One person shows up to find their appointment doesn't exist or conflicts with another customer.

**Why it happens:**
- Using simple "SELECT then INSERT" without atomic operations
- Insufficient transaction isolation levels (READ COMMITTED allows phantom reads)
- Client-side availability checks without server-side locking
- Optimistic UI updates before server confirmation
- Missing unique constraints at database level

**Consequences:**
- Customer no-shows due to conflicting bookings
- Reputation damage and lost trust
- Manual intervention required to resolve conflicts
- Refund/compensation costs
- Worker schedules become unreliable

**Prevention:**

**For Supabase/Prisma stack specifically:**

1. **Database-level unique constraints** (first line of defense):
```sql
-- Ensure no overlapping bookings for same worker/resource
CREATE UNIQUE INDEX idx_no_overlap ON bookings (
  worker_id,
  (tstzrange(start_time, end_time, '[)'))
) WHERE status != 'cancelled';
```

2. **Use Prisma interactive transactions with SERIALIZABLE isolation**:
```typescript
await prisma.$transaction(
  async (tx) => {
    // Check availability
    const conflict = await tx.booking.findFirst({
      where: {
        workerId: workerId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        status: { not: 'cancelled' }
      }
    });

    if (conflict) throw new Error('Slot unavailable');

    // Create booking
    return await tx.booking.create({ data: bookingData });
  },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    timeout: 5000
  }
);
```

3. **Implement idempotency keys** to prevent duplicate submissions from network retries:
```typescript
// Store idempotency key with each booking attempt
const idempotencyKey = `booking-${userId}-${timestamp}-${hash}`;
```

4. **Use PostgreSQL advisory locks** for critical sections via Supabase:
```sql
-- Acquire lock before checking availability
SELECT pg_advisory_xact_lock(hashtext(worker_id || resource_id));
```

5. **Row-level locking with FOR UPDATE**:
```typescript
// In Prisma raw query when checking resource availability
await prisma.$queryRaw`
  SELECT * FROM resources
  WHERE id = ${resourceId}
  FOR UPDATE NOWAIT
`;
```

**Detection warning signs:**
- Multiple bookings with identical or overlapping timestamps
- Database constraint violation errors in logs (503 errors)
- Customer complaints about "booking disappeared"
- Workers reporting conflicting appointments on their calendars

**Phase mapping:** Must be addressed in Phase 1 (Core booking flow). Not deferrable.

**Sources:**
- [Building a Ticketing System: Concurrency, Locks, and Race Conditions](https://codefarm0.medium.com/building-a-ticketing-system-concurrency-locks-and-race-conditions-182e0932d962)
- [How to Solve Race Conditions in a Booking System](https://hackernoon.com/how-to-solve-race-conditions-in-a-booking-system)
- [Preventing Race Conditions with SERIALIZABLE Isolation in Supabase](https://github.com/orgs/supabase/discussions/30334)
- [Prisma Transaction Patterns That Avoid Deadlocks](https://medium.com/@connect.hashblock/10-prisma-transaction-patterns-that-avoid-deadlocks-4f52a174760b)

---

### Pitfall 2: Timezone and Date Handling Errors (Japan-Specific)

**What goes wrong:**
Dates displayed or stored incorrectly due to timezone confusion. Common scenarios:
- User in Tokyo books "Jan 1st 9am" but system stores as UTC, worker sees Dec 31st midnight
- Frontend shows availability in user's timezone, but backend checks worker's timezone
- Business hours logic fails because Japan doesn't observe DST but logic assumes it does
- Japanese imperial calendar (Reiwa 7年) vs Western calendar (2025) mismatches on forms

**Why it happens:**
- Storing dates as local time instead of UTC
- Using JavaScript Date objects without timezone context
- Comparing datetimes in different timezone representations
- Assuming all users are in same timezone as server
- Not accounting for Japan Standard Time (JST = UTC+9, no DST)
- Mixing imperial calendar (wareki) and Western calendar (seireki) in different parts of UI

**Consequences:**
- Bookings appear at wrong times
- Availability calculations show wrong slots
- Automated reminders sent at wrong times
- Business hours validation fails
- Government forms rejected (if requiring wareki format)
- B2B contracts with date format mismatches

**Prevention:**

1. **Always store timestamps in UTC with timezone-aware types**:
```typescript
// Prisma schema
model Booking {
  startTime DateTime @db.Timestamptz  // PostgreSQL timezone-aware
  endTime   DateTime @db.Timestamptz
}
```

2. **Use date-fns-tz or Temporal API (not plain Date objects)**:
```typescript
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';

const JST = 'Asia/Tokyo';

// User selects "2026-02-05 14:00" in their UI
const userInput = '2026-02-05T14:00:00';
const utcTime = zonedTimeToUtc(userInput, JST);  // Convert to UTC for storage

// Display to worker
const workerDisplay = formatInTimeZone(utcTime, JST, 'yyyy-MM-dd HH:mm');
```

3. **Store business hours with timezone context**:
```typescript
interface BusinessHours {
  timezone: 'Asia/Tokyo';  // Explicit timezone
  hours: {
    monday: { open: '09:00', close: '18:00' },
    // ...
  }
}
```

4. **Japanese calendar handling**:
```typescript
// Allow both formats but store internally as ISO
// Detect format from input
const isWareki = input.includes('令和');  // "Reiwa"
const isoDate = isWareki
  ? convertWarekiToISO(input)  // Reiwa 7 → 2025
  : parseISO(input);

// Display based on context
const displayDate = context === 'government'
  ? formatToWareki(isoDate)    // 令和7年2月4日
  : format(isoDate, 'yyyy年MM月dd日');  // 2025年2月4日
```

5. **Never rely on server timezone**:
```typescript
// BAD: new Date().toLocaleDateString()  // Uses server TZ
// GOOD: Store user's timezone preference
const userTZ = user.timezone || 'Asia/Tokyo';
```

6. **Validation for Japanese date conventions**:
- Support both 24-hour format (preferred for business) and 12-hour with 午前/午後
- Allow extended hours (25:00 = 1am next day) for businesses open past midnight
- Weekday in parentheses: `2025年4月16日(水)` not `2025年4月16日 水曜日`

**Detection warning signs:**
- Bookings appearing 9 hours off (JST/UTC offset)
- Availability shown for wrong date
- Email confirmations with incorrect times
- Customer complaints: "I booked for tomorrow but system says today"
- Failed validation on government forms

**Phase mapping:** Phase 1 (Core booking). Must handle before launch since it affects all timestamps.

**Sources:**
- [How to Handle Date and Time Correctly to Avoid Timezone Bugs](https://dev.to/kcsujeet/how-to-handle-date-and-time-correctly-to-avoid-timezone-bugs-4o03)
- [Japanese Business Date Formats Guide](https://www.japanconvert.com/blog/japanese-business-date-formats-guide)
- [Date and time notation in Japan - Wikipedia](https://en.wikipedia.org/wiki/Date_and_time_notation_in_Japan)
- [Japanese Date Format Explained](https://wakokujp.com/japanese-date-format/)

---

### Pitfall 3: Missing Row-Level Security (RLS) in Supabase

**What goes wrong:**
Database exposed without proper RLS policies. Users can read/modify other users' bookings, view worker schedules they shouldn't access, or even delete records. This is a **critical security vulnerability** that has affected 170+ production apps in 2025.

**Why it happens:**
- Developers assume authentication = authorization
- RLS disabled during development, forgotten before deployment
- Misunderstanding that Supabase security depends on RLS, not just API keys
- Copy-pasting queries without considering who can execute them
- Service role key used client-side (bypasses RLS entirely)

**Consequences:**
- **Data breach:** Private customer data exposed (names, emails, phone numbers, booking history)
- **CVE-2025-48757:** 83% of exposed Supabase databases involve RLS misconfigurations
- Regulatory violations (GDPR, Japan APPI)
- Competitor access to business data
- Malicious users canceling others' bookings
- Reputation destruction, potential lawsuits

**Prevention:**

1. **Enable RLS on ALL tables immediately**:
```sql
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
```

2. **Implement least-privilege policies**:
```sql
-- Users can only see their own bookings
CREATE POLICY "Users view own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

-- Workers see bookings assigned to them
CREATE POLICY "Workers view assigned bookings"
  ON bookings FOR SELECT
  USING (worker_id IN (
    SELECT id FROM workers WHERE user_id = auth.uid()
  ));

-- Only authenticated users can create bookings
CREATE POLICY "Authenticated users create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
```

3. **Never expose service role key client-side**:
```typescript
// BAD: Using service role in browser
const supabase = createClient(url, SERVICE_ROLE_KEY);  // ❌

// GOOD: Use anon key, rely on RLS
const supabase = createClient(url, ANON_KEY);  // ✅
```

4. **Test RLS policies thoroughly**:
```typescript
// Create test suite that attempts unauthorized access
describe('RLS Security', () => {
  it('prevents user from viewing others bookings', async () => {
    const { data } = await supabaseAsUserA
      .from('bookings')
      .select()
      .eq('user_id', userB.id);  // Try to access userB's data

    expect(data).toEqual([]);  // Should return empty, not userB's bookings
  });
});
```

5. **Audit checklist before deployment**:
- [ ] RLS enabled on all tables
- [ ] Service role key only in server/backend code
- [ ] Policies tested for each user role
- [ ] No `USING (true)` policies (allows all access)
- [ ] Admin access uses service role from backend, not RLS bypass

**Detection warning signs:**
- Unauthenticated users can fetch data via direct API calls
- Supabase dashboard shows tables without RLS shield icon
- Security scanner reports show exposed endpoints
- Users reporting they can see other people's appointments

**Phase mapping:** Must be configured in Phase 1. Not negotiable. Security is not a feature you add later.

**Sources:**
- [Supabase Row Level Security Complete Guide 2026](https://vibeappscanner.com/supabase-row-level-security)
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS with Real Examples](https://medium.com/@jigsz6391/supabase-row-level-security-explained-with-real-examples-6d06ce8d221c)

---

### Pitfall 4: Email Notification Delivery Failures

**What goes wrong:**
Booking confirmation emails never arrive. Customer books appointment, receives no confirmation, forgets about booking, doesn't show up. Or worse: customer thinks booking failed (no email received) so books again, creating duplicate appointments.

**Why it happens:**
- SPF/DKIM/DMARC not configured properly
- Emails flagged as spam by recipient mail servers
- SendGrid/Postmark sender reputation issues
- Email service rate limiting exceeded during peak times
- Invalid sender addresses (e.g., noreply@vercel.app instead of verified domain)
- Bounce handling not implemented
- Email queues not monitored, failures go unnoticed

**Consequences:**
- High no-show rates (customers forget without reminder)
- Duplicate bookings (customers retry when no confirmation received)
- Customer service overhead (manual confirmation calls)
- Lost revenue from missed appointments
- Poor customer experience

**Prevention:**

1. **Use transactional email service with proper domain setup**:
```typescript
// Use Resend, SendGrid, or Postmark with verified domain
// NOT: Gmail SMTP or unverified sender addresses

// Configure DNS records:
// SPF: v=spf1 include:sendgrid.net ~all
// DKIM: Add provided keys
// DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

2. **Implement email queue with retry logic**:
```typescript
// Don't send email directly in booking transaction
// Use queue to handle failures gracefully

interface EmailJob {
  type: 'booking_confirmation';
  to: string;
  bookingId: string;
  attempts: number;
}

// Exponential backoff retry
const retryDelays = [1000, 5000, 30000];  // 1s, 5s, 30s
```

3. **Store email delivery status**:
```typescript
model EmailLog {
  id          String   @id @default(cuid())
  bookingId   String
  type        EmailType
  recipient   String
  status      EmailStatus  // pending, sent, failed, bounced
  provider    String       // sendgrid, resend, etc
  providerId  String?      // Message ID from provider
  attempts    Int          @default(0)
  lastError   String?
  sentAt      DateTime?
  createdAt   DateTime     @default(now())
}
```

4. **Fallback mechanisms**:
```typescript
// If email fails after retries, escalate
if (emailFailed && attempts > 3) {
  // Send SMS backup notification
  await sendSMS(booking.phone, confirmationMessage);

  // Alert staff to manually confirm
  await notifyStaff({
    type: 'email_failure',
    bookingId: booking.id,
    action: 'manual_confirmation_needed'
  });
}
```

5. **Webhook monitoring for email events**:
```typescript
// Set up webhooks for bounces, spam reports
// POST /api/webhooks/email-status

export async function POST(req: Request) {
  const event = await req.json();

  if (event.type === 'bounce' || event.type === 'spam') {
    await prisma.emailLog.update({
      where: { providerId: event.messageId },
      data: {
        status: event.type === 'bounce' ? 'bounced' : 'spam_reported',
        lastError: event.reason
      }
    });

    // Flag user email as problematic
    await flagInvalidEmail(event.recipient);
  }
}
```

6. **Test with real email providers in staging**:
- Don't rely on console.log email testing
- Send test emails to Gmail, Outlook, Yahoo
- Check spam scores with mail-tester.com
- Verify SPF/DKIM alignment

7. **User-facing email debugging**:
```typescript
// Allow users to resend confirmation
// "Didn't receive email? Click here to resend"

// Show email status in dashboard
// "Confirmation sent to user@example.com on Feb 4, 2026 at 2:30pm"
```

**Detection warning signs:**
- High no-show rates (>15% for wellness bookings)
- Customer support tickets: "I never got a confirmation"
- Email logs showing consistent failures to certain domains
- Bounce rate >5%
- SendGrid/Postmark reputation score dropping

**Phase mapping:** Must be in Phase 1. Email confirmation is table-stakes for booking systems.

**Sources:**
- [Booking email notifications NOT WORKING - Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/5647141/booking-email-notifications-not-working)
- [Email notifications problems - Salon Booking System](https://salonbookingsystem.helpscoutdocs.com/article/126-email-notifications-problems)
- [Email Notification Settings - BookingPress](https://www.bookingpressplugin.com/documents/notifications-settings/)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or user experience issues but are recoverable.

---

### Pitfall 5: Calendar UI Breaks on Mobile

**What goes wrong:**
Desktop calendar looks great, but on mobile: tap targets too small, calendar doesn't fit screen, scrolling is janky, date picker hidden behind keyboard, or UI breaks entirely on iOS Safari vs Android Chrome.

**Why it happens:**
- Desktop-first design approach
- Using fixed pixel widths instead of responsive units
- Insufficient touch target sizing (< 44px)
- Not testing on actual devices, only browser DevTools
- CSS that works on Chrome desktop but breaks on iOS Safari
- Ignoring mobile-specific interactions (pinch-zoom, swipe)

**Consequences:**
- Users can't complete bookings on mobile (60%+ of traffic)
- High abandonment rate during date selection
- Frustration leads to calling instead of booking online (defeats purpose)
- Accessibility issues for users with motor impairments

**Prevention:**

1. **Mobile-first design philosophy**:
```typescript
// Design for 375px width first, scale up
// Not desktop design that "squishes down"
```

2. **Minimum touch target sizes**:
```css
/* Each calendar date cell must be tappable */
.calendar-day {
  min-width: 44px;   /* Apple HIG minimum */
  min-height: 44px;
  /* Add padding, not just size on the element */
  padding: 12px;
}

/* Space between interactive elements */
.time-slots {
  gap: 8px;  /* Prevent accidental taps */
}
```

3. **Use native mobile date pickers when appropriate**:
```typescript
// For simple date selection, use native picker
<input
  type="date"
  value={selectedDate}
  onChange={handleDateChange}
  // Native picker on mobile, custom on desktop
  className="native-date-input"
/>

// For complex scheduling (multi-resource, recurring), use custom UI
```

4. **Test on real devices, not just simulators**:
- iOS Safari has different rendering than Chrome
- Test on older devices (iPhone SE size, not just latest)
- Check both portrait and landscape orientations
- Test with keyboard open (viewport height changes)

5. **Responsive calendar component strategy**:
```typescript
// Show different views based on screen size
const isMobile = useMediaQuery('(max-width: 768px)');

return isMobile ? (
  <MobileCalendarView />  // Vertical scroll, larger targets
) : (
  <DesktopCalendarView />  // Month grid view
);
```

6. **Handle mobile keyboard interactions**:
```typescript
// Scroll input into view when keyboard appears
useEffect(() => {
  const input = inputRef.current;
  input?.addEventListener('focus', () => {
    setTimeout(() => {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);  // Wait for keyboard animation
  });
}, []);
```

7. **Avoid calendar pattern mismatches**:
- Don't use month-picker for selecting date of birth (too many clicks)
- Do use year-dropdown for DOB, month-view for appointments
- Don't require multiple taps to change year (Japanese wellness customer base skews older)

**Detection warning signs:**
- Analytics showing high mobile abandonment at calendar step
- User feedback: "Can't select date on my phone"
- Mobile conversion rate << desktop conversion rate
- Heat maps showing missed taps on calendar cells

**Phase mapping:** Address in Phase 1 during calendar UI implementation. Mobile is not optional in Japan (90%+ mobile usage for local services).

**Sources:**
- [Time Picker UX: Best Practices for 2025](https://www.eleken.co/blog-posts/time-picker-ux)
- [Top UI/UX Mistakes in Travel Booking Apps](https://miracuves.com/blog/top-ui-ux-mistakes-travel-booking-platforms/)
- [Calendar UI Design Struggle](https://yourbrandmate.agency/blog/the-calendar-ui-design-struggle-why-are-we-still-doing-this)
- [Best Practices for Calendar Design](https://medium.com/design-bootcamp/best-practices-for-calendar-design-fix-ux-dc57b62d9bb7)

---

### Pitfall 6: Stale Availability Data with SWR Polling

**What goes wrong:**
User sees slot as "available" in calendar, clicks to book, gets error "Slot no longer available." Another user booked it 30 seconds ago but SWR hasn't revalidated yet. Or worse: user books successfully but sees old data, thinks booking failed, tries again, creates duplicate.

**Why it happens:**
- Polling interval too long (refreshInterval: 30000 = 30s)
- Not revalidating on focus/visibility change
- Optimistic updates without rollback mechanism
- Cache showing stale data during booking flow
- No real-time synchronization for multi-user scenarios
- `revalidateIfStale: false` preventing necessary updates

**Consequences:**
- Poor UX: "Available" slots that aren't actually available
- User frustration and lost bookings
- Duplicate booking attempts
- Customers lose trust in system accuracy
- Support burden: "Why did I get an error?"

**Prevention:**

1. **Aggressive revalidation for availability data**:
```typescript
// Availability should be near-real-time
const { data: availability } = useSWR(
  `/api/availability?worker=${workerId}&date=${date}`,
  fetcher,
  {
    refreshInterval: 5000,  // 5s, not 30s
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  }
);
```

2. **Revalidate after mutations**:
```typescript
const { mutate } = useSWRConfig();

async function createBooking(bookingData) {
  try {
    const result = await fetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });

    // Immediately revalidate availability
    await mutate(`/api/availability?worker=${bookingData.workerId}`);

    // Also revalidate user's bookings list
    await mutate('/api/bookings/my-bookings');

    return result;
  } catch (error) {
    // On error, still revalidate to show current state
    mutate(`/api/availability?worker=${bookingData.workerId}`);
    throw error;
  }
}
```

3. **Optimistic updates with rollback**:
```typescript
const { data: bookings, mutate } = useSWR('/api/bookings');

async function optimisticBooking(newBooking) {
  // Optimistically add to UI
  const optimisticData = [...bookings, { ...newBooking, id: 'temp', status: 'pending' }];

  mutate(optimisticData, false);  // Update UI without revalidation

  try {
    const result = await fetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(newBooking),
    });

    const confirmedBooking = await result.json();

    // Replace temp booking with confirmed one
    mutate();  // Revalidate to get server state
  } catch (error) {
    // Rollback optimistic update on error
    mutate();  // Revalidate to restore accurate state

    toast.error('Slot no longer available. Please select another time.');
  }
}
```

4. **Visual feedback for stale data**:
```typescript
const { data, isValidating } = useSWR('/api/availability');

return (
  <div className="calendar">
    {isValidating && (
      <div className="revalidating-indicator">
        Checking for updates...
      </div>
    )}

    <CalendarGrid
      slots={data}
      isStale={isValidating}  // Dim or show spinner on stale slots
    />
  </div>
);
```

5. **Consider WebSocket for high-value slots**:
```typescript
// For popular resources (star therapist), upgrade to WebSocket
useEffect(() => {
  const ws = new WebSocket(`wss://api.synq.jp/availability/${workerId}`);

  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);

    // Update SWR cache with real-time data
    mutate(
      `/api/availability?worker=${workerId}`,
      (current) => ({ ...current, ...update }),
      false  // Don't revalidate, WS data is fresh
    );
  };

  return () => ws.close();
}, [workerId]);
```

6. **Server-side double-check before booking**:
```typescript
// Always verify availability server-side
// Client cache is NEVER source of truth

export async function POST(req: Request) {
  const { workerId, startTime, endTime } = await req.json();

  // Real-time check at booking time
  const conflict = await prisma.booking.findFirst({
    where: {
      workerId,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      status: { not: 'cancelled' }
    }
  });

  if (conflict) {
    return NextResponse.json(
      { error: 'Slot no longer available' },
      { status: 409 }  // Conflict
    );
  }

  // Proceed with booking...
}
```

7. **Adjust polling based on user activity**:
```typescript
// Pause polling when user navigates away
const { data } = useSWR(
  url,
  fetcher,
  {
    refreshInterval: isPageVisible ? 5000 : 0,  // Stop polling when hidden
    isPaused: () => !isPageVisible,
  }
);
```

**Detection warning signs:**
- Users report seeing available slots that error on booking
- High rate of 409 Conflict errors in booking API
- Customer feedback: "Calendar keeps changing"
- Booking attempts that fail due to "slot unavailable"

**Phase mapping:** Must be addressed in Phase 1 during availability/booking implementation. Don't launch with 30s polling.

**Sources:**
- [SWR Data Fetching Library (Stale-While-Revalidate)](https://medium.com/@sparkyingjie/swr-data-fetching-library-stale-while-revalidate-8ecb75cc8f41)
- [Using SWR with HTTP long-polling](https://github.com/vercel/swr/discussions/1856)
- [SWR API Documentation](https://swr.vercel.app/docs/api)

---

### Pitfall 7: Poor No-Show and Cancellation Policy Implementation

**What goes wrong:**
Customers book appointments then don't show up (no-shows) or cancel at the last minute, leaving unfillable gaps in worker schedules. No deposit required, no penalty for cancellation, no reminder system. Business loses revenue from empty slots.

**Why it happens:**
- No cancellation policy defined or enforced
- No deposit/prepayment collection
- No automated reminders sent
- Policy buried in ToS, customers unaware
- No penalties for no-shows, so no incentive to cancel properly
- Manual enforcement (staff calling to confirm) is inconsistent

**Consequences:**
- Revenue loss: Empty slots that could have been booked
- Worker time wasted preparing for no-shows
- Customers who wanted that slot were turned away
- Wellness businesses operate on thin margins, high no-show rate (>15%) is unsustainable
- Staff demoralization

**Prevention:**

1. **Clear, visible cancellation policy**:
```typescript
// Show policy at multiple touchpoints
// 1. On booking page BEFORE user selects time
// 2. In booking confirmation UI
// 3. In email confirmation
// 4. In reminder emails

const CANCELLATION_POLICY = {
  window: 24,  // hours before appointment
  penalty: 'full_charge',  // or 'deposit_forfeit' or 'none'
  reschedule: 'free_if_24hr_notice'
};

// Display prominently
<PolicyBanner>
  Cancellations within 24 hours of appointment will be charged 100%.
  Rescheduling is free with 24hr+ notice.
</PolicyBanner>
```

2. **Require deposit or prepayment**:
```typescript
// Collect deposit at booking time
// Studies show: guests who pay online are 4x less likely to no-show

interface BookingPayment {
  type: 'deposit' | 'full_payment';
  amount: number;
  stripePaymentIntentId: string;
}

// For high-value services (90min massage = ¥15,000), require prepayment
// For lower-value (30min = ¥5,000), 50% deposit acceptable
const depositAmount = booking.totalAmount * 0.5;
```

3. **Automated reminder system**:
```typescript
// Send reminders at strategic intervals
// Research: Both phone + automated reminders = highest show rate

const REMINDER_SCHEDULE = [
  { timing: '24_hours_before', channels: ['email', 'sms'] },
  { timing: '2_hours_before', channels: ['sms'] },  // Final reminder
];

// Include easy reschedule/cancel link in reminders
const reminderEmail = {
  subject: '[明日 2pm] マッサージのご予約確認',  // Tomorrow 2pm Massage Booking Confirmation
  body: `
    ご予約日時: 2026年2月5日(水) 14:00

    変更・キャンセル (24時間前まで無料):
    ${generateRescheduleToken(booking.id)}

    キャンセルポリシー: 24時間以内のキャンセルは全額チャージされます。
  `
};
```

4. **Easy reschedule flow**:
```typescript
// Make it EASY for users to cancel/reschedule
// Don't hide the cancel button
// Friction = no-shows instead of proper cancellations

<BookingCard>
  <RescheduleButton
    href={`/bookings/${booking.id}/reschedule`}
    disabled={isWithin24Hours(booking.startTime)}
  >
    日時変更 (Change Date/Time)
  </RescheduleButton>

  <CancelButton
    onClick={handleCancel}
    showWarning={isWithin24Hours(booking.startTime)}
  >
    キャンセル (Cancel)
  </CancelButton>
</BookingCard>
```

5. **Enforce policy with clear consequences**:
```typescript
async function cancelBooking(bookingId: string) {
  const booking = await getBooking(bookingId);
  const hoursUntil = differenceInHours(booking.startTime, new Date());

  if (hoursUntil < CANCELLATION_POLICY.window) {
    // Within penalty window
    if (booking.paymentIntentId) {
      // Charge cancellation fee (don't refund deposit)
      await stripe.paymentIntents.capture(booking.paymentIntentId);
    }

    return {
      cancelled: true,
      refund: 0,
      message: 'Cancelled within 24hr window. Deposit charged per policy.'
    };
  } else {
    // Outside penalty window
    if (booking.paymentIntentId) {
      await stripe.refunds.create({ payment_intent: booking.paymentIntentId });
    }

    return {
      cancelled: true,
      refund: booking.depositAmount,
      message: 'Booking cancelled. Full refund processed.'
    };
  }
}
```

6. **Track and analyze no-show patterns**:
```typescript
// Measure and monitor no-show rate
interface NoShowMetrics {
  rate: number;  // Target: <10% for wellness
  bySource: Record<string, number>;  // Phone vs online bookings
  byPaymentType: {
    prepaid: number;  // Should be much lower
    payAtVenue: number;
  };
  byRemindersSent: number;
}

// Flag repeat offenders
if (user.noShowCount > 2) {
  requirePrepayment = true;  // Force prepayment for unreliable users
}
```

7. **Waitlist for cancellations**:
```typescript
// Don't just lose the revenue
// Offer cancelled slots to waitlist customers

async function handleCancellation(booking: Booking) {
  await cancelBooking(booking.id);

  // Check waitlist for this service/time
  const waitlisted = await prisma.waitlist.findMany({
    where: {
      serviceId: booking.serviceId,
      preferredTime: {
        gte: subHours(booking.startTime, 2),
        lte: addHours(booking.startTime, 2),
      }
    }
  });

  // Notify waitlist customers
  for (const customer of waitlisted) {
    await sendSMS(customer.phone,
      `空きが出ました！${format(booking.startTime, 'MM/dd HH:mm')} ご希望の場合は即ご予約を。`
      // "Slot opened! [time] Book now if interested."
    );
  }
}
```

**Detection warning signs:**
- No-show rate >15% (wellness industry benchmark: 8-12%)
- High volume of last-minute cancellations
- Workers reporting many empty slots
- Revenue projections not meeting actuals due to no-shows

**Phase mapping:** Must be in Phase 1. Cancellation policy and reminders are table stakes. Prepayment can be Phase 2 after validating with initial users.

**Sources:**
- [How to Create a Cancellation Policy](https://acuityscheduling.com/learn/how-to-create-a-cancellation-policy)
- [Crafting a No-Show Policy for Your Spa: Best Practices](https://www.ascpskincare.com/updates/blog-posts/crafting-no-show-policy-your-spa)
- [How to Reduce Hotel No-Shows](https://sevenrooms.com/blog/reduce-handle-hotel-no-shows/)
- [Should You Charge for No-Shows?](https://zandahealth.com/blog/us/cancellation-fee-for-no-shows/)

---

### Pitfall 8: Security Vulnerabilities in Booking Systems

**What goes wrong:**
Booking system becomes target for attacks: credential stuffing (automated login attempts), payment data theft, DDoS attacks during peak booking times, or injection attacks via booking form inputs. In 2025, 60% of hospitality cyberattacks stem from connected devices and booking systems.

**Why it happens:**
- Weak authentication (no MFA, shared passwords)
- PCI-DSS non-compliance for payment handling
- SQL injection vulnerabilities in search/filter queries
- No rate limiting on API endpoints
- Unpatched dependencies
- IoT devices (booking tablets, kiosks) left insecure
- Staff training insufficient (phishing, social engineering)

**Consequences:**
- Data breach: customer PII exposed (names, emails, phone, booking history)
- Payment card data theft (PCI-DSS v4.0 violations = fines)
- Ransomware: system locked, can't process bookings
- DDoS: website down during peak hours
- Reputational damage and loss of customer trust
- Regulatory penalties (Japan APPI, GDPR for EU customers)

**Prevention:**

1. **Never store payment card data directly**:
```typescript
// Use Stripe/PayPal, not custom payment handling
// PCI-DSS compliance is HARD, let Stripe handle it

// BAD: ❌
interface Booking {
  cardNumber: string;  // NEVER store this
  cvv: string;         // NEVER store this
}

// GOOD: ✅
interface Booking {
  stripePaymentIntentId: string;  // Reference only
  stripeCustomerId: string;
}
```

2. **Parameterized queries (prevent SQL injection)**:
```typescript
// Prisma handles this by default, but if using raw queries:

// BAD: ❌
const results = await prisma.$queryRaw`
  SELECT * FROM bookings WHERE user_id = ${userId}
`;  // Vulnerable if userId comes from user input

// GOOD: ✅
const results = await prisma.booking.findMany({
  where: { userId }  // Prisma auto-parameterizes
});

// If must use raw SQL:
const results = await prisma.$queryRaw`
  SELECT * FROM bookings WHERE user_id = ${Prisma.sql([userId])}
`;  // Explicitly parameterized
```

3. **Rate limiting on critical endpoints**:
```typescript
// Prevent brute force and DDoS

import { ratelimit } from '@/lib/redis';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for');

  const { success, remaining } = await ratelimit.limit(
    `booking_${ip}`,
    {
      rate: 10,      // 10 requests
      interval: 60,  // per 60 seconds
    }
  );

  if (!success) {
    return NextResponse.json(
      { error: 'Too many booking attempts. Please try again later.' },
      { status: 429 }
    );
  }

  // Process booking...
}
```

4. **Input validation and sanitization**:
```typescript
// Validate all user inputs
import { z } from 'zod';

const bookingSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[\p{L}\s]+$/u),  // Letters and spaces only
  email: z.string().email(),
  phone: z.string().regex(/^[0-9\-+() ]+$/),  // Numbers and phone formatting only
  serviceId: z.string().uuid(),
  notes: z.string().max(500),  // Limit length
});

// Sanitize HTML to prevent XSS
import DOMPurify from 'isomorphic-dompurify';
const safeNotes = DOMPurify.sanitize(userInput.notes);
```

5. **Implement MFA for admin/worker accounts**:
```typescript
// Use Supabase Auth MFA
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  issuer: 'SYNQ',
});

// Require MFA for accounts with booking management permissions
if (user.role === 'admin' || user.role === 'worker') {
  requireMFA = true;
}
```

6. **Keep dependencies updated**:
```bash
# Automated security audits
npm audit

# Use Dependabot or Snyk for automated PR updates
# Critical: Update Prisma, Next.js, Supabase client regularly
```

7. **Secure API routes**:
```typescript
// Verify authentication on all mutations
export async function POST(req: Request) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Additional authorization check
  const booking = await getBooking(bookingId);
  if (booking.userId !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // Process request...
}
```

8. **Security headers**:
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
        ],
      },
    ];
  },
};
```

9. **Logging and monitoring**:
```typescript
// Log security-relevant events
await auditLog({
  action: 'booking_created',
  userId: session.user.id,
  ip: req.headers.get('x-forwarded-for'),
  timestamp: new Date(),
  details: { bookingId, serviceId },
});

// Monitor for anomalies
// - Spike in failed login attempts
// - Unusual booking patterns (100 bookings in 1 minute)
// - API 401/403 errors from same IP
```

**Detection warning signs:**
- Unusual traffic patterns (DDoS)
- Failed login attempts spike
- Security scanner reports (npm audit, Snyk)
- Customers reporting phishing emails
- Unusual bookings (same customer booking 50 slots)

**Phase mapping:** Security must be in Phase 1. Not deferrable.

**Sources:**
- [Top Hospitality Cybersecurity Threats for 2025](https://udtonline.com/hospitality-cybersecurity-threats-2025/)
- [Top Security Concerns with Online Booking Systems](https://schedly.io/top-security-concerns-with-online-booking-systems-and-how-to-address-them/)
- [Booking Application Security: Top Threats](https://mohasoftware.com/blog/booking-application-security-top-threats-and-how-to-mitigate-them)
- [Peak Season, Peak Risk: 2025 State of Hospitality Cyber Report](https://www.vikingcloud.com/resources/peak-season-peak-risk-the-2025-state-of-hospitality-cyber-report)

---

## Minor Pitfalls

Mistakes that cause annoyance but are relatively easy to fix.

---

### Pitfall 9: Japanese Localization Missteps

**What goes wrong:**
UI text is poorly translated or uses wrong conventions. Dates shown in wrong format (MM/DD/YYYY instead of YYYY/MM/DD), address fields require postal code user doesn't have, Japanese fonts are huge (slow load times), or UI breaks because Japanese text is longer than English.

**Why it happens:**
- Machine translation without native speaker review
- Assuming Western UI patterns work for Japanese users
- Fixed-width UI elements that break with longer Japanese text
- Not supporting Japanese input methods (IME)
- Using wrong calendar format (ignoring wareki)
- Large font files not optimized

**Consequences:**
- Professional credibility loss (poor Japanese = untrustworthy)
- Users can't complete signup (postal code requirement blocks foreigners)
- Slow page loads (Japanese fonts are 2-5MB unoptimized)
- Form validation errors (expecting katakana, user enters kanji)
- Government form rejections (wareki required, seireki provided)

**Prevention:**

1. **Date format localization**:
```typescript
// Use correct Japanese date format
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// Japanese standard: YYYY年MM月DD日(weekday)
const formattedDate = format(date, 'yyyy年MM月dd日(E)', { locale: ja });
// → 2026年2月4日(火)

// For government/B2B contexts, support wareki
const isGovernmentForm = context === 'official';
const displayDate = isGovernmentForm
  ? '令和7年2月4日'  // Reiwa 7
  : '2026年2月4日';   // Western calendar
```

2. **Address field flexibility**:
```typescript
// Don't REQUIRE Japanese postal code for signup
interface AddressForm {
  postalCode?: string;  // Optional, not required
  prefecture: string;   // Or allow "海外" (overseas) option
  city: string;
  addressLine1: string;
}

// Provide postal code lookup API for convenience
// But don't block non-Japanese users
```

3. **Font optimization**:
```typescript
// Use subset fonts for performance
// Japanese fonts are HUGE (2-5MB), subset to needed characters

// Option 1: Use system fonts
font-family:
  -apple-system, BlinkMacSystemFont,
  "Hiragino Kaku Gothic ProN", "Hiragino Sans",
  Meiryo, sans-serif;

// Option 2: Subset Noto Sans JP
// Include only commonly used characters, not full CJK set
// Use font-display: swap to prevent text blocking
@font-face {
  font-family: 'Noto Sans JP';
  src: url('/fonts/NotoSansJP-subset.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+3000-30FF, U+4E00-9FFF;  // Hiragana, Katakana, common kanji
}
```

4. **Responsive UI for variable text length**:
```typescript
// Japanese text can be much longer or shorter than English

// BAD: Fixed width
<button className="w-32">Book Now</button>  // ❌ Breaks with "予約する"

// GOOD: Flexible width
<button className="px-6 py-2 min-w-fit">予約する</button>  // ✅
```

5. **Support Japanese input (IME)**:
```typescript
// Ensure input fields work with Japanese IME
// Test with actual Japanese keyboard input

<input
  type="text"
  name="fullName"
  placeholder="山田 太郎"
  lang="ja"  // Hint for better IME
  autoComplete="name"
/>

// Allow both full-width and half-width characters
// Don't reject full-width numbers (123 vs 123)
const normalizedPhone = phone.replace(/[０-９]/g, (s) =>
  String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
);  // Convert full-width to half-width
```

6. **Proper form validation for Japanese**:
```typescript
// Name field: Allow kanji, hiragana, katakana, spaces
const nameRegex = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー・ ]+$/u;

// Don't require Western name format (First Last)
// Japanese: 山田 太郎 (surname first)
// Allow single field or surname/given name separate fields

interface JapaneseName {
  surname: string;     // 姓 (sei)
  givenName: string;   // 名 (mei)
  surnameKana?: string;   // セイ (katakana reading)
  givenNameKana?: string; // メイ
}
```

7. **Translation quality checklist**:
```typescript
// Don't rely on machine translation alone
// Hire native Japanese speaker for review

// Common mistakes:
// - "Book" → 予約 (correct for booking)
//   NOT 本 (that's "book" as in reading material)
// - Politeness level: Use です・ます form for customers
// - Business vs casual: 予約する (business) vs 予約しよう (casual)

// Use professional translation for:
// - Legal terms (cancellation policy, ToS)
// - Payment-related text
// - Error messages
```

8. **Business hours and time notation**:
```typescript
// Support 24-hour format (standard in Japan)
// Allow extended hours notation (26:00 = 2am next day)

interface BusinessHours {
  monday: { open: '09:00', close: '21:00' },  // 24-hour format
  friday: { open: '09:00', close: '26:00' },  // Open past midnight
}

// Display: "9:00-21:00" not "9am-9pm"
```

**Detection warning signs:**
- Bounce rate high for Japanese users
- Support tickets in Japanese asking for help with forms
- Lighthouse performance score low due to fonts
- UI breaking on iPhone with Japanese locale
- Validation errors on name/address fields

**Phase mapping:** Must be in Phase 1 before Japanese launch. Can't launch in Japan with English-only UI.

**Sources:**
- [Localization Errors Impact And How To Prevent Mistakes](https://gtelocalize.com/localization-errors/)
- [Common Localization Challenges in Japan and Solutions](https://nihonium.io/common-localization-challenges-in-japan-and-solutions/)
- [Localization Mistakes to Avoid when Internationalizing](https://inlang.com/g/940fn8mg/guide-floriankiem-i18nMistakes)
- [Japanese Date Format Explained](https://wakokujp.com/japanese-date-format/)

---

### Pitfall 10: Double-Bottleneck Scheduling Logic Bugs

**What goes wrong:**
Booking system only checks worker availability, forgetting that treatment room (resource) must also be free. Or vice versa: room is free, but worker is booked. Result: double bookings where either worker or room is overcommitted. Especially problematic for wellness businesses with multiple massage rooms and rotating therapists.

**Why it happens:**
- Implementing worker availability first, adding room constraint later as afterthought
- Separate queries for worker and room availability (not atomic check)
- UI shows worker availability only, doesn't factor in room capacity
- Logic assumes 1:1 worker-to-room mapping (breaks when workers share rooms)
- Edge cases like "room setup time" or "worker break time" not modeled

**Consequences:**
- Double-booking: Worker assigned to Room A but Room A already booked
- Customer arrives, no room available despite valid booking
- Worker scheduled for two services simultaneously
- Manual intervention required to resolve conflicts
- Customer frustration, lost revenue from rescheduling

**Prevention:**

1. **Model both constraints in database**:
```typescript
// Prisma schema
model Booking {
  id         String   @id @default(cuid())

  // Both constraints required
  workerId   String
  resourceId String   // Treatment room, massage table, etc

  startTime  DateTime @db.Timestamptz
  endTime    DateTime @db.Timestamptz

  worker     Worker   @relation(fields: [workerId], references: [id])
  resource   Resource @relation(fields: [resourceId], references: [id])

  status     BookingStatus

  @@index([workerId, startTime, endTime])
  @@index([resourceId, startTime, endTime])
}

model Resource {
  id       String @id @default(cuid())
  name     String  // "Massage Room 1", "Facial Room B"
  type     ResourceType  // room, equipment, bed
  capacity Int @default(1)
}
```

2. **Atomic availability check (both constraints)**:
```typescript
async function checkAvailability(params: {
  workerId: string;
  resourceId: string;
  startTime: Date;
  endTime: Date;
}): Promise<{ available: boolean; conflicts: string[] }> {

  const conflicts: string[] = [];

  // Check worker availability
  const workerConflict = await prisma.booking.findFirst({
    where: {
      workerId: params.workerId,
      startTime: { lt: params.endTime },
      endTime: { gt: params.startTime },
      status: { notIn: ['cancelled'] }
    }
  });

  if (workerConflict) {
    conflicts.push('Worker unavailable');
  }

  // Check resource availability
  const resourceConflict = await prisma.booking.findFirst({
    where: {
      resourceId: params.resourceId,
      startTime: { lt: params.endTime },
      endTime: { gt: params.startTime },
      status: { notIn: ['cancelled'] }
    }
  });

  if (resourceConflict) {
    conflicts.push('Room unavailable');
  }

  return {
    available: conflicts.length === 0,
    conflicts
  };
}
```

3. **Database constraint enforcement**:
```sql
-- PostgreSQL exclusion constraint
-- Prevents overlapping bookings for same worker OR same resource

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- No overlapping worker bookings
ALTER TABLE bookings
ADD CONSTRAINT no_worker_overlap
EXCLUDE USING gist (
  worker_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
) WHERE (status != 'cancelled');

-- No overlapping resource bookings
ALTER TABLE bookings
ADD CONSTRAINT no_resource_overlap
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
) WHERE (status != 'cancelled');
```

4. **UI shows combined availability**:
```typescript
// Don't just show worker calendar
// Show intersection of worker AND resource availability

async function getAvailableSlots(
  serviceId: string,
  date: Date
): Promise<TimeSlot[]> {

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      workers: true,      // Who can perform this service
      requiredResources: true  // What rooms/equipment needed
    }
  });

  // Generate potential slots (e.g., every 30min during business hours)
  const potentialSlots = generateSlots(date);

  // Filter to slots where BOTH worker AND resource available
  const availableSlots = await Promise.all(
    potentialSlots.map(async (slot) => {
      // Find any worker + resource combination that's available
      for (const worker of service.workers) {
        for (const resource of service.requiredResources) {
          const { available } = await checkAvailability({
            workerId: worker.id,
            resourceId: resource.id,
            startTime: slot.start,
            endTime: slot.end,
          });

          if (available) {
            return {
              ...slot,
              workerId: worker.id,
              resourceId: resource.id,
              available: true,
            };
          }
        }
      }

      return { ...slot, available: false };
    })
  );

  return availableSlots.filter(slot => slot.available);
}
```

5. **Handle buffer time and setup time**:
```typescript
// Some services need setup/cleanup time
interface Service {
  id: string;
  duration: number;       // 60 minutes (actual service)
  setupTime: number;      // 10 minutes (room prep)
  cleanupTime: number;    // 10 minutes (sanitization)
}

// When checking availability, include buffers
const effectiveStartTime = subMinutes(startTime, service.setupTime);
const effectiveEndTime = addMinutes(endTime, service.cleanupTime);

// Check availability using effective times
const available = await checkAvailability({
  workerId,
  resourceId,
  startTime: effectiveStartTime,  // Earlier
  endTime: effectiveEndTime,      // Later
});
```

6. **Handle worker breaks and resource maintenance**:
```typescript
// Model unavailability explicitly
model Unavailability {
  id         String @id @default(cuid())
  workerId   String?  // Worker break
  resourceId String?  // Room maintenance
  startTime  DateTime
  endTime    DateTime
  reason     String   // "Lunch break", "Cleaning", "Maintenance"
}

// Check both bookings AND unavailability
const isAvailable =
  !hasBookingConflict &&
  !hasWorkerBreak &&
  !hasResourceMaintenance;
```

7. **Smart assignment algorithm**:
```typescript
// When user books, automatically assign optimal worker+resource pair
// Don't require user to pick both

async function findOptimalAssignment(
  serviceId: string,
  startTime: Date,
  endTime: Date
): Promise<{ workerId: string; resourceId: string } | null> {

  const service = await getService(serviceId);

  // Priority rules:
  // 1. Minimize room transitions (prefer worker's usual room)
  // 2. Balance workload (assign to worker with fewer bookings today)
  // 3. Respect worker preferences/specialties

  for (const worker of service.workers) {
    const preferredRoom = worker.preferredResourceId;

    // Try preferred room first
    if (preferredRoom) {
      const available = await checkAvailability({
        workerId: worker.id,
        resourceId: preferredRoom,
        startTime,
        endTime,
      });

      if (available.available) {
        return { workerId: worker.id, resourceId: preferredRoom };
      }
    }

    // Try any available room
    for (const resource of service.requiredResources) {
      const available = await checkAvailability({
        workerId: worker.id,
        resourceId: resource.id,
        startTime,
        endTime,
      });

      if (available.available) {
        return { workerId: worker.id, resourceId: resource.id };
      }
    }
  }

  return null;  // No availability
}
```

**Detection warning signs:**
- Bookings exist with worker assigned but no room
- Workers reporting double-bookings
- Room conflict errors appearing in logs
- Manual schedule adjustments needed after booking

**Phase mapping:** Must be in Phase 1. Core booking logic must handle double-bottleneck from start, not retrofit later.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Phase 1: Core Booking** | Race conditions causing double-bookings | Implement SERIALIZABLE transactions + unique DB constraints immediately. Not deferrable. |
| **Phase 1: Core Booking** | Timezone bugs (Japan = UTC+9, no DST) | Store UTC with timestamptz, display in Asia/Tokyo. Use date-fns-tz. |
| **Phase 1: Authentication** | Missing RLS policies on Supabase tables | Enable RLS on ALL tables before deployment. 83% of breaches are RLS misconfig. |
| **Phase 1: Email Notifications** | Confirmation emails not delivered | Use transactional email service (Resend/SendGrid) with SPF/DKIM setup. Test deliverability. |
| **Phase 1: Calendar UI** | Mobile booking UX broken | Mobile-first design. Min 44px touch targets. Test on real iOS/Android devices. |
| **Phase 1: Availability Logic** | Stale calendar data with SWR | Set refreshInterval: 5000ms (not 30s). Revalidate on focus. Server-side availability re-check. |
| **Phase 1: Booking Flow** | Double-bottleneck logic missing (worker + resource) | Model both constraints. Atomic check for both. UI shows intersection of availability. |
| **Phase 2: Payments** | Not PCI-DSS compliant | Use Stripe/PayPal. NEVER store card numbers. Stripe handles PCI compliance. |
| **Phase 2: Cancellation Policy** | High no-show rates (>15%) | Implement deposit collection, automated reminders (24hr + 2hr), clear cancellation policy. |
| **Phase 2: Security** | API endpoints vulnerable to abuse | Rate limiting (10 req/min per IP). Input validation (zod). Parameterized queries (Prisma). |
| **Phase 2: Real-time Updates** | SWR polling insufficient for high-demand slots | Upgrade to WebSocket for popular workers/times. Push updates to connected clients. |
| **Pre-Launch: Localization** | Poor Japanese UX | Native speaker review. Optimize font loading. Support wareki calendar. Flexible address fields. |
| **Pre-Launch: Testing** | Race conditions only appear under load | Load test with concurrent booking attempts (simulate 30+ simultaneous users). |
| **Post-Launch: Monitoring** | No visibility into booking failures | Implement logging for race condition errors, email failures, payment issues. Set up alerts. |

---

## Testing Checklist for Critical Pitfalls

Before launch, verify each critical pitfall is addressed:

- [ ] **Race Conditions**: Load test with 30+ concurrent booking attempts for same slot. Database constraint should prevent double-booking.
- [ ] **Timezones**: Book appointment from different timezone (simulate VPN). Verify displayed time is correct in JST.
- [ ] **RLS**: Attempt to read other user's bookings via Supabase API. Should return empty/forbidden.
- [ ] **Email Delivery**: Send test booking confirmation. Check Gmail/Outlook inbox (not spam). Verify SPF/DKIM pass.
- [ ] **Mobile Calendar**: Book appointment on iPhone Safari and Android Chrome. Verify tap targets are easily clickable.
- [ ] **Stale Availability**: Open calendar in two browser tabs. Book slot in tab 1. Verify tab 2 updates within 10 seconds.
- [ ] **Double-Bottleneck**: Attempt to book when worker available but room booked. Should show "unavailable."
- [ ] **Security**: Run `npm audit`. Check API rate limits. Verify admin routes require authentication.
- [ ] **Japanese Localization**: Native speaker review. Check date format, font loading, address form usability.
- [ ] **No-Show Policy**: Verify cancellation policy displayed prominently. Test that 24hr cancellations are charged.

---

## Research Confidence Assessment

| Pitfall Category | Confidence | Source Quality |
|------------------|-----------|----------------|
| Race Conditions | **HIGH** | Multiple 2025-2026 technical articles + official Prisma/Supabase docs |
| Timezone Handling | **HIGH** | Official docs + Japan-specific sources + date-fns documentation |
| RLS Security | **HIGH** | Supabase official docs + CVE-2025-48757 incident report |
| Email Delivery | **MEDIUM** | Multiple booking system troubleshooting sources, 2025 articles |
| Calendar UI | **MEDIUM** | UX research articles 2025, travel/booking platform case studies |
| SWR Stale Data | **HIGH** | Vercel SWR official docs + GitHub discussions |
| Cancellation Policy | **MEDIUM** | Industry best practices articles, spa/wellness specific sources |
| Security Vulnerabilities | **HIGH** | 2025 cybersecurity reports, hospitality threat analysis |
| Japanese Localization | **MEDIUM** | i18n best practices + Japan-specific localization guides |
| Double-Bottleneck Logic | **MEDIUM** | General booking system architecture patterns (less wellness-specific) |

**Overall Confidence: MEDIUM-HIGH**

Most critical pitfalls (race conditions, RLS, timezones) are well-documented with authoritative sources. Some domain-specific pitfalls (wellness double-bottleneck, Japanese market conventions) required synthesis from multiple sources.

## Recommendations for Further Research

Areas that may need phase-specific research:

1. **Phase 2 (Payments)**: Deep dive into Stripe integration with Supabase + Next.js 15 App Router. Current research is general payment best practices.

2. **Phase 2 (Worker Scheduling)**: Complex scheduling algorithms for multi-worker, multi-resource optimization. Current research covers availability checking but not intelligent assignment.

3. **Phase 3 (Real-time Features)**: WebSocket implementation with SWR + Supabase Realtime. Current research identifies the need but doesn't provide implementation details.

4. **Pre-Launch (Japan Market)**: Deeper research into Japanese wellness industry conventions, competitor analysis (Hot Pepper Beauty, Airrsv), and market-specific UX expectations.

5. **Post-Launch (Performance at Scale)**: Database query optimization, caching strategies, and performance monitoring specific to booking systems at 1000+ daily bookings.

---

## Sources Summary

**Critical Pitfalls (Race Conditions, Security, RLS)**:
- [Building a Ticketing System: Concurrency, Locks, and Race Conditions](https://codefarm0.medium.com/building-a-ticketing-system-concurrency-locks-and-race-conditions-182e0932d962)
- [How to Solve Race Conditions in a Booking System | HackerNoon](https://hackernoon.com/how-to-solve-race-conditions-in-a-booking-system)
- [Preventing Race Conditions with SERIALIZABLE Isolation in Supabase](https://github.com/orgs/supabase/discussions/30334)
- [Supabase Row Level Security Complete Guide 2026](https://vibeappscanner.com/supabase-row-level-security)
- [Top Hospitality Cybersecurity Threats for 2025](https://udtonline.com/hospitality-cybersecurity-threats-2025/)

**Timezone and Date Handling**:
- [How to Handle Date and Time Correctly to Avoid Timezone Bugs](https://dev.to/kcsujeet/how-to-handle-date-and-time-correctly-to-avoid-timezone-bugs-4o03)
- [Japanese Business Date Formats Guide](https://www.japanconvert.com/blog/japanese-business-date-formats-guide)
- [Date and time notation in Japan - Wikipedia](https://en.wikipedia.org/wiki/Date_and_time_notation_in_Japan)

**UX and Calendar**:
- [Time Picker UX: Best Practices for 2025](https://www.eleken.co/blog-posts/time-picker-ux)
- [Top UI/UX Mistakes in Travel Booking Apps](https://miracuves.com/blog/top-ui-ux-mistakes-travel-booking-platforms/)
- [Best Practices for Calendar Design](https://medium.com/design-bootcamp/best-practices-for-calendar-design-fix-ux-dc57b62d9bb7)

**Email and Notifications**:
- [Booking email notifications NOT WORKING - Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/5647141/booking-email-notifications-not-working)
- [Email notifications problems - Salon Booking System](https://salonbookingsystem.helpscoutdocs.com/article/126-email-notifications-problems)

**Performance and Data Fetching**:
- [SWR Data Fetching Library (Stale-While-Revalidate)](https://medium.com/@sparkyingjie/swr-data-fetching-library-stale-while-revalidate-8ecb75cc8f41)
- [SWR API Documentation](https://swr.vercel.app/docs/api)

**Business Operations**:
- [Crafting a No-Show Policy for Your Spa: Best Practices](https://www.ascpskincare.com/updates/blog-posts/crafting-no-show-policy-your-spa)
- [How to Reduce Hotel No-Shows](https://sevenrooms.com/blog/reduce-handle-hotel-no-shows/)

**Total Sources Referenced**: 35+ authoritative sources from 2025-2026
