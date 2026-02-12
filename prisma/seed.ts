import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // System entities (for admin time blocking)
  const systemBlocker = await prisma.customer.upsert({
    where: { id: '00000000-0000-0000-0000-000000000000' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'System Block',
      email: 'system@internal',
      phone: '000-0000-0000',
    },
  })
  console.log(`Created system blocker: ${systemBlocker.name}`)

  // Create Workers
  const workers = await Promise.all([
    prisma.worker.upsert({
      where: { id: 'worker-tanaka' },
      update: {},
      create: {
        id: 'worker-tanaka',
        name: '田中',
        nameEn: 'Tanaka',
        isActive: true,
      },
    }),
    prisma.worker.upsert({
      where: { id: 'worker-suzuki' },
      update: {},
      create: {
        id: 'worker-suzuki',
        name: '鈴木',
        nameEn: 'Suzuki',
        isActive: true,
      },
    }),
    prisma.worker.upsert({
      where: { id: 'worker-yamamoto' },
      update: {},
      create: {
        id: 'worker-yamamoto',
        name: '山本',
        nameEn: 'Yamamoto',
        isActive: true,
      },
    }),
  ])
  console.log(`Created ${workers.length} workers`)

  // Create block service (for admin time blocking)
  const blockService = await prisma.service.upsert({
    where: { id: 'block-service' },
    update: {
      duration: 60,
    },
    create: {
      id: 'block-service',
      name: 'Unavailable',
      nameEn: 'Unavailable',
      description: 'Blocked time slot',
      duration: 60,
      price: 0,
      isActive: false, // Hidden from public
    },
  })
  console.log(`Created block service: ${blockService.name}`)

  // Create Standard Shiatsu service
  const standardShiatsu = await prisma.service.upsert({
    where: { id: 'service-shiatsu' },
    update: {
      name: 'スタンダード指圧',
      nameEn: 'Standard Shiatsu',
      description: '全身の指圧マッサージ（60分）',
      duration: 60,
      price: 6000,
    },
    create: {
      id: 'service-shiatsu',
      name: 'スタンダード指圧',
      nameEn: 'Standard Shiatsu',
      description: '全身の指圧マッサージ（60分）',
      duration: 60,
      price: 6000,
      isActive: true,
    },
  })
  console.log(`Created service: ${standardShiatsu.name}`)

  // Create Premium Oil service
  const premiumOil = await prisma.service.upsert({
    where: { id: 'service-premium-oil' },
    update: {},
    create: {
      id: 'service-premium-oil',
      name: 'プレミアムオイル',
      nameEn: 'Premium Oil',
      description: '全身オイルマッサージ（90分）',
      duration: 90,
      price: 10000,
      isActive: true,
    },
  })
  console.log(`Created service: ${premiumOil.name}`)

  // Create Resources (beds)
  const resources = await Promise.all([
    prisma.resource.upsert({
      where: { id: 'resource-bed-1' },
      update: {},
      create: {
        id: 'resource-bed-1',
        name: 'ベッド1',
        isActive: true,
      },
    }),
    prisma.resource.upsert({
      where: { id: 'resource-bed-2' },
      update: {},
      create: {
        id: 'resource-bed-2',
        name: 'ベッド2',
        isActive: true,
      },
    }),
    prisma.resource.upsert({
      where: { id: 'resource-bed-3' },
      update: {},
      create: {
        id: 'resource-bed-3',
        name: 'ベッド3',
        isActive: true,
      },
    }),
  ])
  console.log(`Created ${resources.length} resources (beds)`)

  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: 'customer-demo-1' },
      update: {},
      create: {
        id: 'customer-demo-1',
        name: 'Sato Hana',
        email: 'sato.hana@example.com',
        phone: '090-1111-2222',
      },
    }),
    prisma.customer.upsert({
      where: { id: 'customer-demo-2' },
      update: {},
      create: {
        id: 'customer-demo-2',
        name: 'Kobayashi Ren',
        email: 'kobayashi.ren@example.com',
        phone: '090-3333-4444',
      },
    }),
    prisma.customer.upsert({
      where: { id: 'customer-demo-3' },
      update: {},
      create: {
        id: 'customer-demo-3',
        name: 'Ito Mei',
        email: 'ito.mei@example.com',
        phone: '090-5555-6666',
      },
    }),
  ])
  console.log(`Created ${customers.length} demo customers`)

  // Create default WorkerSchedules (Mon-Sat 10:00-19:00)
  // dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
  const workDays = [1, 2, 3, 4, 5, 6] // Monday to Saturday

  for (const worker of workers) {
    for (const dayOfWeek of workDays) {
      await prisma.workerSchedule.upsert({
        where: {
          id: `schedule-${worker.id}-${dayOfWeek}`,
        },
        update: {},
        create: {
          id: `schedule-${worker.id}-${dayOfWeek}`,
          workerId: worker.id,
          dayOfWeek,
          startTime: '10:00',
          endTime: '19:00',
          isAvailable: true,
        },
      })
    }
  }
  console.log(`Created schedules for ${workers.length} workers (Mon-Sat 10:00-19:00)`)

  const businessDateString = (date: Date) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const toJstDate = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`)

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  let seededBookings = 0

  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    const dateLabel = businessDateString(day)

    const dayBookings = [
      {
        id: `booking-${dateLabel}-tanaka-1000`,
        workerId: workers[0].id,
        customerId: customers[0].id,
        resourceId: resources[0].id,
        serviceId: standardShiatsu.id,
        startTime: '10:00',
        endTime: '11:00',
        status: 'CONFIRMED',
      },
      {
        id: `booking-${dateLabel}-suzuki-1200`,
        workerId: workers[1].id,
        customerId: customers[1].id,
        resourceId: resources[1].id,
        serviceId: standardShiatsu.id,
        startTime: '12:00',
        endTime: '13:00',
        status: i % 2 === 0 ? 'CONFIRMED' : 'PENDING',
      },
      {
        id: `booking-${dateLabel}-yamamoto-1400`,
        workerId: workers[2].id,
        customerId: customers[2].id,
        resourceId: resources[2].id,
        serviceId: standardShiatsu.id,
        startTime: '14:00',
        endTime: '15:00',
        status: 'CONFIRMED',
      },
    ] as const

    for (const seedBooking of dayBookings) {
      await prisma.booking.upsert({
        where: { id: seedBooking.id },
        update: {
          workerId: seedBooking.workerId,
          customerId: seedBooking.customerId,
          resourceId: seedBooking.resourceId,
          serviceId: seedBooking.serviceId,
          startsAt: toJstDate(dateLabel, seedBooking.startTime),
          endsAt: toJstDate(dateLabel, seedBooking.endTime),
          status: seedBooking.status,
        },
        create: {
          id: seedBooking.id,
          workerId: seedBooking.workerId,
          customerId: seedBooking.customerId,
          resourceId: seedBooking.resourceId,
          serviceId: seedBooking.serviceId,
          startsAt: toJstDate(dateLabel, seedBooking.startTime),
          endsAt: toJstDate(dateLabel, seedBooking.endTime),
          status: seedBooking.status,
        },
      })
      seededBookings += 1
    }
  }
  console.log(`Seeded ${seededBookings} demo bookings for the next 7 days`)

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
