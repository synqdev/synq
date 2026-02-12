import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create Workers
  // Use UUID-shaped IDs to match Prisma defaults (@default(uuid())).
  // Keeping IDs stable makes repeated seeds idempotent.
  const WORKER_TANAKA_ID = '11111111-1111-1111-1111-111111111111'
  const WORKER_SUZUKI_ID = '22222222-2222-2222-2222-222222222222'
  const WORKER_YAMAMOTO_ID = '33333333-3333-3333-3333-333333333333'

  const workers = await Promise.all([
    prisma.worker.upsert({
      where: { id: WORKER_TANAKA_ID },
      update: {},
      create: {
        id: WORKER_TANAKA_ID,
        name: '田中',
        nameEn: 'Tanaka',
        isActive: true,
      },
    }),
    prisma.worker.upsert({
      where: { id: WORKER_SUZUKI_ID },
      update: {},
      create: {
        id: WORKER_SUZUKI_ID,
        name: '鈴木',
        nameEn: 'Suzuki',
        isActive: true,
      },
    }),
    prisma.worker.upsert({
      where: { id: WORKER_YAMAMOTO_ID },
      update: {},
      create: {
        id: WORKER_YAMAMOTO_ID,
        name: '山本',
        nameEn: 'Yamamoto',
        isActive: true,
      },
    }),
  ])
  console.log(`Created ${workers.length} workers`)

  // Create Service
  const SERVICE_SHIATSU_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

  const service = await prisma.service.upsert({
    where: { id: SERVICE_SHIATSU_ID },
    update: {},
    create: {
      id: SERVICE_SHIATSU_ID,
      name: '指圧',
      nameEn: 'Shiatsu',
      description: '全身の指圧マッサージ',
      duration: 60,
      price: 6000,
      isActive: true,
    },
  })
  console.log(`Created service: ${service.name}`)

  // Create Resources (beds)
  const RESOURCE_BED_1_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  const RESOURCE_BED_2_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  const RESOURCE_BED_3_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

  const resources = await Promise.all([
    prisma.resource.upsert({
      where: { id: RESOURCE_BED_1_ID },
      update: {},
      create: {
        id: RESOURCE_BED_1_ID,
        name: 'ベッド1',
        isActive: true,
      },
    }),
    prisma.resource.upsert({
      where: { id: RESOURCE_BED_2_ID },
      update: {},
      create: {
        id: RESOURCE_BED_2_ID,
        name: 'ベッド2',
        isActive: true,
      },
    }),
    prisma.resource.upsert({
      where: { id: RESOURCE_BED_3_ID },
      update: {},
      create: {
        id: RESOURCE_BED_3_ID,
        name: 'ベッド3',
        isActive: true,
      },
    }),
  ])
  console.log(`Created ${resources.length} resources (beds)`)

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
