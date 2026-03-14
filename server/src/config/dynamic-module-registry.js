import { moduleCatalog, moduleExecutionRules } from './catalog.js'
import { moduleBlueprintMap } from './module-blueprints.js'

const FEATURE_TARGETS = ['overview', 'tasks', 'users', 'reports', 'settings']
const STATUS_VALUES = ['active', 'beta', 'coming_soon']
const ICON_VALUES = [
  'Tickets',
  'DocumentChecked',
  'TrendCharts',
  'Bell',
  'Search',
  'Connection',
  'Histogram',
  'DataLine',
  'User',
  'Camera',
  'Lock',
  'Document',
  'Reading',
  'Briefcase',
  'EditPen',
  'Grid',
  'Tools',
  'Monitor',
]

function normalizeText(value, fallback = '', max = 500) {
  const text = String(value ?? '').trim()
  if (!text) return fallback
  return text.slice(0, max)
}

function dedupeArray(values = []) {
  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))]
}

function toModuleKey(input) {
  const source = String(input ?? '').trim()
  const raw = source
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (raw) return raw.slice(0, 80)
  if (source) {
    let hash = 5381
    for (const ch of source) {
      hash = ((hash << 5) + hash + ch.charCodeAt(0)) >>> 0
    }
    return `module-${hash.toString(36)}`
  }
  return `module-${Date.now().toString(36)}`
}

function inferCategory(category, docText) {
  const c = String(category ?? '').trim().toLowerCase()
  if (c === 'enterprise' || c === 'personal') return c
  const text = String(docText ?? '')
  if (/个人|求职|相亲|反诈|发票管理|内容/.test(text)) return 'personal'
  return 'enterprise'
}

function inferStatus(status) {
  const value = String(status ?? '').trim().toLowerCase()
  if (STATUS_VALUES.includes(value)) return value
  return 'beta'
}

function inferIcon(icon, category) {
  const value = String(icon ?? '').trim()
  if (ICON_VALUES.includes(value)) return value
  return category === 'enterprise' ? 'Tools' : 'Grid'
}

function pickSummary(docText) {
  const lines = String(docText ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
  const preferred = lines.find((line) => line.length >= 14 && line.length <= 120)
  return preferred ? preferred.slice(0, 200) : '基于设计文档自动生成的子模块后台。'
}

function splitDocLines(docText) {
  return String(docText ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function extractFeatureNames(docText) {
  const lines = splitDocLines(docText)
  const names = []
  for (const line of lines) {
    const m = line.match(/^(?:[-*•]|[0-9]{1,2}[.)、])\s*(.+)$/)
    if (!m) continue
    const value = m[1].replace(/（.*?）/g, '').trim()
    if (!value || value.length < 2) continue
    names.push(value.slice(0, 30))
    if (names.length >= 8) break
  }
  if (names.length) return dedupeArray(names)

  const fallback = lines
    .filter((line) => line.length >= 4 && line.length <= 24)
    .slice(0, 4)
  return dedupeArray(fallback)
}

function toFeatureKey(name, index) {
  const key = toModuleKey(name)
  return key || `feature-${index + 1}`
}

function inferTargetByName(name, index) {
  const text = String(name ?? '')
  if (/报告|报表|复盘|统计/.test(text)) return 'reports'
  if (/规则|设置|策略|配置/.test(text)) return 'settings'
  if (/用户|客户|成员/.test(text)) return 'users'
  if (/概览|总览|看板/.test(text)) return 'overview'
  return index % 2 === 0 ? 'tasks' : 'reports'
}

function buildFeatureMenus(docText, moduleName) {
  const names = extractFeatureNames(docText)
  const source = names.length
    ? names
    : [`${moduleName}任务`, `${moduleName}报告`, `${moduleName}规则`]
  return source.slice(0, 8).map((name, index) => ({
    key: toFeatureKey(name, index),
    name,
    description: `${name}数据与执行入口。`,
    target: inferTargetByName(name, index),
    keywords: dedupeArray([name, moduleName, '任务', '分析']).slice(0, 20),
  }))
}

function buildKpiDefinitions(moduleName) {
  return [
    {
      key: 'successRate',
      label: '成功率',
      unit: '%',
      calc: 'successRate',
      target: 90,
      description: `${moduleName}任务执行成功率。`,
    },
    {
      key: 'riskRate',
      label: '风险率',
      unit: '%',
      calc: 'riskRate',
      target: 20,
      description: `${moduleName}任务风险命中占比。`,
    },
    {
      key: 'processingCount',
      label: '处理中',
      unit: '条',
      calc: 'pendingCount',
      target: 10,
      description: `${moduleName}当前排队或运行中的任务量。`,
    },
  ]
}

function buildExecutionRule(featureMenus = []) {
  const focusChecks = featureMenus.map((item) => `${item.name}完整性校验`).slice(0, 6)
  const riskSignals = featureMenus.map((item) => `${item.name}异常`).slice(0, 6)
  return {
    focusChecks: focusChecks.length ? focusChecks : ['输入完整性', '执行可追溯性', '输出可执行性'],
    riskSignals: riskSignals.length ? riskSignals : ['异常', '冲突', '缺失'],
    failSignals: ['处理失败', '超时', '数据不可用'],
    nextActions: ['补充关键输入后重试', '对风险项进行人工复核'],
  }
}

function sanitizeFeatureMenus(featureMenus) {
  const safe = Array.isArray(featureMenus) ? featureMenus : []
  return safe.slice(0, 8).map((item, index) => {
    const key = toModuleKey(item?.key || item?.name || `feature-${index + 1}`)
    const target = FEATURE_TARGETS.includes(String(item?.target)) ? String(item.target) : 'tasks'
    return {
      key,
      name: normalizeText(item?.name, `子功能${index + 1}`, 50),
      description: normalizeText(item?.description, '查看该子功能数据。', 120),
      target,
      keywords: dedupeArray(item?.keywords || [item?.name]).slice(0, 20),
    }
  })
}

function sanitizeKpiDefinitions(kpis) {
  const safe = Array.isArray(kpis) ? kpis : []
  return safe.slice(0, 6).map((item, index) => ({
    key: toModuleKey(item?.key || item?.label || `kpi-${index + 1}`),
    label: normalizeText(item?.label, `指标${index + 1}`, 30),
    unit: normalizeText(item?.unit, '', 10),
    calc: normalizeText(item?.calc, 'successRate', 30),
    target: Number.isFinite(Number(item?.target)) ? Number(item.target) : null,
    description: normalizeText(item?.description, '', 120),
  }))
}

function sanitizeExecutionRule(rule) {
  const source = rule && typeof rule === 'object' ? rule : {}
  return {
    focusChecks: dedupeArray(source.focusChecks || []).slice(0, 20),
    riskSignals: dedupeArray(source.riskSignals || []).slice(0, 20),
    failSignals: dedupeArray(source.failSignals || []).slice(0, 20),
    nextActions: dedupeArray(source.nextActions || []).slice(0, 20),
  }
}

export function buildModuleSpecFromDesign(input = {}) {
  const designDoc = normalizeText(input.designDoc, '', 10000)
  const moduleName = normalizeText(input.moduleName, '', 60) || normalizeText(input.name, '', 60) || '新建子模块'
  const moduleKey = toModuleKey(input.moduleKey || moduleName)
  const category = inferCategory(input.category, designDoc)
  const status = inferStatus(input.status)
  const icon = inferIcon(input.icon, category)
  const description = normalizeText(input.description, '', 200) || pickSummary(designDoc)
  const featureMenus = sanitizeFeatureMenus(buildFeatureMenus(designDoc, moduleName))
  const kpiDefinitions = sanitizeKpiDefinitions(buildKpiDefinitions(moduleName))
  const executionRule = sanitizeExecutionRule(buildExecutionRule(featureMenus))

  return {
    module: {
      moduleKey,
      name: moduleName,
      category,
      description,
      icon,
      status,
      mobileSupported: true,
    },
    blueprint: {
      projectName: `${moduleName}子后台`,
      uniqueValue: description,
      featureMenus,
      kpiDefinitions,
    },
    executionRule,
    sourceDoc: designDoc,
    warnings: [],
  }
}

export function registerGeneratedModule(spec = {}) {
  const module = spec.module || {}
  const moduleKey = toModuleKey(module.moduleKey)
  if (!moduleKey) {
    throw new Error('Invalid module key.')
  }

  const safeModule = {
    moduleKey,
    name: normalizeText(module.name, moduleKey, 60),
    category: inferCategory(module.category, ''),
    description: normalizeText(module.description, '自动生成模块。', 200),
    icon: inferIcon(module.icon, module.category),
    status: inferStatus(module.status),
    mobileSupported: typeof module.mobileSupported === 'boolean' ? module.mobileSupported : true,
  }

  const safeBlueprint = {
    projectName: normalizeText(spec.blueprint?.projectName, `${safeModule.name}子后台`, 80),
    uniqueValue: normalizeText(spec.blueprint?.uniqueValue, safeModule.description, 200),
    featureMenus: sanitizeFeatureMenus(spec.blueprint?.featureMenus),
    kpiDefinitions: sanitizeKpiDefinitions(spec.blueprint?.kpiDefinitions),
  }
  const safeRule = sanitizeExecutionRule(spec.executionRule)

  const idx = moduleCatalog.findIndex((item) => item.moduleKey === safeModule.moduleKey)
  if (idx >= 0) moduleCatalog[idx] = safeModule
  else moduleCatalog.push(safeModule)

  moduleExecutionRules[safeModule.moduleKey] = safeRule
  moduleBlueprintMap[safeModule.moduleKey] = safeBlueprint

  return {
    module: safeModule,
    blueprint: safeBlueprint,
    executionRule: safeRule,
  }
}
