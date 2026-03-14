import test from 'node:test'
import assert from 'node:assert/strict'
import { createTaskService } from '../src/services/task-service.js'

function createTaskContext(overrides = {}) {
  const calls = {
    createTask: [],
  }

  const dataRepository = {
    findModuleSettings: async () => null,
    createTask: async (task) => {
      calls.createTask.push(task)
    },
    ...overrides.dataRepository,
  }

  const taskService = createTaskService({
    env: {
      maxConcurrency: 2,
      workerPollMs: 1000,
      cleanupIntervalMs: 60000,
      maxTaskRows: 2000,
    },
    moduleCatalog: [
      { moduleKey: 'matchmaking-assistant' },
      { moduleKey: 'anti-fraud-guardian' },
    ],
    getModuleName: () => '测试模块',
    getModuleRule: () => ({ failSignals: [] }),
    normalizeModuleKey: (value) =>
      value === 'matchmaking-ai' ? 'matchmaking-assistant' : String(value ?? '').trim(),
    dataRepository,
    reportService: {
      buildAuthorizedReportUrl: () => '',
      ensureTaskReport: async () => false,
    },
  })

  return { taskService, calls }
}

test('createTask should normalize legacy module key', async () => {
  const { taskService, calls } = createTaskContext()
  const user = {
    id: 'u-1',
    enabledModules: ['matchmaking-assistant'],
  }

  const result = await taskService.createTask(user, 'matchmaking-ai', {
    scenario: '客户跟进',
    inputText: '整理客户资料并生成回访建议',
    attachments: ['a.txt'],
  })

  assert.ok(result.data)
  assert.equal(result.data.moduleKey, 'matchmaking-assistant')
  assert.equal(calls.createTask.length, 1)
  assert.equal(calls.createTask[0].moduleKey, 'matchmaking-assistant')
})

test('createTask should reject too long scenario', async () => {
  const { taskService } = createTaskContext()
  const user = {
    id: 'u-1',
    enabledModules: ['matchmaking-assistant'],
  }

  const result = await taskService.createTask(user, 'matchmaking-assistant', {
    scenario: '超长'.repeat(31),
    inputText: 'ok',
    attachments: [],
  })

  assert.equal(result.error.code, 'TASK_SCENARIO_TOO_LONG')
  assert.equal(result.error.status, 400)
})

test('createTask should reject too many attachments', async () => {
  const { taskService } = createTaskContext()
  const user = {
    id: 'u-1',
    enabledModules: ['matchmaking-assistant'],
  }

  const result = await taskService.createTask(user, 'matchmaking-assistant', {
    scenario: '测试场景',
    inputText: '测试内容',
    attachments: Array.from({ length: 11 }, (_, index) => `file-${index + 1}.txt`),
  })

  assert.equal(result.error.code, 'TASK_ATTACHMENTS_TOO_MANY')
  assert.equal(result.error.status, 400)
})

test('createTask should reject too long input text', async () => {
  const { taskService } = createTaskContext()
  const user = {
    id: 'u-1',
    enabledModules: ['matchmaking-assistant'],
  }

  const result = await taskService.createTask(user, 'matchmaking-assistant', {
    scenario: '测试场景',
    inputText: 'a'.repeat(6001),
    attachments: [],
  })

  assert.equal(result.error.code, 'TASK_INPUT_TOO_LONG')
  assert.equal(result.error.status, 400)
})
