const DEFAULT_BLUEPRINT = {
  projectName: '模块子后台',
  uniqueValue: '支持模块级任务、报告与规则配置闭环。',
  featureMenus: [
    {
      key: 'ops-overview',
      name: '业务概览',
      description: '查看当前模块核心运行状态与任务进展。',
      target: 'overview',
      keywords: ['overview', '概览'],
    },
  ],
  kpiDefinitions: [
    {
      key: 'successRate',
      label: '成功率',
      unit: '%',
      calc: 'successRate',
      target: 90,
      description: '模块任务执行成功比例。',
    },
  ],
}

export const moduleBlueprintMap = {
  'invoice-recovery-archive': {
    projectName: '发票追索与归档子后台',
    uniqueValue: '围绕票据归档、追索提醒与目录治理形成闭环。',
    featureMenus: [
      { key: 'invoice-tasks', name: '发票任务', description: '发票识别、校验与归档执行队列。', target: 'tasks', keywords: ['invoice', '发票', 'archive-cleanup'] },
      { key: 'archive-directory', name: '归档目录', description: '归档目录完整性与错票定位。', target: 'reports', keywords: ['archive', '归档', 'audit-check'] },
      { key: 'recovery-reminder', name: '追索提醒', description: '超期发票追索与催办提醒。', target: 'tasks', keywords: ['recovery', '追索', '逾期', 'reminder'] },
      { key: 'invoice-rules', name: '归档规则', description: '归档、追索、通知规则配置。', target: 'settings', keywords: ['rule', '规则'] },
    ],
    kpiDefinitions: [
      { key: 'archiveSuccessRate', label: '归档成功率', unit: '%', calc: 'successRate', target: 92, description: '发票归档流程一次完成比例。' },
      { key: 'overdueInvoices', label: '超期发票数', unit: '单', calc: 'pendingCount', target: 8, description: '待追索或超时未处理票据数量。' },
      { key: 'recoveryCompletionRate', label: '追索完成率', unit: '%', calc: 'completionRate', target: 88, description: '追索任务闭环完成比例。' },
    ],
  },
  'debt-evidence-manager': {
    projectName: '欠款证据管家子后台',
    uniqueValue: '强调证据链完整性、争议记录与案件可提交性。',
    featureMenus: [
      { key: 'evidence-chain-tasks', name: '证据链任务', description: '证据采集、拼接与校验流程。', target: 'tasks', keywords: ['evidence', '证据', 'timeline'] },
      { key: 'evidence-pack', name: '证据包', description: '按案件输出证据包与补证建议。', target: 'reports', keywords: ['pack', '证据包', 'case-ready'] },
      { key: 'dispute-log', name: '争议记录', description: '争议条目登记与人工复核。', target: 'tasks', keywords: ['争议', 'dispute', '冲突'] },
      { key: 'evidence-rules', name: '补证规则', description: '证据完整度阈值与失败信号配置。', target: 'settings', keywords: ['rule', '补证'] },
    ],
    kpiDefinitions: [
      { key: 'evidenceIntegrity', label: '证据完整率', unit: '%', calc: 'qualityScore', target: 90, description: '证据链关键节点覆盖程度。' },
      { key: 'highRiskCases', label: '高风险案件数', unit: '件', calc: 'riskCount', target: 5, description: '命中高风险信号的案件量。' },
      { key: 'supplementHours', label: '补证时效', unit: '小时', calc: 'efficiencyHours', target: 24, description: '从发现缺失到完成补证耗时。' },
    ],
  },
  'enterprise-marketing-automation': {
    projectName: '企业营销全自动子后台',
    uniqueValue: '覆盖场景开关、执行链路和复盘优化，强调 ROI。',
    featureMenus: [
      { key: 'scene-switch', name: '场景开关', description: '营销自动化场景启停与优先级管理。', target: 'settings', keywords: ['campaign', 'funnel', '场景'] },
      { key: 'campaign-tasks', name: '执行任务', description: '触达、投放与线索转化任务队列。', target: 'tasks', keywords: ['marketing', 'campaign', '线索'] },
      { key: 'retro-report', name: '复盘报告', description: '投放复盘、漏斗诊断与策略建议。', target: 'reports', keywords: ['roi', '复盘', 'budget-review'] },
      { key: 'strategy-rules', name: '策略规则', description: '预算阈值与风险信号策略配置。', target: 'settings', keywords: ['rule', '预算', '策略'] },
    ],
    kpiDefinitions: [
      { key: 'leadCount', label: '线索数', unit: '条', calc: 'activityCount', target: 300, description: '周期内自动化产出的有效线索数量。' },
      { key: 'conversionRate', label: '转化率', unit: '%', calc: 'conversionScore', target: 35, description: '营销漏斗转化比例。' },
      { key: 'roi', label: '投放 ROI', unit: '%', calc: 'roiScore', target: 120, description: '投放产出回报率。' },
    ],
  },
  'public-opinion-monitoring': {
    projectName: '企业舆情监控子后台',
    uniqueValue: '聚焦负面舆情识别、响应时效与处置闭环。',
    featureMenus: [
      { key: 'opinion-events', name: '舆情事件', description: '舆情事件聚合与来源追踪。', target: 'tasks', keywords: ['舆情', 'opinion', 'brand-watch'] },
      { key: 'alert-center', name: '告警中心', description: '高风险事件分级告警与通知。', target: 'tasks', keywords: ['alert', '危机', 'crisis'] },
      { key: 'disposal-review', name: '处置复盘', description: '舆情处置过程与复盘报告。', target: 'reports', keywords: ['响应', 'response', '复盘'] },
      { key: 'alert-rules', name: '预警规则', description: '风险词库与响应 SLA 配置。', target: 'settings', keywords: ['risk', 'SLA', '规则'] },
    ],
    kpiDefinitions: [
      { key: 'negativeEventCount', label: '负面事件数', unit: '条', calc: 'alertCount', target: 12, description: '周期内识别到的负面舆情数量。' },
      { key: 'responseMinutes', label: '响应时长', unit: '分钟', calc: 'responseMinutes', target: 30, description: '从告警到响应的平均耗时。' },
      { key: 'disposalCompletionRate', label: '处置完成率', unit: '%', calc: 'completionRate', target: 90, description: '舆情事件闭环处置比例。' },
    ],
  },
  'lead-capture-followup': {
    projectName: '企业线索抓取与跟进子后台',
    uniqueValue: '突出线索池治理、跟进时效与成交转化。',
    featureMenus: [
      { key: 'lead-pool', name: '线索池', description: '采集到的线索列表、去重与评分。', target: 'tasks', keywords: ['lead', '线索', 'collection'] },
      { key: 'followup-tasks', name: '跟进任务', description: '跟进提醒、SLA 与负责人分配。', target: 'tasks', keywords: ['followup', '跟进', 'priority'] },
      { key: 'result-analytics', name: '结果统计', description: '成交、流失与无效线索分析。', target: 'reports', keywords: ['成交', 'analytics', 'crm-sync'] },
      { key: 'lead-rules', name: '线索规则', description: '线索筛选与跟进规则配置。', target: 'settings', keywords: ['rule', 'qualification'] },
    ],
    kpiDefinitions: [
      { key: 'validLeadRate', label: '有效线索率', unit: '%', calc: 'qualityScore', target: 80, description: '符合筛选条件的线索占比。' },
      { key: 'followupSla', label: '跟进时效', unit: '小时', calc: 'efficiencyHours', target: 6, description: '线索分配到首次跟进耗时。' },
      { key: 'dealLeadRatio', label: '成交线索比', unit: '%', calc: 'conversionScore', target: 28, description: '最终成交线索占总体线索比。' },
    ],
  },
  'private-domain-operations': {
    projectName: '企业私域自动运营子后台',
    uniqueValue: '通过分层触达和复购分析驱动用户生命周期运营。',
    featureMenus: [
      { key: 'segment-center', name: '人群分层', description: '私域人群标签、分层策略与覆盖情况。', target: 'tasks', keywords: ['segmentation', '分层', '人群'] },
      { key: 'touch-task', name: '触达任务', description: '消息触达编排与发送执行。', target: 'tasks', keywords: ['touch', '触达', 'retention-campaign'] },
      { key: 'repurchase-analysis', name: '复购分析', description: '留存、复购与流失预警分析。', target: 'reports', keywords: ['repurchase', '复购', '留存'] },
      { key: 'operation-rules', name: '运营规则', description: '触达频次与策略规则配置。', target: 'settings', keywords: ['rule', '频次'] },
    ],
    kpiDefinitions: [
      { key: 'touchSuccessRate', label: '触达成功率', unit: '%', calc: 'successRate', target: 93, description: '触达任务成功执行比例。' },
      { key: 'retentionRate', label: '留存率', unit: '%', calc: 'qualityScore', target: 70, description: '私域用户持续活跃留存比例。' },
      { key: 'repurchaseRate', label: '复购率', unit: '%', calc: 'conversionScore', target: 40, description: '私域复购用户占比。' },
    ],
  },
  'competitor-monitoring': {
    projectName: '企业竞品监控子后台',
    uniqueValue: '提供竞品异动告警与价格策略对比。',
    featureMenus: [
      { key: 'competitor-watch', name: '竞品监测', description: '监测竞品活动、内容与策略变化。', target: 'tasks', keywords: ['competitor', '竞品', 'campaign-track'] },
      { key: 'price-strategy', name: '价格策略', description: '价格波动追踪与策略建议。', target: 'reports', keywords: ['price', '降价', 'price-track'] },
      { key: 'change-alert', name: '异动告警', description: '重点竞品异动实时告警。', target: 'tasks', keywords: ['alert', '异动', 'threat'] },
      { key: 'monitor-rules', name: '监控规则', description: '监测维度、阈值与通知配置。', target: 'settings', keywords: ['rule', '监控'] },
    ],
    kpiDefinitions: [
      { key: 'competitorChangeCount', label: '竞品异动次数', unit: '次', calc: 'alertCount', target: 10, description: '重点竞品异动命中次数。' },
      { key: 'priceFluctuationIndex', label: '价格波动指数', unit: '', calc: 'riskIndex', target: 35, description: '竞品价格变动敏感度指数。' },
      { key: 'responseHours', label: '响应时长', unit: '小时', calc: 'efficiencyHours', target: 8, description: '异动到应对动作耗时。' },
    ],
  },
  'data-retrospective-automation': {
    projectName: '企业数据复盘自动化子后台',
    uniqueValue: '自动生成异常洞察与周月报执行建议。',
    featureMenus: [
      { key: 'retrospective-tasks', name: '复盘任务', description: '按周/月执行数据复盘任务。', target: 'tasks', keywords: ['retrospective', '复盘', 'weekly'] },
      { key: 'anomaly-insight', name: '异常洞察', description: '识别异常指标与根因提示。', target: 'reports', keywords: ['anomaly', '异常', 'kpi'] },
      { key: 'report-export', name: '周月报导出', description: '导出结构化复盘报告。', target: 'reports', keywords: ['导出', 'report', 'closure'] },
      { key: 'retrospective-rules', name: '复盘规则', description: '指标口径、阈值与模板配置。', target: 'settings', keywords: ['rule', '口径'] },
    ],
    kpiDefinitions: [
      { key: 'anomalyRecognitionRate', label: '异常识别率', unit: '%', calc: 'qualityScore', target: 88, description: '异常信号识别准确比例。' },
      { key: 'retrospectiveCoverage', label: '复盘覆盖率', unit: '%', calc: 'coverageRate', target: 85, description: '纳入复盘的指标覆盖比例。' },
      { key: 'suggestionAdoptionRate', label: '建议执行率', unit: '%', calc: 'completionRate', target: 75, description: '复盘建议被执行的比例。' },
    ],
  },
  'matchmaking-ai': {
    projectName: '高学历相亲匹配子后台',
    uniqueValue: '强调候选匹配质量、资料完整度和响应效率。',
    featureMenus: [
      { key: 'match-tasks', name: '匹配任务', description: '偏好匹配、约束校验与推荐队列。', target: 'tasks', keywords: ['match', '匹配', 'profile-matching'] },
      { key: 'candidate-pool', name: '候选池', description: '候选人池刷新与质量评分。', target: 'users', keywords: ['candidate', '候选', 'refresh'] },
      { key: 'match-report', name: '匹配报告', description: '匹配结果解释与建议。', target: 'reports', keywords: ['report', '匹配报告', 'constraint'] },
      { key: 'match-rules', name: '匹配规则', description: '匹配权重、约束和审核规则。', target: 'settings', keywords: ['rule', '约束'] },
    ],
    kpiDefinitions: [
      { key: 'matchSuccessRate', label: '匹配成功率', unit: '%', calc: 'successRate', target: 85, description: '匹配任务达到标准比例。' },
      { key: 'profileCompleteness', label: '资料完整率', unit: '%', calc: 'coverageRate', target: 90, description: '会员资料字段完整度。' },
      { key: 'messageResponseRate', label: '消息响应率', unit: '%', calc: 'conversionScore', target: 72, description: '匹配后互动响应比例。' },
    ],
  },
  'product-health-check': {
    projectName: 'AI 商品体检子后台',
    uniqueValue: '聚焦风险项识别、整改闭环和复检通过。',
    featureMenus: [
      { key: 'health-tasks', name: '体检任务', description: '商品体检执行与结果回传。', target: 'tasks', keywords: ['health', '体检', 'listing-audit'] },
      { key: 'risk-items', name: '风险项', description: '高风险项清单与整改建议。', target: 'reports', keywords: ['risk', '违规', 'compliance'] },
      { key: 'health-report', name: '体检报告', description: '体检评分与整改跟踪报告。', target: 'reports', keywords: ['report', '质量', 'quality-risk'] },
      { key: 'health-rules', name: '体检规则', description: '风险词、阈值和审核规则配置。', target: 'settings', keywords: ['rule', '阈值'] },
    ],
    kpiDefinitions: [
      { key: 'highRiskRatio', label: '高风险项占比', unit: '%', calc: 'riskRate', target: 18, description: '高风险条目占全部风险条目比例。' },
      { key: 'rectificationRate', label: '整改完成率', unit: '%', calc: 'completionRate', target: 82, description: '整改任务完成比例。' },
      { key: 'recheckPassRate', label: '复检通过率', unit: '%', calc: 'successRate', target: 88, description: '复检任务通过比例。' },
    ],
  },
  'anti-fraud-guardian': {
    projectName: '个人反诈守护子后台',
    uniqueValue: '提供风险命中、拦截和误报治理能力。',
    featureMenus: [
      { key: 'risk-control-tasks', name: '风控任务', description: '风险检测、判定与告警流程。', target: 'tasks', keywords: ['fraud', '风控', 'message-scan'] },
      { key: 'risk-hit', name: '风险词命中', description: '风险词命中记录与溯源。', target: 'reports', keywords: ['风险词', '命中', 'transaction-risk'] },
      { key: 'warning-log', name: '预警记录', description: '预警通知、处置动作与回访。', target: 'tasks', keywords: ['预警', 'warning', 'behavior-check'] },
      { key: 'fraud-rules', name: '反诈规则', description: '风控阈值、拦截策略与通知配置。', target: 'settings', keywords: ['rule', '拦截'] },
    ],
    kpiDefinitions: [
      { key: 'riskHitRate', label: '风险命中率', unit: '%', calc: 'riskRate', target: 22, description: '风险信号命中占比。' },
      { key: 'interceptCount', label: '拦截次数', unit: '次', calc: 'alertCount', target: 15, description: '执行拦截动作次数。' },
      { key: 'falsePositiveRate', label: '误报率', unit: '%', calc: 'falsePositiveRate', target: 10, description: '误报信号占比。' },
    ],
  },
  'personal-invoice-manager': {
    projectName: '个人发票管理子后台',
    uniqueValue: '加强票据管理、报销预检与异常识别。',
    featureMenus: [
      { key: 'invoice-repo', name: '票据库', description: '个人票据归类与检索。', target: 'tasks', keywords: ['invoice', '票据', 'classification'] },
      { key: 'reimburse-list', name: '报销清单', description: '报销预检与提交跟踪。', target: 'reports', keywords: ['报销', 'reimbursement', 'precheck'] },
      { key: 'abnormal-invoice', name: '异常票据', description: '重复、抬头错误等异常识别。', target: 'tasks', keywords: ['异常', 'duplicate', '税号'] },
      { key: 'invoice-rules', name: '票据规则', description: '识别阈值与报销规则配置。', target: 'settings', keywords: ['rule', '报销规则'] },
    ],
    kpiDefinitions: [
      { key: 'invoiceRecognitionRate', label: '票据识别率', unit: '%', calc: 'successRate', target: 93, description: '票据识别与分类准确比例。' },
      { key: 'duplicateInvoices', label: '重复票据数', unit: '张', calc: 'riskCount', target: 4, description: '识别到的重复票据数量。' },
      { key: 'reimbursePassRate', label: '报销通过率', unit: '%', calc: 'completionRate', target: 90, description: '报销任务最终通过比例。' },
    ],
  },
  'teacher-knowledge-monetization': {
    projectName: '教师知识库投稿变现子后台',
    uniqueValue: '支持素材沉淀、投稿编排和收益追踪。',
    featureMenus: [
      { key: 'material-library', name: '素材库', description: '教学素材结构化管理与标签整理。', target: 'tasks', keywords: ['素材', 'knowledge', 'indexing'] },
      { key: 'submission-task', name: '投稿任务', description: '投稿草稿生成、审核与发布。', target: 'tasks', keywords: ['投稿', 'submission', 'draft-generation'] },
      { key: 'income-stats', name: '收益统计', description: '渠道收益与变现表现统计。', target: 'reports', keywords: ['收益', 'monetization', 'channel'] },
      { key: 'submission-rules', name: '投稿规则', description: '渠道要求、格式规范和提醒规则。', target: 'settings', keywords: ['rule', '渠道'] },
    ],
    kpiDefinitions: [
      { key: 'submissionPassRate', label: '投稿通过率', unit: '%', calc: 'successRate', target: 75, description: '投稿任务通过审核比例。' },
      { key: 'contentOutput', label: '内容产出量', unit: '篇', calc: 'activityCount', target: 40, description: '周期内内容产出数量。' },
      { key: 'monetizationRate', label: '变现转化率', unit: '%', calc: 'conversionScore', target: 30, description: '内容变现转化比例。' },
    ],
  },
  'job-lead-capture': {
    projectName: '个人求职线索子后台',
    uniqueValue: '聚焦岗位线索匹配、投递执行和反馈追踪。',
    featureMenus: [
      { key: 'job-leads', name: '岗位线索', description: '岗位抓取、去重和匹配评分。', target: 'tasks', keywords: ['job', '岗位', 'job-source-crawl'] },
      { key: 'submission-tasks', name: '投递任务', description: '简历投递编排与进度跟踪。', target: 'tasks', keywords: ['投递', 'submission', 'fit-ranking'] },
      { key: 'feedback-track', name: '反馈追踪', description: '面试反馈、状态更新与提醒。', target: 'reports', keywords: ['反馈', '面试', 'plan'] },
      { key: 'job-rules', name: '匹配规则', description: '职位筛选条件与投递频次规则。', target: 'settings', keywords: ['rule', 'location', 'priority'] },
    ],
    kpiDefinitions: [
      { key: 'leadMatchScore', label: '线索匹配度', unit: '%', calc: 'qualityScore', target: 82, description: '岗位与用户条件匹配程度。' },
      { key: 'deliverySuccessRate', label: '投递成功率', unit: '%', calc: 'successRate', target: 86, description: '投递任务成功提交比例。' },
      { key: 'interviewConversionRate', label: '面试转化率', unit: '%', calc: 'conversionScore', target: 26, description: '投递到面试环节转化比例。' },
    ],
  },
  'content-auto-publishing': {
    projectName: '内容自动生成发布子后台',
    uniqueValue: '覆盖内容生成、发布队列和平台表现追踪。',
    featureMenus: [
      { key: 'generation-tasks', name: '生成任务', description: '内容生成批次与审核流程。', target: 'tasks', keywords: ['content', '生成', 'topic-planning'] },
      { key: 'publish-queue', name: '发布队列', description: '多平台发布编排和冲突处理。', target: 'tasks', keywords: ['publish', '队列', 'scheduling'] },
      { key: 'platform-data', name: '平台数据', description: '互动、触达和内容复用分析。', target: 'reports', keywords: ['平台', '互动', 'coverage'] },
      { key: 'publish-rules', name: '发布规则', description: '平台规范、频率与合规规则。', target: 'settings', keywords: ['rule', 'compliance'] },
    ],
    kpiDefinitions: [
      { key: 'publishSuccessRate', label: '发布成功率', unit: '%', calc: 'successRate', target: 92, description: '发布任务成功执行比例。' },
      { key: 'engagementRate', label: '互动率', unit: '%', calc: 'conversionScore', target: 35, description: '内容发布后互动反馈比例。' },
      { key: 'contentReuseRate', label: '内容复用率', unit: '%', calc: 'coverageRate', target: 68, description: '内容跨平台复用覆盖比例。' },
    ],
  },
}

function toSafeFeature(feature, index) {
  return {
    key: String(feature?.key || `feature-${index + 1}`),
    name: String(feature?.name || `子功能 ${index + 1}`),
    description: String(feature?.description || '查看该子功能数据。'),
    target: ['overview', 'tasks', 'users', 'reports', 'settings'].includes(String(feature?.target))
      ? String(feature.target)
      : 'overview',
    keywords: Array.isArray(feature?.keywords)
      ? feature.keywords.map((item) => String(item).trim()).filter(Boolean).slice(0, 20)
      : [],
  }
}

function toSafeKpi(def, index) {
  return {
    key: String(def?.key || `kpi-${index + 1}`),
    label: String(def?.label || `指标 ${index + 1}`),
    unit: String(def?.unit || ''),
    calc: String(def?.calc || 'successRate'),
    target: Number.isFinite(Number(def?.target)) ? Number(def.target) : null,
    description: String(def?.description || ''),
  }
}

export function getModuleBlueprint(moduleKey) {
  const raw = moduleBlueprintMap[moduleKey] || DEFAULT_BLUEPRINT
  return {
    projectName: String(raw.projectName || DEFAULT_BLUEPRINT.projectName),
    uniqueValue: String(raw.uniqueValue || DEFAULT_BLUEPRINT.uniqueValue),
    featureMenus: (Array.isArray(raw.featureMenus) ? raw.featureMenus : DEFAULT_BLUEPRINT.featureMenus)
      .slice(0, 8)
      .map((item, idx) => toSafeFeature(item, idx)),
    kpiDefinitions: (Array.isArray(raw.kpiDefinitions) ? raw.kpiDefinitions : DEFAULT_BLUEPRINT.kpiDefinitions)
      .slice(0, 6)
      .map((item, idx) => toSafeKpi(item, idx)),
  }
}

function includesAnyKeyword(text, keywords = []) {
  const source = String(text ?? '').toLowerCase()
  const safeKeywords = Array.isArray(keywords)
    ? keywords.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
    : []
  if (!safeKeywords.length) return false
  return safeKeywords.some((item) => source.includes(item))
}

export function getMatchedFeatureMenus(moduleKey, task = {}) {
  const blueprint = getModuleBlueprint(moduleKey)
  const featureMenus = blueprint.featureMenus ?? []
  const source = `${task.scenario ?? ''} ${task.inputText ?? ''} ${task.summary ?? ''}`
  const matched = featureMenus.filter((feature) => includesAnyKeyword(source, feature.keywords))
  if (matched.length > 0) return matched
  return featureMenus.slice(0, 1)
}

