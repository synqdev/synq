/**
 * AI Chat Tool Definitions & Executor
 *
 * OpenAI function calling tools that let the AI assistant perform actions:
 * - update_worker_schedule: Set recurring weekly schedules for workers
 * - lookup_workers: Search for workers by name
 *
 * Tools are defined as OpenAI ChatCompletionTool objects.
 * The executor resolves natural language references (e.g. "Jon") to database
 * entities and performs mutations via existing server actions / prisma.
 */

import type OpenAI from 'openai'
import { prisma } from '@/lib/db/client'

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const chatTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'update_worker_schedule',
      description:
        'Update a worker\'s recurring weekly schedule. Sets which days they work and their shift times. Each call sets availability for the specified days and marks all other days as unavailable (OFF).',
      parameters: {
        type: 'object',
        properties: {
          workerName: {
            type: 'string',
            description:
              'The worker\'s name (or partial name) to search for. E.g. "Jon", "田中".',
          },
          days: {
            type: 'array',
            items: {
              type: 'integer',
              minimum: 0,
              maximum: 6,
            },
            description:
              'Array of day-of-week numbers to mark as available. 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday.',
          },
          startTime: {
            type: 'string',
            description: 'Shift start time in HH:MM format (24h). E.g. "11:00", "09:30".',
          },
          endTime: {
            type: 'string',
            description: 'Shift end time in HH:MM format (24h). E.g. "16:00", "18:30".',
          },
        },
        required: ['workerName', 'days', 'startTime', 'endTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_workers',
      description:
        'Search for workers by name. Use this when you need to find the correct worker before performing actions. Returns a list of matching active workers.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Name or partial name to search for.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_worker_schedule',
      description:
        'Get a worker\'s current recurring weekly schedule. Use this to check their current availability before making changes.',
      parameters: {
        type: 'object',
        properties: {
          workerName: {
            type: 'string',
            description: 'The worker\'s name (or partial name) to search for.',
          },
        },
        required: ['workerName'],
      },
    },
  },
]

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_NAMES_JA = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']

export interface ToolResult {
  success: boolean
  result: string
}

/**
 * Execute a tool call and return a human-readable result string.
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    case 'update_worker_schedule':
      return executeUpdateSchedule(args)
    case 'lookup_workers':
      return executeLookupWorkers(args)
    case 'get_worker_schedule':
      return executeGetSchedule(args)
    default:
      return { success: false, result: `Unknown tool: ${toolName}` }
  }
}

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

async function resolveWorker(
  name: string
): Promise<{ id: string; name: string } | null> {
  // Try exact match first, then partial
  const worker = await prisma.worker.findFirst({
    where: {
      isActive: true,
      OR: [
        { name: { contains: name, mode: 'insensitive' } },
        { nameEn: { contains: name, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true },
  })
  return worker
}

async function executeUpdateSchedule(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const workerName = args.workerName as string
  const days = args.days as number[]
  const startTime = args.startTime as string
  const endTime = args.endTime as string

  // Validate time format
  const timeRegex = /^\d{2}:\d{2}$/
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return { success: false, result: 'Invalid time format. Use HH:MM (e.g. "11:00").' }
  }

  // Validate days
  if (!days.length || days.some((d) => d < 0 || d > 6)) {
    return { success: false, result: 'Invalid days. Use 0 (Sunday) through 6 (Saturday).' }
  }

  // Resolve worker
  const worker = await resolveWorker(workerName)
  if (!worker) {
    // Search for suggestions
    const allWorkers = await prisma.worker.findMany({
      where: { isActive: true },
      select: { name: true },
      orderBy: { name: 'asc' },
    })
    const names = allWorkers.map((w) => w.name).join(', ')
    return {
      success: false,
      result: `Worker "${workerName}" not found. Active workers: ${names}`,
    }
  }

  // Build schedule: specified days are available, others keep existing or default to OFF
  const daysSet = new Set(days)

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < 7; i++) {
      await tx.workerSchedule.upsert({
        where: {
          workerId_dayOfWeek: { workerId: worker.id, dayOfWeek: i },
        },
        update: {
          startTime: daysSet.has(i) ? startTime : '09:00',
          endTime: daysSet.has(i) ? endTime : '18:00',
          isAvailable: daysSet.has(i),
        },
        create: {
          workerId: worker.id,
          dayOfWeek: i,
          startTime: daysSet.has(i) ? startTime : '09:00',
          endTime: daysSet.has(i) ? endTime : '18:00',
          isAvailable: daysSet.has(i),
          specificDate: null,
        },
      })
    }
  })

  const dayList = days.map((d) => `${DAY_NAMES[d]} (${DAY_NAMES_JA[d]})`).join(', ')
  return {
    success: true,
    result: `Updated ${worker.name}'s schedule: ${dayList} from ${startTime} to ${endTime}. All other days set to OFF.`,
  }
}

async function executeLookupWorkers(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const query = args.query as string

  const workers = await prisma.worker.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { nameEn: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, nameEn: true },
    orderBy: { name: 'asc' },
  })

  if (workers.length === 0) {
    const allWorkers = await prisma.worker.findMany({
      where: { isActive: true },
      select: { name: true, nameEn: true },
      orderBy: { name: 'asc' },
    })
    const names = allWorkers
      .map((w) => `${w.name}${w.nameEn ? ` (${w.nameEn})` : ''}`)
      .join(', ')
    return {
      success: true,
      result: `No workers matching "${query}". Active workers: ${names}`,
    }
  }

  const results = workers
    .map((w) => `${w.name}${w.nameEn ? ` (${w.nameEn})` : ''} [id: ${w.id}]`)
    .join('\n')
  return { success: true, result: `Found ${workers.length} worker(s):\n${results}` }
}

async function executeGetSchedule(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const workerName = args.workerName as string

  const worker = await resolveWorker(workerName)
  if (!worker) {
    return { success: false, result: `Worker "${workerName}" not found.` }
  }

  const schedules = await prisma.workerSchedule.findMany({
    where: { workerId: worker.id, specificDate: null },
    orderBy: { dayOfWeek: 'asc' },
  })

  if (schedules.length === 0) {
    return {
      success: true,
      result: `${worker.name} has no schedule configured yet (all days default to OFF).`,
    }
  }

  const lines = schedules.map((s) => {
    const dayName = s.dayOfWeek !== null ? DAY_NAMES[s.dayOfWeek] : '?'
    const dayNameJa = s.dayOfWeek !== null ? DAY_NAMES_JA[s.dayOfWeek] : '?'
    if (s.isAvailable) {
      return `${dayName} (${dayNameJa}): ${s.startTime} - ${s.endTime}`
    }
    return `${dayName} (${dayNameJa}): OFF`
  })

  return {
    success: true,
    result: `${worker.name}'s current schedule:\n${lines.join('\n')}`,
  }
}
