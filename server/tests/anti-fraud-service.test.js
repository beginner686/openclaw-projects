import test from 'node:test'
import assert from 'node:assert/strict'
import { createAntiFraudService } from '../src/services/anti-fraud-service.js'

const activeSubscription = {
  planCode: 'standard',
  planName: '标准版',
  status: 'active',
  startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  maxTargets: 2,
  reportFrequency: 'daily',
  realtimeAlerts: true,
  productScreening: true,
  complaintQuotaMonth: 6,
}

function createAntiFraudContext(overrides = {}) {
  const dataRepository = {
    getAntiFraudSubscription: async () => activeSubscription,
    upsertAntiFraudSubscription: async (_userId, payload) => ({ ...activeSubscription, ...payload }),
    countActiveAntiFraudTargets: async () => 0,
    createAntiFraudTarget: async (payload) => payload,
    updateAntiFraudTarget: async (_userId, _targetId, payload) => payload,
    listAntiFraudScansBetween: async () => [],
    createAntiFraudReport: async (payload) => payload,
    countAntiFraudComplaintsBetween: async () => 0,
    listAntiFraudEvidencesByIds: async (_userId, ids) =>
      ids.map((id) => ({
        evidenceId: id,
        capturedAt: new Date().toISOString(),
        violationPoints: ['绝对化承诺'],
      })),
    createAntiFraudComplaint: async (payload) => payload,
    ...overrides.dataRepository,
  }

  const antiFraudService = createAntiFraudService({ dataRepository })
  return { antiFraudService }
}

const enabledUser = {
  id: 'u-anti-1',
  enabledModules: ['anti-fraud-guardian'],
}

test('activateSubscription should reject invalid months', async () => {
  const { antiFraudService } = createAntiFraudContext()
  const result = await antiFraudService.activateSubscription(enabledUser, {
    planCode: 'standard',
    months: 25,
  })

  assert.equal(result.error.code, 'PLAN_INVALID_MONTHS')
  assert.equal(result.error.status, 400)
})

test('createTarget should reject unsupported target type', async () => {
  const { antiFraudService } = createAntiFraudContext()
  const result = await antiFraudService.createTarget(enabledUser, {
    anchorName: '主播A',
    accountHandle: '@anchor-a',
    targetType: 'wechat',
  })

  assert.equal(result.error.code, 'TARGET_INVALID_TYPE')
  assert.equal(result.error.status, 400)
})

test('updateTarget should require target id', async () => {
  const { antiFraudService } = createAntiFraudContext()
  const result = await antiFraudService.updateTarget(enabledUser, '   ', {
    status: 'active',
  })

  assert.equal(result.error.code, 'TARGET_ID_REQUIRED')
  assert.equal(result.error.status, 400)
})

test('updateTarget should reject invalid status', async () => {
  const { antiFraudService } = createAntiFraudContext()
  const result = await antiFraudService.updateTarget(enabledUser, 'af-target-1', {
    status: 'paused',
  })

  assert.equal(result.error.code, 'TARGET_INVALID_STATUS')
  assert.equal(result.error.status, 400)
})

test('generateReport should reject invalid period type', async () => {
  const { antiFraudService } = createAntiFraudContext()
  const result = await antiFraudService.generateReport(enabledUser, {
    periodType: 'yearly',
  })

  assert.equal(result.error.code, 'REPORT_INVALID_PERIOD')
  assert.equal(result.error.status, 400)
})

test('createComplaint should reject invalid evidence ids', async () => {
  const { antiFraudService } = createAntiFraudContext({
    dataRepository: {
      listAntiFraudEvidencesByIds: async () => [
        {
          evidenceId: 'e1',
          capturedAt: new Date().toISOString(),
          violationPoints: ['绝对化承诺'],
        },
      ],
    },
  })

  const result = await antiFraudService.createComplaint(enabledUser, {
    scenario: 'false-health-promotion',
    evidenceIds: ['e1', 'e2'],
  })

  assert.equal(result.error.code, 'COMPLAINT_EVIDENCE_NOT_FOUND')
  assert.equal(result.error.status, 400)
})

test('createComplaint should reject unsupported scenario', async () => {
  const { antiFraudService } = createAntiFraudContext()
  const result = await antiFraudService.createComplaint(enabledUser, {
    scenario: 'fraud-call',
    evidenceIds: ['e1'],
  })

  assert.equal(result.error.code, 'COMPLAINT_INVALID_SCENARIO')
  assert.equal(result.error.status, 400)
})
