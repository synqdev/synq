import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

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

  // Create Service
  const service = await prisma.service.upsert({
    where: { id: 'service-shiatsu' },
    update: {},
    create: {
      id: 'service-shiatsu',
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
