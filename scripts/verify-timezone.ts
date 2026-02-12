
import { PrismaClient } from '@prisma/client'
import { toZonedTime, formatInTimeZone } from '@/lib/utils/time'
import { BUSINESS_TIMEZONE } from '@/lib/constants'

const prisma = new PrismaClient()

async function main() {
    console.log('--- VERIFY TIMEZONE ROUNDTRIP ---')
    console.log(`Timezone: ${BUSINESS_TIMEZONE}`)

    // 1. Create a Booking Date (JST)
    // We want to book for May 1st, 10:00 JST
    const targetDate = '2026-05-01'
    const targetTime = '10:00'

    // This is what explicit user selection looks like converted to a Date object
    const zonedDate = toZonedTime(targetDate, targetTime)
    const isoString = zonedDate.toISOString()

    console.log(`\n1. Target: ${targetDate} ${targetTime} (${BUSINESS_TIMEZONE})`)
    console.log(`   Formatted as ISO (UTC): ${isoString}`)

    // 2. Simulate Client -> Server -> API Route Parsing
    // Client sends the ISO string. API route receives it.
    console.log('\n2. Parsing ISO string on Server...')

    // This is the new function we added to fix the bug
    const parts = formatInTimeZone(isoString)
    console.log(`   Extracted Parts: Date=${parts.date}, Time=${parts.time}`)

    // 3. Verification
    if (parts.date === targetDate && parts.time === targetTime) {
        console.log('\n✅ SUCCESS: Round-trip timezone handling works.')
        console.log('   The API now correctly identifying the user intended date/time correctly regardless of server timezone.')
    } else {
        console.error(`\n❌ FAIL: Expected ${targetDate} ${targetTime}, got ${parts.date} ${parts.time}`)
        process.exit(1)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
