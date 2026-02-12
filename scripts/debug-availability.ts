
import { PrismaClient } from '@prisma/client'
import { getAvailableSlots, type Resource } from '@/lib/services/availability.service'
import { BUSINESS_TIMEZONE } from '@/lib/constants'

const prisma = new PrismaClient()

async function main() {
    console.log('--- DEBUG AVAILABILITY ---')
    console.log(`Timezone: ${BUSINESS_TIMEZONE}`)

    // 1. Get a service
    const service = await prisma.service.findFirst({ where: { isActive: true } })
    if (!service) {
        console.error('No active service found')
        return
    }
    console.log(`Service: ${service.name} (${service.duration} min)`)

    // 2. Get bookings for today/tomorrow
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfter = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 1)

    // Fetch bookings for next 2 days
    const bookings = await prisma.booking.findMany({
        where: {
            startsAt: { gte: today, lt: dayAfter },
            status: { in: ['CONFIRMED', 'PENDING'] },
        },
        include: { worker: true }
    })

    console.log(`Found ${bookings.length} bookings:`)
    bookings.forEach(b => {
        // Log raw and formatted times
        const formatOpts: Intl.DateTimeFormatOptions = {
            timeZone: BUSINESS_TIMEZONE,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
        }
        const rawStart = b.startsAt.toISOString()
        const rawEnd = b.endsAt.toISOString()
        const fmtStart = b.startsAt.toLocaleTimeString('en-US', formatOpts)
        const fmtEnd = b.endsAt.toLocaleTimeString('en-US', formatOpts)

        console.log(`- [${b.status}] ${b.worker.name}: Raw(${rawStart} - ${rawEnd}) -> Zone(${fmtStart} - ${fmtEnd})`)
    })

    // 3. Pick a worker and run availability for tomorrow (or today if bookings exist)
    if (bookings.length === 0) {
        console.log('No bookings to test against.')
        return
    }

    const targetBooking = bookings[0]
    const dateStr = targetBooking.startsAt.toLocaleDateString('en-CA', { timeZone: BUSINESS_TIMEZONE })
    const workerId = targetBooking.workerId

    console.log(`\nChecking availability for Worker ${targetBooking.worker.name} on ${dateStr}...`)

    const resources = await prisma.resource.findMany({ where: { isActive: true } })
    const resourceList: Resource[] = resources.map(r => ({ id: r.id, name: r.name }))

    // Helper from route.ts
    const formatTimeInZone = (date: Date): string => {
        return date.toLocaleTimeString('en-US', {
            timeZone: BUSINESS_TIMEZONE,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const existingBookings = bookings.map(b => ({
        workerId: b.workerId,
        resourceId: b.resourceId,
        startTime: formatTimeInZone(b.startsAt),
        endTime: formatTimeInZone(b.endsAt),
    }))

    // Mock schedule (usually fetched from DB, simplified here to 10-19)
    const workerSchedule = {
        startTime: '10:00',
        endTime: '19:00'
    }

    const slots = getAvailableSlots(
        dateStr,
        workerId,
        resourceList,
        existingBookings,
        workerSchedule,
        service.duration
    )

    console.log('Available Slots:')
    slots.forEach(s => console.log(`- ${s.startTime} to ${s.endTime}`))

    // Check specifically for the booked time
    const bookedStart = formatTimeInZone(targetBooking.startsAt)
    const isBookedSlotAvailable = slots.some(s => s.startTime === bookedStart)

    if (isBookedSlotAvailable) {
        console.error(`\n❌ ERROR: Slot starting at ${bookedStart} is BOOKED but shows up as AVAILABLE!`)
    } else {
        console.log(`\n✅ SUCCESS: Slot starting at ${bookedStart} is correctly excluded.`)
    }

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
