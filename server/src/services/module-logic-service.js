const DEFAULT_SCHEMA = {
  scenarios: ['standard'],
  inputHints: ['Describe target, current data, and expected output.'],
  samplePrompt: 'Provide business context and expected result.',
  metrics: [
    { key: 'quality', label: 'Quality', unit: '%', min: 45, max: 90 },
    { key: 'risk', label: 'Risk', unit: '', min: 10, max: 80 },
    { key: 'coverage', label: 'Coverage', unit: '%', min: 50, max: 95 },
  ],
}

const MODULE_PROFILES = {
  'invoice-recovery-archive': {
    scenarios: ['archive-cleanup', 'recovery-reminder', 'audit-check'],
    inputHints: ['Provide invoice volume, overdue amount, and filing period.'],
    samplePrompt: 'Summarize invoice filing quality and overdue recovery priorities.',
    metrics: [
      { key: 'archiveRate', label: 'Archive Rate', unit: '%', min: 50, max: 99 },
      { key: 'overdueInvoices', label: 'Overdue Invoices', unit: '', min: 0, max: 40 },
      { key: 'recoveryQueue', label: 'Recovery Queue', unit: '', min: 5, max: 60 },
    ],
    tags: ['finance', 'archive', 'recovery'],
  },
  'debt-evidence-manager': {
    scenarios: ['evidence-collection', 'timeline-rebuild', 'case-ready-pack'],
    inputHints: ['Describe debt amount, contract status, and missing evidence.'],
    samplePrompt: 'Build debt evidence chain and identify missing legal materials.',
    metrics: [
      { key: 'chainIntegrity', label: 'Chain Integrity', unit: '%', min: 40, max: 98 },
      { key: 'missingProofs', label: 'Missing Proofs', unit: '', min: 0, max: 18 },
      { key: 'caseReadiness', label: 'Case Readiness', unit: '%', min: 35, max: 96 },
    ],
    tags: ['legal', 'evidence'],
  },
  'enterprise-marketing-automation': {
    scenarios: ['funnel-optimization', 'campaign-orchestration', 'budget-review'],
    inputHints: ['Provide channels, budget, lead goals, and conversion target.'],
    samplePrompt: 'Optimize marketing funnel and channel investment.',
    metrics: [
      { key: 'conversionRate', label: 'Conversion Rate', unit: '%', min: 5, max: 45 },
      { key: 'roi', label: 'ROI', unit: '%', min: 35, max: 180 },
      { key: 'costPerLead', label: 'Cost per Lead', unit: '', min: 8, max: 160 },
    ],
    tags: ['marketing', 'automation'],
  },
  'public-opinion-monitoring': {
    scenarios: ['brand-watch', 'crisis-watch', 'response-sla'],
    inputHints: ['Provide monitor keywords and alert response requirements.'],
    samplePrompt: 'Track sentiment spikes and produce risk alerts.',
    metrics: [
      { key: 'negativeMentions', label: 'Negative Mentions', unit: '', min: 0, max: 140 },
      { key: 'crisisIndex', label: 'Crisis Index', unit: '', min: 5, max: 95 },
      { key: 'responseSla', label: 'Response SLA', unit: 'min', min: 8, max: 120 },
    ],
    tags: ['sentiment', 'brand'],
  },
  'lead-capture-followup': {
    scenarios: ['lead-collection', 'priority-followup', 'crm-sync'],
    inputHints: ['Provide lead channels, qualification rules, and follow-up SLA.'],
    samplePrompt: 'Capture leads and rank follow-up actions.',
    metrics: [
      { key: 'capturedLeads', label: 'Captured Leads', unit: '', min: 40, max: 1500 },
      { key: 'validLeadRate', label: 'Valid Lead Rate', unit: '%', min: 30, max: 95 },
      { key: 'onTimeFollowup', label: 'On-time Follow-up', unit: '%', min: 40, max: 99 },
    ],
    tags: ['lead', 'crm'],
  },
  'private-domain-operations': {
    scenarios: ['segmentation-run', 'retention-campaign', 'repurchase-boost'],
    inputHints: ['Provide segment strategy, touch cadence, and retention objective.'],
    samplePrompt: 'Run private-domain strategy and evaluate retention quality.',
    metrics: [
      { key: 'activeMembers', label: 'Active Members', unit: '', min: 180, max: 9000 },
      { key: 'repurchaseRate', label: 'Repurchase Rate', unit: '%', min: 8, max: 70 },
      { key: 'churnRiskUsers', label: 'Churn Risk Users', unit: '', min: 10, max: 1400 },
    ],
    tags: ['retention', 'crm'],
  },
  'competitor-monitoring': {
    scenarios: ['price-track', 'campaign-track', 'strategy-gap-analysis'],
    inputHints: ['Provide competitors and dimensions: price, campaign, content.'],
    samplePrompt: 'Monitor competitors and summarize strategic threats.',
    metrics: [
      { key: 'trackedCompetitors', label: 'Tracked Competitors', unit: '', min: 3, max: 45 },
      { key: 'priceEvents', label: 'Price Events', unit: '', min: 0, max: 60 },
      { key: 'threatLevel', label: 'Threat Level', unit: '', min: 8, max: 96 },
    ],
    tags: ['competitor', 'strategy'],
  },
  'data-retrospective-automation': {
    scenarios: ['weekly-retrospective', 'kpi-anomaly-review', 'action-closure-review'],
    inputHints: ['Provide KPI range and expected diagnosis/action output.'],
    samplePrompt: 'Generate retrospective insights and action closure plans.',
    metrics: [
      { key: 'datasetsMerged', label: 'Datasets Merged', unit: '', min: 4, max: 50 },
      { key: 'anomalyCount', label: 'Anomaly Count', unit: '', min: 0, max: 24 },
      { key: 'actionAdoption', label: 'Action Adoption', unit: '%', min: 25, max: 94 },
    ],
    tags: ['analytics', 'retrospective'],
  },
  'matchmaking-ai': {
    scenarios: ['profile-matching', 'candidate-refresh', 'constraint-balance'],
    inputHints: ['Provide preferences, constraints, and candidate requirements.'],
    samplePrompt: 'Match candidate pool and highlight best candidates.',
    metrics: [
      { key: 'candidatePool', label: 'Candidate Pool', unit: '', min: 20, max: 260 },
      { key: 'matchScore', label: 'Match Score', unit: '%', min: 35, max: 96 },
      { key: 'conflictFlags', label: 'Conflict Flags', unit: '', min: 0, max: 18 },
    ],
    tags: ['matching', 'personal'],
  },
  'product-health-check': {
    scenarios: ['listing-audit', 'compliance-scan', 'quality-risk-scan'],
    inputHints: ['Provide product listing details and quality/compliance concerns.'],
    samplePrompt: 'Run product health check and output risk priorities.',
    metrics: [
      { key: 'healthScore', label: 'Health Score', unit: '%', min: 30, max: 97 },
      { key: 'complianceRisks', label: 'Compliance Risks', unit: '', min: 0, max: 20 },
      { key: 'qualityRisks', label: 'Quality Risks', unit: '', min: 0, max: 24 },
    ],
    tags: ['product', 'quality'],
  },
  'anti-fraud-guardian': {
    scenarios: ['message-scan', 'transaction-risk-check', 'behavior-check'],
    inputHints: ['Provide suspicious messages, links, and transaction context.'],
    samplePrompt: 'Detect fraud patterns and output blocking recommendations.',
    metrics: [
      { key: 'eventsScanned', label: 'Events Scanned', unit: '', min: 6, max: 360 },
      { key: 'suspiciousEvents', label: 'Suspicious Events', unit: '', min: 0, max: 70 },
      { key: 'fraudRisk', label: 'Fraud Risk', unit: '', min: 8, max: 98 },
    ],
    tags: ['security', 'fraud'],
  },
  'personal-invoice-manager': {
    scenarios: ['invoice-classification', 'reimbursement-precheck', 'duplicate-detection'],
    inputHints: ['Provide invoice category and reimbursement expectations.'],
    samplePrompt: 'Classify invoices and precheck reimbursement risks.',
    metrics: [
      { key: 'classifiedInvoices', label: 'Classified Invoices', unit: '', min: 4, max: 280 },
      { key: 'reimbursable', label: 'Reimbursable', unit: '', min: 2, max: 220 },
      { key: 'duplicateRisk', label: 'Duplicate Risk', unit: '', min: 0, max: 24 },
    ],
    tags: ['invoice', 'personal'],
  },
  'teacher-knowledge-monetization': {
    scenarios: ['knowledge-indexing', 'draft-generation', 'submission-planning'],
    inputHints: ['Provide course materials and target publication channels.'],
    samplePrompt: 'Generate teaching drafts and monetization recommendations.',
    metrics: [
      { key: 'materialsIndexed', label: 'Materials Indexed', unit: '', min: 5, max: 520 },
      { key: 'draftCount', label: 'Draft Count', unit: '', min: 1, max: 40 },
      { key: 'channelFit', label: 'Channel Fit', unit: '%', min: 30, max: 95 },
    ],
    tags: ['teacher', 'content'],
  },
  'job-lead-capture': {
    scenarios: ['job-source-crawl', 'fit-ranking', 'submission-plan'],
    inputHints: ['Provide role filters, location, and priority constraints.'],
    samplePrompt: 'Collect high-fit jobs and output application queue.',
    metrics: [
      { key: 'jobsCollected', label: 'Jobs Collected', unit: '', min: 20, max: 1200 },
      { key: 'highFitJobs', label: 'High-fit Jobs', unit: '', min: 5, max: 380 },
      { key: 'expiryRisk', label: 'Expiry Risk', unit: '', min: 0, max: 90 },
    ],
    tags: ['career', 'job'],
  },
  'content-auto-publishing': {
    scenarios: ['topic-planning', 'multi-platform-generation', 'publish-scheduling'],
    inputHints: ['Provide audience, channels, frequency, and compliance constraints.'],
    samplePrompt: 'Generate and schedule multi-platform content pipeline.',
    metrics: [
      { key: 'contentsGenerated', label: 'Contents Generated', unit: '', min: 5, max: 300 },
      { key: 'platformCoverage', label: 'Platform Coverage', unit: '', min: 1, max: 8 },
      { key: 'complianceHits', label: 'Compliance Hits', unit: '', min: 0, max: 26 },
    ],
    tags: ['content', 'publishing'],
  },
}

function hashCode(text) {
  const source = String(text ?? '')
  let value = 0
  for (let i = 0; i < source.length; i += 1) value = (value * 31 + source.charCodeAt(i)) >>> 0
  return value
}

function hashInRange(seed, min, max) {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return lo + (hashCode(seed) % (hi - lo + 1))
}

function includesAny(text, words) {
  const source = String(text ?? '').toLowerCase()
  return words.some((word) => source.includes(String(word).toLowerCase()))
}

function toRisk(score) {
  if (score < 45) return 'high'
  if (score < 72) return 'medium'
  return 'low'
}

function normalizeScenario(raw, schema) {
  const value = String(raw ?? '').trim()
  if (!value) return schema.scenarios[0] ?? 'standard'
  return value.slice(0, 100)
}

function toSchema(profile) {
  const safe = profile ?? DEFAULT_SCHEMA
  return {
    scenarios: [...(safe.scenarios ?? DEFAULT_SCHEMA.scenarios)].slice(0, 8),
    inputHints: [...(safe.inputHints ?? DEFAULT_SCHEMA.inputHints)].slice(0, 8),
    samplePrompt: safe.samplePrompt ?? DEFAULT_SCHEMA.samplePrompt,
    metrics: [...(safe.metrics ?? DEFAULT_SCHEMA.metrics)].slice(0, 8).map((metric) => ({
      key: String(metric.key),
      label: String(metric.label),
      unit: String(metric.unit ?? ''),
    })),
  }
}

function generateMetrics(task, schema) {
  const seed = `${task.taskId}|${task.moduleKey}|${task.scenario}|${task.inputText}|${(task.attachments ?? []).join('|')}`
  return schema.metrics.map((metric) => {
    const profileMetric = (MODULE_PROFILES[task.moduleKey]?.metrics ?? DEFAULT_SCHEMA.metrics).find((item) => item.key === metric.key)
    const value = hashInRange(`${seed}|${metric.key}`, profileMetric?.min ?? 0, profileMetric?.max ?? 100)
    return { key: metric.key, label: metric.label, unit: metric.unit, value }
  })
}

function estimateScore(task, metrics) {
  const metricMap = Object.fromEntries(metrics.map((item) => [item.key, item.value]))
  const sizeBoost = Math.min(10, String(task.inputText ?? '').length / 60)
  let score = 60 + sizeBoost
  if (typeof metricMap.healthScore === 'number') score = metricMap.healthScore
  else if (typeof metricMap.matchScore === 'number') score = metricMap.matchScore - (metricMap.conflictFlags ?? 0) * 2
  else if (typeof metricMap.conversionRate === 'number') score = metricMap.conversionRate + (metricMap.roi ?? 0) / 4
  else if (typeof metricMap.chainIntegrity === 'number') score = (metricMap.chainIntegrity + (metricMap.caseReadiness ?? 0)) / 2
  else if (typeof metricMap.actionAdoption === 'number') score = metricMap.actionAdoption - (metricMap.anomalyCount ?? 0)
  else if (typeof metricMap.fraudRisk === 'number') score = 100 - metricMap.fraudRisk + (metricMap.eventsScanned ?? 0) / 20

  if (includesAny(task.inputText, ['urgent', 'critical', '危机', '高风险'])) score -= 8
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function createModuleLogicService() {
  function getSchema(moduleKey) {
    return toSchema(MODULE_PROFILES[moduleKey])
  }

  function getAllSchemas() {
    return Object.fromEntries(Object.keys(MODULE_PROFILES).map((key) => [key, getSchema(key)]))
  }

  function validateTaskInput(moduleKey, payload) {
    const schema = getSchema(moduleKey)
    const scenario = normalizeScenario(payload?.scenario, schema)
    const inputText = String(payload?.inputText ?? '').trim()
    const attachments = Array.isArray(payload?.attachments)
      ? payload.attachments.map((item) => String(item).trim()).filter(Boolean).slice(0, 10)
      : []
    const errors = []
    const warnings = []

    if (!inputText) errors.push('Input text is required.')
    if (inputText.length > 0 && inputText.length < 8) errors.push('Input text must be at least 8 characters.')
    if (inputText.length >= 8 && inputText.length < 24) warnings.push('Input is short; analysis confidence may be reduced.')

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      data: { scenario, inputText, attachments },
    }
  }

  function analyzeTask(task) {
    const schema = getSchema(task.moduleKey)
    const metrics = generateMetrics(task, schema)
    const score = estimateScore(task, metrics)
    const riskLevel = toRisk(score)
    const priority = riskLevel === 'high' ? 'high' : 'medium'
    const tags = [...(MODULE_PROFILES[task.moduleKey]?.tags ?? []), task.scenario].filter(Boolean).slice(0, 8)
    return {
      moduleKey: task.moduleKey,
      scenario: task.scenario,
      score,
      riskLevel,
      priority,
      summary: `Module ${task.moduleKey} completed scenario "${task.scenario}" with score ${score} and risk ${riskLevel}.`,
      findings: [
        `Generated ${metrics.length} business metric(s) for this module run.`,
        riskLevel === 'high'
          ? 'This run contains high-risk signals and should be reviewed by admin.'
          : 'No blocking risk found for this run.',
      ],
      recommendations: [
        'Use module settings to tighten rules for high-risk scenarios.',
        'Track trend of key metrics across weekly reports.',
      ],
      metricCards: metrics,
      tags,
    }
  }

  return {
    getSchema,
    getAllSchemas,
    validateTaskInput,
    analyzeTask,
  }
}
