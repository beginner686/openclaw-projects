import { randomBytes } from 'node:crypto'

const PLAN_CATALOG = [
  {
    planCode: 'basic',
    planName: '基础版',
    monthlyPrice: 99,
    maxTargets: 1,
    reportFrequency: 'weekly',
    realtimeAlerts: false,
    productScreening: false,
    complaintQuotaMonth: 2,
  },
  {
    planCode: 'standard',
    planName: '标准版',
    monthlyPrice: 199,
    maxTargets: 2,
    reportFrequency: 'daily',
    realtimeAlerts: true,
    productScreening: true,
    complaintQuotaMonth: 6,
  },
  {
    planCode: 'enterprise',
    planName: '企业版',
    monthlyPrice: 599,
    maxTargets: 20,
    reportFrequency: 'daily',
    realtimeAlerts: true,
    productScreening: true,
    complaintQuotaMonth: 30,
  },
]

const RISK_RULES = [
  { pattern: /包治百病|保证治好|根治|药到病除/gi, tag: '绝对化承诺', score: 35 },
  { pattern: /不用吃药|停药也行|医院没法治|医生都不懂/gi, tag: '替代正规治疗', score: 30 },
  { pattern: /降压|降糖|溶栓|通血管|逆转慢病/gi, tag: '医疗功效暗示', score: 18 },
  { pattern: /所有医生都不知道的秘密|内部秘方|祖传神方/gi, tag: '假权威话术', score: 20 },
  { pattern: /错过今天就晚了|不买会后悔|现在不买就来不及/gi, tag: '焦虑诱导', score: 12 },
]

const TARGET_TYPES = new Set(['short-video-account', 'live-room', 'anchor'])
const TARGET_STATUSES = new Set(['active', 'inactive'])
const PERIOD_TYPES = new Set(['weekly', 'monthly'])
const COMPLAINT_SCENARIOS = new Set(['false-health-promotion', 'induced-purchase'])

function fail(status, code, message) {
  return { error: { status, code, message } }
}

function nowIso(offsetHours = 0) {
  return new Date(Date.now() + offsetHours * 60 * 60 * 1000).toISOString()
}

function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`
}

function readBoundedInt(payload, key, { min, max, fallback, code, label }) {
  const hasValue = Object.prototype.hasOwnProperty.call(payload ?? {}, key)
  if (!hasValue || payload?.[key] === undefined || payload?.[key] === null || payload?.[key] === '') {
    return { value: fallback }
  }

  const raw = Number(payload[key])
  if (!Number.isFinite(raw)) {
    return { error: fail(400, code, `${label}格式不正确。`) }
  }
  const value = Math.floor(raw)
  if (value < min || value > max) {
    return { error: fail(400, code, `${label}需在 ${min}-${max} 之间。`) }
  }
  return { value }
}

function readTrimmedText(payload, key, maxLength = 200) {
  return String(payload?.[key] ?? '')
    .trim()
    .slice(0, maxLength)
}

function monthRangeOf(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

function periodRange(periodType) {
  const now = new Date()
  if (periodType === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start: start.toISOString(), end: now.toISOString() }
  }
  const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
  return { start: start.toISOString(), end: now.toISOString() }
}

function analyzeContent(contentText) {
  const input = String(contentText ?? '').trim()
  const hitPhrases = []
  const riskTags = new Set()
  let score = 0

  for (const rule of RISK_RULES) {
    const matches = [...input.matchAll(rule.pattern)].map((item) => item[0])
    if (matches.length) {
      riskTags.add(rule.tag)
      score += rule.score + Math.min(8, matches.length * 2)
      for (const hit of matches) {
        hitPhrases.push(hit)
      }
    }
  }

  const normalizedScore = Math.min(100, score)
  let riskLevel = 'low'
  if (normalizedScore >= 70) {
    riskLevel = 'high'
  } else if (normalizedScore >= 40) {
    riskLevel = 'medium'
  }

  const dedupHits = [...new Set(hitPhrases)].slice(0, 12)
  const dedupTags = [...riskTags]

  const summary =
    riskLevel === 'high'
      ? '检测到高风险健康宣传内容，建议立即停止下单并保存证据。'
      : riskLevel === 'medium'
        ? '检测到中风险夸大或诱导话术，建议谨慎核验来源后再决策。'
        : '内容风险较低，仍建议保持理性消费并持续观察。'

  const safeAdvice =
    '本系统仅提供风险提示与证据整理，不提供医疗诊断或用药建议。涉及健康问题请咨询持证医生。'

  return {
    riskLevel,
    riskScore: normalizedScore,
    hitPhrases: dedupHits,
    riskTags: dedupTags.length ? dedupTags : ['客观内容'],
    summary,
    safeAdvice,
  }
}

export function createAntiFraudService({ dataRepository }) {
  function assertModuleAccess(user) {
    if (!user.enabledModules.includes('anti-fraud-guardian')) {
      return fail(403, 'MODULE_FORBIDDEN', '当前账号未开通全域反诈守护。')
    }
    return null
  }

  function getPlanByCode(planCode) {
    return PLAN_CATALOG.find((item) => item.planCode === planCode) ?? null
  }

  async function ensureSubscription(user) {
    const existing = await dataRepository.getAntiFraudSubscription(user.id)
    if (existing) {
      return existing
    }

    const basicPlan = getPlanByCode('basic')
    return dataRepository.upsertAntiFraudSubscription(user.id, {
      planCode: basicPlan.planCode,
      planName: basicPlan.planName,
      status: 'active',
      startsAt: nowIso(-24),
      expiresAt: nowIso(24 * 30),
      maxTargets: basicPlan.maxTargets,
      reportFrequency: basicPlan.reportFrequency,
      realtimeAlerts: basicPlan.realtimeAlerts,
      productScreening: basicPlan.productScreening,
      complaintQuotaMonth: basicPlan.complaintQuotaMonth,
    })
  }

  function isSubscriptionActive(subscription) {
    return subscription.status === 'active' && new Date(subscription.expiresAt).getTime() > Date.now()
  }

  async function getUsage(user, subscription) {
    const targetCount = await dataRepository.countActiveAntiFraudTargets(user.id)
    const evidences = await dataRepository.listAntiFraudEvidences(user.id, 500)
    const { start, end } = monthRangeOf()
    const complaintsUsed = await dataRepository.countAntiFraudComplaintsBetween(user.id, start, end)
    return {
      targetCount,
      targetQuota: subscription.maxTargets,
      complaintUsed: complaintsUsed,
      complaintQuota: subscription.complaintQuotaMonth,
      evidenceCount: evidences.length,
      complaintRemaining: Math.max(0, subscription.complaintQuotaMonth - complaintsUsed),
    }
  }

  async function getDashboard(user) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const subscription = await ensureSubscription(user)
    const scans = await dataRepository.listAntiFraudScans(user.id, 100)
    const evidences = await dataRepository.listAntiFraudEvidences(user.id, 100)
    const reports = await dataRepository.listAntiFraudReports(user.id, 30)
    const complaints = await dataRepository.listAntiFraudComplaints(user.id, 30)
    const targets = await dataRepository.listAntiFraudTargets(user.id)

    const highRisk = scans.filter((item) => item.riskLevel === 'high').length
    const mediumRisk = scans.filter((item) => item.riskLevel === 'medium').length

    return {
      data: {
        subscription,
        usage: await getUsage(user, subscription),
        stats: {
          targets: targets.length,
          scans: scans.length,
          highRisk,
          mediumRisk,
          evidences: evidences.length,
          reports: reports.length,
          complaints: complaints.length,
        },
        latestRisks: scans.slice(0, 6),
        latestEvidences: evidences.slice(0, 6),
        latestReports: reports.slice(0, 6),
      },
    }
  }

  async function listPlans() {
    return { data: PLAN_CATALOG }
  }

  async function getMySubscription(user) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const subscription = await ensureSubscription(user)
    const usage = await getUsage(user, subscription)
    return { data: { subscription, usage } }
  }

  async function activateSubscription(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const planCode = String(payload?.planCode ?? '').trim()
    const monthsResult = readBoundedInt(payload, 'months', {
      min: 1,
      max: 24,
      fallback: 1,
      code: 'PLAN_INVALID_MONTHS',
      label: '订阅月数',
    })
    if (monthsResult.error) return monthsResult.error
    const months = monthsResult.value
    const plan = getPlanByCode(planCode)
    if (!plan) {
      return fail(400, 'PLAN_NOT_FOUND', '套餐不存在。')
    }

    const startsAt = nowIso(0)
    const expiresAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString()
    const subscription = await dataRepository.upsertAntiFraudSubscription(user.id, {
      planCode: plan.planCode,
      planName: plan.planName,
      status: 'active',
      startsAt,
      expiresAt,
      maxTargets: plan.maxTargets,
      reportFrequency: plan.reportFrequency,
      realtimeAlerts: plan.realtimeAlerts,
      productScreening: plan.productScreening,
      complaintQuotaMonth: plan.complaintQuotaMonth,
    })

    return { data: subscription }
  }

  async function listTargets(user) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const targets = await dataRepository.listAntiFraudTargets(user.id)
    return { data: targets }
  }

  async function createTarget(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const subscription = await ensureSubscription(user)
    if (!isSubscriptionActive(subscription)) {
      return fail(403, 'PLAN_INACTIVE', '当前套餐未激活，请先续期或升级。')
    }

    const activeTargets = await dataRepository.countActiveAntiFraudTargets(user.id)
    if (activeTargets >= subscription.maxTargets) {
      return fail(403, 'TARGET_QUOTA_EXCEEDED', `当前套餐最多监测 ${subscription.maxTargets} 个对象。`)
    }

    const anchorName = readTrimmedText(payload, 'anchorName', 80)
    const accountHandle = readTrimmedText(payload, 'accountHandle', 80)
    const targetType = readTrimmedText(payload, 'targetType', 40) || 'short-video-account'
    const platform = readTrimmedText(payload, 'platform', 40) || 'unknown'

    if (!anchorName || !accountHandle) {
      return fail(400, 'TARGET_INVALID_PAYLOAD', '请填写监测对象名称与账号标识。')
    }
    if (!TARGET_TYPES.has(targetType)) {
      return fail(400, 'TARGET_INVALID_TYPE', '监测对象类型不支持。')
    }

    const target = await dataRepository.createAntiFraudTarget({
      targetId: generateId('af-target'),
      ownerId: user.id,
      targetType,
      platform,
      anchorName,
      accountHandle,
      roomLink: readTrimmedText(payload, 'roomLink', 500),
      notes: readTrimmedText(payload, 'notes', 500),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return { data: target }
  }

  async function updateTarget(user, targetId, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const safeTargetId = String(targetId ?? '').trim()
    if (!safeTargetId) {
      return fail(400, 'TARGET_ID_REQUIRED', '监测对象ID不能为空。')
    }

    const nextPayload = {}
    const targetType = readTrimmedText(payload, 'targetType', 40)
    if (targetType) {
      if (!TARGET_TYPES.has(targetType)) {
        return fail(400, 'TARGET_INVALID_TYPE', '监测对象类型不支持。')
      }
      nextPayload.targetType = targetType
    }

    const platform = readTrimmedText(payload, 'platform', 40)
    if (platform) nextPayload.platform = platform

    const anchorName = readTrimmedText(payload, 'anchorName', 80)
    if (anchorName) nextPayload.anchorName = anchorName

    const accountHandle = readTrimmedText(payload, 'accountHandle', 80)
    if (accountHandle) nextPayload.accountHandle = accountHandle

    if (Object.prototype.hasOwnProperty.call(payload ?? {}, 'roomLink')) {
      nextPayload.roomLink = readTrimmedText(payload, 'roomLink', 500)
    }
    if (Object.prototype.hasOwnProperty.call(payload ?? {}, 'notes')) {
      nextPayload.notes = readTrimmedText(payload, 'notes', 500)
    }
    if (Object.prototype.hasOwnProperty.call(payload ?? {}, 'status')) {
      const status = readTrimmedText(payload, 'status', 20)
      if (!TARGET_STATUSES.has(status)) {
        return fail(400, 'TARGET_INVALID_STATUS', '监测对象状态不支持。')
      }
      nextPayload.status = status
    }

    if (!Object.keys(nextPayload).length) {
      return fail(400, 'TARGET_EMPTY_UPDATE', '未提供可更新字段。')
    }

    const updated = await dataRepository.updateAntiFraudTarget(user.id, safeTargetId, nextPayload)
    if (!updated) {
      return fail(404, 'TARGET_NOT_FOUND', '监测对象不存在。')
    }
    return { data: updated }
  }

  async function removeTarget(user, targetId) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const safeTargetId = String(targetId ?? '').trim()
    if (!safeTargetId) {
      return fail(400, 'TARGET_ID_REQUIRED', '监测对象ID不能为空。')
    }

    const existing = await dataRepository.findAntiFraudTargetById(user.id, safeTargetId)
    if (!existing) {
      return fail(404, 'TARGET_NOT_FOUND', '监测对象不存在。')
    }
    await dataRepository.removeAntiFraudTarget(user.id, safeTargetId)
    return { data: { success: true } }
  }

  async function runScan(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const subscription = await ensureSubscription(user)
    if (!isSubscriptionActive(subscription)) {
      return fail(403, 'PLAN_INACTIVE', '当前套餐未激活，请先续期或升级。')
    }

    const sourceTitle = readTrimmedText(payload, 'sourceTitle', 120)
    const contentText = readTrimmedText(payload, 'contentText', 5000)
    const sourceLink = readTrimmedText(payload, 'sourceLink', 500)
    const targetId = readTrimmedText(payload, 'targetId', 128)

    if (!sourceTitle || !contentText) {
      return fail(400, 'SCAN_INVALID_PAYLOAD', '请填写内容标题与文本内容。')
    }

    if (targetId) {
      const target = await dataRepository.findAntiFraudTargetById(user.id, targetId)
      if (!target) {
        return fail(404, 'TARGET_NOT_FOUND', '监测对象不存在或无权限。')
      }
    }

    const analyzed = analyzeContent(contentText)
    const scan = await dataRepository.createAntiFraudScan({
      scanId: generateId('af-scan'),
      ownerId: user.id,
      targetId,
      sourceTitle,
      sourceLink,
      contentText,
      riskLevel: analyzed.riskLevel,
      riskScore: analyzed.riskScore,
      riskTags: analyzed.riskTags,
      hitPhrases: analyzed.hitPhrases,
      summary: analyzed.summary,
      safeAdvice: analyzed.safeAdvice,
      createdAt: new Date().toISOString(),
    })

    let evidence = null
    if (analyzed.riskLevel !== 'low') {
      evidence = await dataRepository.createAntiFraudEvidence({
        evidenceId: generateId('af-evidence'),
        ownerId: user.id,
        scanId: scan.scanId,
        targetId,
        sourceLink,
        capturedAt: new Date().toISOString(),
        violationPoints: analyzed.hitPhrases.length ? analyzed.hitPhrases : analyzed.riskTags,
        snapshotText: `标题：${sourceTitle}\n命中点：${(analyzed.hitPhrases.length ? analyzed.hitPhrases : analyzed.riskTags).join('、')}`,
        status: 'archived',
        createdAt: new Date().toISOString(),
      })
    }

    return {
      data: {
        scan,
        evidence,
        notice:
          analyzed.riskLevel === 'high'
            ? '已识别高风险内容并自动生成证据，请及时提醒家人避免购买。'
            : analyzed.riskLevel === 'medium'
              ? '已识别中风险内容并归档证据，建议持续观察。'
              : '内容风险较低，已记录扫描结果。',
      },
    }
  }

  async function listScans(user) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const scans = await dataRepository.listAntiFraudScans(user.id, 100)
    return { data: scans }
  }

  async function listEvidences(user) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const evidences = await dataRepository.listAntiFraudEvidences(user.id, 200)
    return { data: evidences }
  }

  async function getEvidence(user, evidenceId) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const safeEvidenceId = String(evidenceId ?? '').trim()
    if (!safeEvidenceId) {
      return fail(400, 'EVIDENCE_ID_REQUIRED', '证据ID不能为空。')
    }

    const evidence = await dataRepository.findAntiFraudEvidence(user.id, safeEvidenceId)
    if (!evidence) {
      return fail(404, 'EVIDENCE_NOT_FOUND', '证据不存在。')
    }
    return { data: evidence }
  }

  async function generateReport(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const subscription = await ensureSubscription(user)
    if (!isSubscriptionActive(subscription)) {
      return fail(403, 'PLAN_INACTIVE', '当前套餐未激活，请先续期或升级。')
    }

    const periodTypeRaw = String(payload?.periodType ?? 'weekly').trim() || 'weekly'
    if (!PERIOD_TYPES.has(periodTypeRaw)) {
      return fail(400, 'REPORT_INVALID_PERIOD', '报告周期仅支持 weekly 或 monthly。')
    }
    const periodType = periodTypeRaw
    const period = periodRange(periodType)
    const scans = await dataRepository.listAntiFraudScansBetween(user.id, period.start, period.end, 500)
    const highRiskItems = scans
      .filter((item) => item.riskLevel === 'high' || item.riskLevel === 'medium')
      .map((item) => ({
        scanId: item.scanId,
        sourceTitle: item.sourceTitle,
        riskLevel: item.riskLevel,
        hitPhrases: item.hitPhrases,
      }))
      .slice(0, 50)
    const safeItems = scans
      .filter((item) => item.riskLevel === 'low')
      .map((item) => ({
        scanId: item.scanId,
        sourceTitle: item.sourceTitle,
      }))
      .slice(0, 50)

    const report = await dataRepository.createAntiFraudReport({
      reportId: generateId('af-report'),
      ownerId: user.id,
      periodType,
      periodStart: period.start,
      periodEnd: period.end,
      overview: {
        totalScanned: scans.length,
        highRiskCount: scans.filter((item) => item.riskLevel === 'high').length,
        mediumRiskCount: scans.filter((item) => item.riskLevel === 'medium').length,
        lowRiskCount: scans.filter((item) => item.riskLevel === 'low').length,
      },
      highRiskItems,
      safeItems,
      recommendations: [
        '优先屏蔽高风险账号与直播间，减少重复暴露。',
        '遇到功效承诺与恐吓营销时，先停下单并保存证据。',
        '对家人进行“先核验、后决策”的防骗提醒。',
      ],
      createdAt: new Date().toISOString(),
    })

    return { data: report }
  }

  async function listReports(user) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const reports = await dataRepository.listAntiFraudReports(user.id, 50)
    return { data: reports }
  }

  async function createComplaint(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const subscription = await ensureSubscription(user)
    if (!isSubscriptionActive(subscription)) {
      return fail(403, 'PLAN_INACTIVE', '当前套餐未激活，请先续期或升级。')
    }

    const { start, end } = monthRangeOf()
    const used = await dataRepository.countAntiFraudComplaintsBetween(user.id, start, end)
    if (used >= subscription.complaintQuotaMonth) {
      return fail(403, 'COMPLAINT_QUOTA_EXCEEDED', '本月投诉材料次数已达上限，请升级套餐或下月再试。')
    }

    const evidenceIdsRaw = Array.isArray(payload?.evidenceIds) ? payload.evidenceIds : []
    const evidenceIds = [...new Set(evidenceIdsRaw.map((item) => String(item).trim()).filter(Boolean))].slice(0, 20)
    if (!evidenceIds.length) {
      return fail(400, 'COMPLAINT_EVIDENCE_REQUIRED', '请至少选择一条证据记录。')
    }
    const evidences = await dataRepository.listAntiFraudEvidencesByIds(user.id, evidenceIds)
    if (!evidences.length) {
      return fail(400, 'COMPLAINT_EVIDENCE_REQUIRED', '请至少选择一条证据记录。')
    }
    if (evidences.length !== evidenceIds.length) {
      return fail(400, 'COMPLAINT_EVIDENCE_NOT_FOUND', '存在无效证据ID，请刷新后重试。')
    }

    const scenario = readTrimmedText(payload, 'scenario', 40) || 'false-health-promotion'
    if (!COMPLAINT_SCENARIOS.has(scenario)) {
      return fail(400, 'COMPLAINT_INVALID_SCENARIO', '投诉场景不支持。')
    }
    const transactionNotes = readTrimmedText(payload, 'transactionNotes', 1000)
    const factsSummary = readTrimmedText(payload, 'factsSummary', 2000)

    const evidenceLines = evidences
      .map((item, index) => `${index + 1}. 证据ID ${item.evidenceId}，采集时间 ${item.capturedAt}，命中点：${item.violationPoints.join('、')}`)
      .join('\n')

    const generatedText = [
      '【投诉请求】',
      '本人提交以下事实材料，请求平台/监管部门核查相关账号的疑似虚假健康宣传及诱导消费行为。',
      '',
      '【事实概述】',
      factsSummary || '在浏览健康类短视频/直播过程中，发现账号存在夸大功效、替代正规治疗等高风险表述。',
      '',
      '【交易与接触记录】',
      transactionNotes || '已保留直播/短视频访问记录及相关互动信息。',
      '',
      '【证据清单】',
      evidenceLines,
      '',
      '【诉求】',
      '1) 核查相关宣传是否存在违规；2) 下架违规内容并限制传播；3) 协助处理消费纠纷（如适用）。',
      '',
      '本材料由系统自动整理，仅陈述事实，不包含诊断、治疗或药品推荐内容。',
    ].join('\n')

    const complaint = await dataRepository.createAntiFraudComplaint({
      complaintId: generateId('af-complaint'),
      ownerId: user.id,
      status: 'ready',
      scenario,
      evidenceIds: evidences.map((item) => item.evidenceId),
      transactionNotes,
      factsSummary,
      generatedText,
      channelSuggestions: ['12315', '平台举报', '消费者协会'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return { data: complaint }
  }

  async function listComplaints(user) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const complaints = await dataRepository.listAntiFraudComplaints(user.id, 100)
    return { data: complaints }
  }

  async function getComplaint(user, complaintId) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const safeComplaintId = String(complaintId ?? '').trim()
    if (!safeComplaintId) {
      return fail(400, 'COMPLAINT_ID_REQUIRED', '投诉材料ID不能为空。')
    }

    const complaint = await dataRepository.findAntiFraudComplaint(user.id, safeComplaintId)
    if (!complaint) {
      return fail(404, 'COMPLAINT_NOT_FOUND', '投诉材料不存在。')
    }
    return { data: complaint }
  }

  return {
    listPlans,
    getMySubscription,
    activateSubscription,
    getDashboard,
    listTargets,
    createTarget,
    updateTarget,
    removeTarget,
    listScans,
    runScan,
    listEvidences,
    getEvidence,
    listReports,
    generateReport,
    listComplaints,
    createComplaint,
    getComplaint,
  }
}
