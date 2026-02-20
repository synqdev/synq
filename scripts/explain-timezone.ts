
import { toZonedTime } from '../src/lib/utils/time'

// Mocking the constant since we can't easily import it without ts-node resolving aliases perfectly (simplifying for script)
// But toZonedTime uses the constant. We'll rely on the fact that toZonedTime is what we use in production.
// Wait, toZonedTime imports BUSINESS_TIMEZONE. TypeScript execution via tsx should handle alias '@/' if tsconfig is standard.
// If not, I'll hardcode it just to be safe in this script, or trust tsx.
// Let's trust tsx first.

async function main() {
    const date = '2026-02-06'
    const time = '11:00'

    console.log(`--- TIMEZONE CONVERSION CHECK ---`)
    console.log(`Scenario: User selects ${date} at ${time} (JST)`)

    try {
        const dt = toZonedTime(date, time)
        console.log(`\nResulting Date Object (NodeJS / Server context):`)
        console.log(`ISO String (UTC): ${dt.toISOString()}`)
        console.log(`\nExplanations:`)
        console.log(`1. 11:00 AM JST is UTC+9`)
        console.log(`2. 11:00 - 9 hours = 02:00 UTC`)
        console.log(`3. The database (Prisma) stores DateTime in UTC by default.`)
        console.log(`4. Therefore, seeing '02:00:00' in the database is CORRECT for an 11:00 AM JST booking.`)
    } catch (e) {
        console.error(e)
    }
}

main()
