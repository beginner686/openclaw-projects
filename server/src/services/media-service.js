import { randomBytes } from 'node:crypto'

const SUPPORTED_PLATFORMS = new Set(['douyin', 'kuaishou', 'xiaohongshu', 'wechat-video'])
const DEFAULT_PLATFORMS = ['douyin', 'kuaishou']

const TOPIC_ANGLES = [
  '避坑清单',
  '对比评测',
  '新手入门',
  '高频误区',
  '真实案例',
  '场景解法',
  '一分钟速懂',
  '热门问答',
]

const CTA_BY_PLATFORM = {
  douyin: '评论区回“清单”领取完整版选品表。',
  kuaishou: '主页私信“资料”获取完整脚本模板。',
  xiaohongshu: '收藏并留言“想要”，我把表格发你。',
  'wechat-video': '点个关注，下期继续拆解同类爆款。',
}

const PLATFORM_TITLE_SUFFIX = {
  douyin: '抖音版',
  kuaishou: '快手版',
  xiaohongshu: '小红书版',
  'wechat-video': '视频号版',
}
const PRODUCT_DECISIONS = new Set(['pending', 'priority', 'candidate', 'drop'])
const SCHEDULE_STATUSES = new Set(['planned', 'publishing', 'published', 'failed'])
const SCHEDULE_STATUS_TRANSITIONS = {
  planned: new Set(['planned', 'publishing', 'published', 'failed']),
  publishing: new Set(['publishing', 'planned', 'published', 'failed']),
  published: new Set(['published']),
  failed: new Set(['failed', 'planned', 'publishing']),
}

function fail(status, code, message) {
  return { error: { status, code, message } }
}

function clampInt(value, { min, max, fallback }) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const rounded = Math.floor(parsed)
  if (rounded < min) return min
  if (rounded > max) return max
  return rounded
}

function readText(payload, key, maxLength = 200, fallback = '') {
  const value = String(payload?.[key] ?? fallback).trim()
  return value.slice(0, maxLength)
}

function normalizeDecision(input, fallback = 'pending') {
  const value = String(input ?? '').trim()
  if (PRODUCT_DECISIONS.has(value)) return value
  return fallback
}

function parseReasons(input, fallback = []) {
  if (!Array.isArray(input)) return fallback
  return input
    .map((item) => String(item ?? '').trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 8)
}

function parseIsoDate(input, fallback = '') {
  const value = String(input ?? '').trim().slice(0, 10)
  if (!value) return fallback
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return ''
  return value
}

function normalizeScheduleStatus(input, fallback = 'planned') {
  const value = String(input ?? '').trim()
  if (SCHEDULE_STATUSES.has(value)) return value
  return fallback
}

function buildScheduleSummary(schedules) {
  const summary = {
    planned: 0,
    publishing: 0,
    published: 0,
    failed: 0,
    successRate: 0,
    topFailureReasons: [],
  }

  const reasonMap = new Map()
  for (const item of schedules) {
    const status = String(item.status ?? 'planned')
    if (status === 'publishing') summary.publishing += 1
    else if (status === 'published') summary.published += 1
    else if (status === 'failed') summary.failed += 1
    else summary.planned += 1

    const reason = String(item.failureReason ?? '').trim()
    if (status === 'failed' && reason) {
      reasonMap.set(reason, Number(reasonMap.get(reason) ?? 0) + 1)
    }
  }

  const finished = summary.published + summary.failed
  summary.successRate = finished > 0 ? Math.round((summary.published / finished) * 100) : 0
  summary.topFailureReasons = [...reasonMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }))

  return summary
}

function toPlatform(input, fallback = 'douyin') {
  const value = String(input ?? '').trim()
  if (SUPPORTED_PLATFORMS.has(value)) return value
  return fallback
}

function parsePlatformList(input) {
  if (!Array.isArray(input)) return [...DEFAULT_PLATFORMS]
  const list = [...new Set(input.map((item) => toPlatform(item)).filter((item) => SUPPORTED_PLATFORMS.has(item)))]
  return list.length ? list : [...DEFAULT_PLATFORMS]
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`
}

function scoreByIndex(index, min, max) {
  const span = Math.max(1, max - min + 1)
  return min + ((index * 13 + 7) % span)
}

function buildTopicTitle({ niche, audience, angle, goal, platform }, index) {
  const nichePart = niche || '泛生活'
  const audiencePart = audience || '新手用户'
  const goalPart = goal || '提升转化'
  const prefix = index % 2 === 0 ? '爆款选题' : '高转化选题'
  return `${prefix}｜${nichePart}：面向${audiencePart}的${angle}（${platform} · ${goalPart}）`
}

function buildContentByTopic({ title, angle, platform, productHook, tone }) {
  const platformLabel = PLATFORM_TITLE_SUFFIX[platform] ?? '平台版'
  const hook = `${title.split('｜').pop() ?? title}，先说结论：这条思路可以直接复用。`
  const scriptText = [
    `【开场】${hook}`,
    `【痛点】很多人做${platformLabel}内容时，卡在“选题不够具体，卖点不够聚焦”。`,
    `【解法】今天给你一套${angle || '可复用'}模板，照着填就能快速产出。`,
    `【示例】${productHook || '把商品卖点拆成“场景+结果+证据”三段式口播。'}`,
    `【节奏】前3秒给结果，中段给证据，结尾给动作指令。`,
    `【收口】${CTA_BY_PLATFORM[platform]}`,
  ].join('\n')

  return {
    title: `${title} · ${platformLabel}`,
    hook,
    scriptText,
    ctaText: CTA_BY_PLATFORM[platform],
    commentsGuide: tone
      ? `评论区统一回复风格：${tone}。优先回复“价格、效果、适用人群”三类问题。`
      : '评论区优先回复“价格、效果、适用人群”三类问题。',
  }
}

function rewriteForPlatform(rawText, targetPlatform) {
  const safeText = String(rawText ?? '').trim()
  if (!safeText) return ''

  if (targetPlatform === 'douyin') {
    return `【抖音短版】\n${safeText.slice(0, 180)}\n结尾：${CTA_BY_PLATFORM.douyin}`
  }
  if (targetPlatform === 'kuaishou') {
    return `【快手口语版】\n家人们，今天给你们说重点：\n${safeText.slice(0, 220)}\n结尾：${CTA_BY_PLATFORM.kuaishou}`
  }
  if (targetPlatform === 'xiaohongshu') {
    return `【小红书种草版】\n我的真实使用感受：\n${safeText.slice(0, 240)}\n结尾：${CTA_BY_PLATFORM.xiaohongshu}`
  }
  return `【视频号稳健版】\n${safeText.slice(0, 240)}\n结尾：${CTA_BY_PLATFORM['wechat-video']}`
}

function evaluateProduct(product) {
  const reasons = []
  let score = 0

  const commissionRate = Number(product.commissionRate ?? 0)
  if (commissionRate >= 25) {
    score += 40
    reasons.push('佣金高于 25%，具备优先推广价值。')
  } else if (commissionRate >= 15) {
    score += 28
    reasons.push('佣金在 15%-25%，具备稳定推广空间。')
  } else {
    score += 12
    reasons.push('佣金偏低，建议仅作补充内容。')
  }

  const price = Number(product.price ?? 0)
  if (price >= 19 && price <= 199) {
    score += 20
    reasons.push('价格处于直播常见转化区间。')
  } else if (price > 0 && price < 19) {
    score += 14
    reasons.push('低价易起量，但需注意利润空间。')
  } else if (price > 199) {
    score += 10
    reasons.push('客单价偏高，适合深度讲解场景。')
  }

  const shippingMode = String(product.shippingMode ?? '').toLowerCase()
  if (shippingMode.includes('代发') || shippingMode.includes('drop')) {
    score += 15
    reasons.push('支持代发，履约链路更稳定。')
  } else {
    score += 6
    reasons.push('代发信息不明确，需人工确认。')
  }

  const stockHint = Number(product.stockHint ?? 0)
  if (stockHint >= 50) {
    score += 12
    reasons.push('库存相对充足，适合排期连发。')
  } else if (stockHint >= 10) {
    score += 8
    reasons.push('库存中等，建议控制投放节奏。')
  } else {
    score += 2
    reasons.push('库存偏低，存在断货风险。')
  }

  if (String(product.sellingPoint ?? '').trim().length >= 20) {
    score += 8
    reasons.push('卖点信息完整，便于内容转化。')
  }

  score = Math.max(0, Math.min(100, score))
  const decision = score >= 75 ? 'priority' : score >= 55 ? 'candidate' : 'drop'
  return { score, decision, reasons }
}

export function createMediaService({ dataRepository }) {
  function assertModuleAccess(user) {
    if (!user.enabledModules.includes('content-generation-publisher')) {
      return fail(403, 'MODULE_FORBIDDEN', '当前账号未开通自媒体内容与选品工作台。')
    }
    return null
  }

  async function ensureProject(user, projectId = '') {
    const safeProjectId = String(projectId ?? '').trim()
    if (safeProjectId) {
      const found = await dataRepository.findMediaProjectById(user.id, safeProjectId)
      if (!found) {
        return { error: fail(404, 'MEDIA_PROJECT_NOT_FOUND', '项目不存在。') }
      }
      return { data: found }
    }

    const projects = await dataRepository.listMediaProjects(user.id, 20)
    if (projects.length) {
      return { data: projects[0] }
    }

    const project = await dataRepository.createMediaProject({
      projectId: createId('media-project'),
      ownerId: user.id,
      name: '默认自媒体项目',
      niche: '居家好物',
      targetPlatforms: DEFAULT_PLATFORMS,
      goal: '带货转化',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return { data: project }
  }

  async function getDashboard(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const projectResult = await ensureProject(user, payload?.projectId)
    if (projectResult.error) return projectResult.error
    const project = projectResult.data

    const [topics, contents, products, schedules] = await Promise.all([
      dataRepository.listMediaTopics(user.id, project.projectId, 100),
      dataRepository.listMediaContents(user.id, project.projectId, 100),
      dataRepository.listMediaProducts(user.id, project.projectId, 200),
      dataRepository.listMediaSchedules(user.id, project.projectId, 120),
    ])
    const scheduleSummary = buildScheduleSummary(schedules)

    return {
      data: {
        project,
        stats: {
          topics: topics.length,
          contents: contents.length,
          products: products.length,
          schedules: schedules.length,
          priorityProducts: products.filter((item) => item.decision === 'priority').length,
          publishedSchedules: scheduleSummary.published,
          failedSchedules: scheduleSummary.failed,
          scheduleSuccessRate: scheduleSummary.successRate,
        },
        latestTopics: topics.slice(0, 8),
        latestContents: contents.slice(0, 8),
        latestProducts: products.slice(0, 8),
        upcomingSchedules: schedules.slice(0, 14),
        scheduleSummary,
      },
    }
  }

  async function listProjects(user) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const projects = await dataRepository.listMediaProjects(user.id, 50)
    if (projects.length) return { data: projects }

    const projectResult = await ensureProject(user)
    if (projectResult.error) return projectResult.error
    return { data: [projectResult.data] }
  }

  async function createProject(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const name = readText(payload, 'name', 120)
    if (!name) {
      return fail(400, 'MEDIA_PROJECT_INVALID_NAME', '项目名称不能为空。')
    }

    const project = await dataRepository.createMediaProject({
      projectId: createId('media-project'),
      ownerId: user.id,
      name,
      niche: readText(payload, 'niche', 120),
      targetPlatforms: parsePlatformList(payload?.targetPlatforms),
      goal: readText(payload, 'goal', 120),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return { data: project }
  }

  async function generateTopics(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const projectResult = await ensureProject(user, payload?.projectId)
    if (projectResult.error) return projectResult.error
    const project = projectResult.data

    const count = clampInt(payload?.count, { min: 1, max: 50, fallback: 20 })
    const platform = toPlatform(payload?.platform, project.targetPlatforms[0] ?? 'douyin')
    const niche = readText(payload, 'niche', 120, project.niche || '居家好物')
    const audience = readText(payload, 'audience', 80, '兴趣用户')
    const goal = readText(payload, 'goal', 80, project.goal || '带货转化')

    const topics = Array.from({ length: count }, (_, index) => {
      const angle = TOPIC_ANGLES[index % TOPIC_ANGLES.length]
      return {
        topicId: createId('media-topic'),
        projectId: project.projectId,
        ownerId: user.id,
        platform,
        title: buildTopicTitle({ niche, audience, angle, goal, platform }, index + 1),
        angle,
        heatScore: scoreByIndex(index + 3, 60, 95),
        convertScore: scoreByIndex(index + 9, 55, 93),
        tags: [niche, audience, goal, angle],
        status: 'draft',
        createdAt: new Date().toISOString(),
      }
    })

    const created = await dataRepository.createMediaTopics(topics)
    return { data: { project, topics: created } }
  }

  async function listTopics(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const projectResult = await ensureProject(user, payload?.projectId)
    if (projectResult.error) return projectResult.error
    const project = projectResult.data
    const topics = await dataRepository.listMediaTopics(user.id, project.projectId, 200)
    return { data: { project, topics } }
  }

  async function generateContent(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const projectResult = await ensureProject(user, payload?.projectId)
    if (projectResult.error) return projectResult.error
    const project = projectResult.data

    const platform = toPlatform(payload?.platform, project.targetPlatforms[0] ?? 'douyin')
    const tone = readText(payload, 'tone', 40)
    const productHook = readText(payload, 'productHook', 240)
    const topicId = readText(payload, 'topicId', 80)
    const topicText = readText(payload, 'topicText', 260)

    let topic = null
    if (topicId) {
      topic = await dataRepository.findMediaTopicById(user.id, topicId)
      if (!topic) {
        return fail(404, 'MEDIA_TOPIC_NOT_FOUND', '选题不存在。')
      }
      if (topic.projectId !== project.projectId) {
        return fail(400, 'MEDIA_TOPIC_PROJECT_MISMATCH', '所选选题不属于当前项目。')
      }
    }

    const sourceTitle = topic?.title || topicText
    if (!sourceTitle) {
      return fail(400, 'MEDIA_CONTENT_TOPIC_REQUIRED', '请提供选题内容。')
    }

    const generated = buildContentByTopic({
      title: sourceTitle,
      angle: topic?.angle || '',
      platform,
      productHook,
      tone,
    })

    const content = await dataRepository.createMediaContent({
      contentId: createId('media-content'),
      projectId: project.projectId,
      ownerId: user.id,
      topicId: topic?.topicId || '',
      sourceType: topic ? 'topic' : 'manual',
      platform,
      title: generated.title,
      hook: generated.hook,
      scriptText: generated.scriptText,
      ctaText: generated.ctaText,
      commentsGuide: generated.commentsGuide,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return { data: { project, content } }
  }

  async function rewriteContent(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const targetPlatform = toPlatform(payload?.targetPlatform, 'douyin')
    const contentId = readText(payload, 'contentId', 80)
    const rawText = readText(payload, 'rawText', 10000)

    let sourceContent = null
    if (contentId) {
      sourceContent = await dataRepository.findMediaContentById(user.id, contentId)
      if (!sourceContent) {
        return fail(404, 'MEDIA_CONTENT_NOT_FOUND', '原始内容不存在。')
      }
      if (payload?.projectId && String(payload.projectId).trim() !== sourceContent.projectId) {
        return fail(400, 'MEDIA_CONTENT_PROJECT_MISMATCH', '原始内容与当前项目不一致。')
      }
    }

    const baseText = rawText || sourceContent?.scriptText || ''
    if (!baseText) {
      return fail(400, 'MEDIA_REWRITE_TEXT_REQUIRED', '请提供可改写的内容。')
    }

    const projectResult = await ensureProject(user, sourceContent?.projectId || payload?.projectId)
    if (projectResult.error) return projectResult.error
    const project = projectResult.data

    const rewrittenScript = rewriteForPlatform(baseText, targetPlatform)
    const rewrittenTitleBase = sourceContent?.title || readText(payload, 'title', 260, '内容改写')

    const content = await dataRepository.createMediaContent({
      contentId: createId('media-content'),
      projectId: project.projectId,
      ownerId: user.id,
      topicId: sourceContent?.topicId || '',
      sourceType: 'rewrite',
      platform: targetPlatform,
      title: `${rewrittenTitleBase} · ${PLATFORM_TITLE_SUFFIX[targetPlatform]}`,
      hook: rewrittenScript.split('\n')[1] || rewrittenScript.slice(0, 80),
      scriptText: rewrittenScript,
      ctaText: CTA_BY_PLATFORM[targetPlatform],
      commentsGuide: '评论区保持一问一答，优先回复真实体验与使用场景。',
      version: Number(sourceContent?.version ?? 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return { data: { project, content } }
  }

  async function listContents(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const projectResult = await ensureProject(user, payload?.projectId)
    if (projectResult.error) return projectResult.error
    const project = projectResult.data
    const contents = await dataRepository.listMediaContents(user.id, project.projectId, 200)
    return { data: { project, contents } }
  }

  async function createProduct(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const projectResult = await ensureProject(user, payload?.projectId)
    if (projectResult.error) return projectResult.error
    const project = projectResult.data

    const name = readText(payload, 'name', 240)
    if (!name) {
      return fail(400, 'MEDIA_PRODUCT_NAME_REQUIRED', '商品名称不能为空。')
    }

    const price = Number(payload?.price ?? 0)
    const commissionRate = Number(payload?.commissionRate ?? 0)
    const stockHint = clampInt(payload?.stockHint, { min: 0, max: 100000, fallback: 0 })
    if (!Number.isFinite(price) || price < 0 || price > 100000) {
      return fail(400, 'MEDIA_PRODUCT_INVALID_PRICE', '商品价格格式不正确。')
    }
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      return fail(400, 'MEDIA_PRODUCT_INVALID_COMMISSION', '佣金比例需在 0-100 之间。')
    }

    const product = await dataRepository.createMediaProduct({
      productId: createId('media-product'),
      projectId: project.projectId,
      ownerId: user.id,
      platformSource: readText(payload, 'platformSource', 40),
      name,
      url: readText(payload, 'url', 1000),
      price,
      commissionRate,
      shippingMode: readText(payload, 'shippingMode', 40),
      supplier: readText(payload, 'supplier', 120),
      stockHint,
      sellingPoint: readText(payload, 'sellingPoint', 500),
      status: 'active',
      score: 0,
      decision: 'pending',
      reasons: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return { data: { project, product } }
  }

  async function updateProduct(user, productId, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const safeProductId = String(productId ?? '').trim()
    if (!safeProductId) {
      return fail(400, 'MEDIA_PRODUCT_ID_REQUIRED', '商品ID不能为空。')
    }
    const existing = await dataRepository.findMediaProductById(user.id, safeProductId)
    if (!existing) {
      return fail(404, 'MEDIA_PRODUCT_NOT_FOUND', '商品不存在。')
    }

    const nextPrice = payload?.price ?? existing.price
    const nextCommissionRate = payload?.commissionRate ?? existing.commissionRate
    const nextStockHint = payload?.stockHint ?? existing.stockHint
    const nextScore = payload?.score ?? existing.score
    const nextDecision = normalizeDecision(payload?.decision, existing.decision)

    if (!Number.isFinite(Number(nextPrice)) || Number(nextPrice) < 0 || Number(nextPrice) > 100000) {
      return fail(400, 'MEDIA_PRODUCT_INVALID_PRICE', '商品价格格式不正确。')
    }
    if (
      !Number.isFinite(Number(nextCommissionRate)) ||
      Number(nextCommissionRate) < 0 ||
      Number(nextCommissionRate) > 100
    ) {
      return fail(400, 'MEDIA_PRODUCT_INVALID_COMMISSION', '佣金比例需在 0-100 之间。')
    }
    if (!Number.isFinite(Number(nextStockHint)) || Number(nextStockHint) < 0 || Number(nextStockHint) > 100000) {
      return fail(400, 'MEDIA_PRODUCT_INVALID_STOCK', '库存参考值格式不正确。')
    }
    if (!Number.isFinite(Number(nextScore)) || Number(nextScore) < 0 || Number(nextScore) > 100) {
      return fail(400, 'MEDIA_PRODUCT_INVALID_SCORE', '评分需在 0-100 之间。')
    }
    if (payload?.decision !== undefined && !PRODUCT_DECISIONS.has(String(payload.decision).trim())) {
      return fail(400, 'MEDIA_PRODUCT_INVALID_DECISION', '商品决策值不合法。')
    }

    const updated = await dataRepository.updateMediaProduct(user.id, safeProductId, {
      platformSource: readText(payload, 'platformSource', 40, existing.platformSource),
      name: readText(payload, 'name', 240, existing.name),
      url: readText(payload, 'url', 1000, existing.url),
      price: Number(nextPrice),
      commissionRate: Number(nextCommissionRate),
      shippingMode: readText(payload, 'shippingMode', 40, existing.shippingMode),
      supplier: readText(payload, 'supplier', 120, existing.supplier),
      stockHint: Math.floor(Number(nextStockHint)),
      sellingPoint: readText(payload, 'sellingPoint', 500, existing.sellingPoint),
      status: readText(payload, 'status', 20, existing.status),
      score: Math.floor(Number(nextScore)),
      decision: nextDecision,
      reasons: parseReasons(payload?.reasons, existing.reasons),
    })
    return { data: updated }
  }

  async function removeProduct(user, productId) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const safeProductId = String(productId ?? '').trim()
    if (!safeProductId) {
      return fail(400, 'MEDIA_PRODUCT_ID_REQUIRED', '商品ID不能为空。')
    }
    const existing = await dataRepository.findMediaProductById(user.id, safeProductId)
    if (!existing) {
      return fail(404, 'MEDIA_PRODUCT_NOT_FOUND', '商品不存在。')
    }
    await dataRepository.removeMediaProduct(user.id, safeProductId)
    return { data: { success: true } }
  }

  async function listProducts(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const projectResult = await ensureProject(user, payload?.projectId)
    if (projectResult.error) return projectResult.error
    const project = projectResult.data
    const products = await dataRepository.listMediaProducts(user.id, project.projectId, 400)
    return { data: { project, products } }
  }

  async function scoreProducts(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const projectResult = await ensureProject(user, payload?.projectId)
    if (projectResult.error) return projectResult.error
    const project = projectResult.data

    const ids = new Set(
      (Array.isArray(payload?.productIds) ? payload.productIds : []).map((item) => String(item).trim()).filter(Boolean),
    )
    const allProducts = await dataRepository.listMediaProducts(user.id, project.projectId, 500)
    const targets = ids.size ? allProducts.filter((item) => ids.has(item.productId)) : allProducts
    if (!targets.length) {
      return fail(400, 'MEDIA_PRODUCTS_EMPTY', '没有可评分的商品。')
    }

    const scored = []
    for (const item of targets) {
      const result = evaluateProduct(item)
      const updated = await dataRepository.updateMediaProduct(user.id, item.productId, {
        score: result.score,
        decision: result.decision,
        reasons: result.reasons,
      })
      if (updated) scored.push(updated)
    }

    return { data: { project, products: scored } }
  }

  async function generateSchedules(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const projectResult = await ensureProject(user, payload?.projectId)
    if (projectResult.error) return projectResult.error
    const project = projectResult.data

    const days = clampInt(payload?.days, { min: 1, max: 30, fallback: 7 })
    const dailyPosts = clampInt(payload?.dailyPosts, { min: 1, max: 6, fallback: 1 })
    const platforms = parsePlatformList(payload?.platforms)

    const [topics, contents, products] = await Promise.all([
      dataRepository.listMediaTopics(user.id, project.projectId, 500),
      dataRepository.listMediaContents(user.id, project.projectId, 500),
      dataRepository.listMediaProducts(user.id, project.projectId, 500),
    ])

    if (!topics.length && !contents.length) {
      return fail(400, 'MEDIA_SCHEDULE_NEED_CONTENT', '请先生成选题或内容后再排期。')
    }

    const preferredProducts = products
      .filter((item) => item.decision === 'priority' || item.decision === 'candidate')
      .sort((a, b) => b.score - a.score)
    const selectedProducts = preferredProducts.length ? preferredProducts : products

    const startDate = new Date()
    const schedules = []
    for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
      for (let postIndex = 0; postIndex < dailyPosts; postIndex += 1) {
        const serial = dayIndex * dailyPosts + postIndex
        const publishDate = new Date(startDate.getTime() + dayIndex * 24 * 60 * 60 * 1000)
        const platform = platforms[serial % platforms.length]
        const topic = topics.length ? topics[serial % topics.length] : null
        const matchedContent =
          contents.find((item) => item.platform === platform) ?? (contents.length ? contents[serial % contents.length] : null)
        const product = selectedProducts.length ? selectedProducts[serial % selectedProducts.length] : null

        schedules.push({
          scheduleId: createId('media-schedule'),
          projectId: project.projectId,
          ownerId: user.id,
          publishDate: publishDate.toISOString().slice(0, 10),
          platform,
          topicId: topic?.topicId ?? '',
          contentId: matchedContent?.contentId ?? '',
          productId: product?.productId ?? '',
          status: 'planned',
          note: `第 ${dayIndex + 1} 天第 ${postIndex + 1} 条内容排期`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    }

    await dataRepository.clearMediaSchedulesByProject(user.id, project.projectId)
    const saved = await dataRepository.createMediaSchedules(schedules)
    return { data: { project, schedules: saved } }
  }

  async function updateSchedule(user, scheduleId, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const safeScheduleId = String(scheduleId ?? '').trim()
    if (!safeScheduleId) {
      return fail(400, 'MEDIA_SCHEDULE_ID_REQUIRED', '排期ID不能为空。')
    }

    const existing = await dataRepository.findMediaScheduleById(user.id, safeScheduleId)
    if (!existing) {
      return fail(404, 'MEDIA_SCHEDULE_NOT_FOUND', '排期不存在。')
    }

    if (payload?.projectId && String(payload.projectId).trim() !== existing.projectId) {
      return fail(400, 'MEDIA_SCHEDULE_PROJECT_MISMATCH', '排期与当前项目不一致。')
    }
    const projectResult = await ensureProject(user, existing.projectId)
    if (projectResult.error) return projectResult.error
    const project = projectResult.data

    const publishDate = payload?.publishDate === undefined ? existing.publishDate : parseIsoDate(payload.publishDate, '')
    if (!publishDate) {
      return fail(400, 'MEDIA_SCHEDULE_INVALID_DATE', '发布日期格式不正确，应为 YYYY-MM-DD。')
    }

    let platform = existing.platform
    if (payload?.platform !== undefined) {
      const safePlatform = String(payload.platform).trim()
      if (!SUPPORTED_PLATFORMS.has(safePlatform)) {
        return fail(400, 'MEDIA_SCHEDULE_INVALID_PLATFORM', '平台参数不支持。')
      }
      platform = safePlatform
    }

    if (payload?.status !== undefined && !SCHEDULE_STATUSES.has(String(payload.status).trim())) {
      return fail(400, 'MEDIA_SCHEDULE_INVALID_STATUS', '排期状态不合法。')
    }
    const nextStatus = normalizeScheduleStatus(payload?.status, existing.status)
    const allowedTransitions = SCHEDULE_STATUS_TRANSITIONS[existing.status] ?? new Set([existing.status])
    if (!allowedTransitions.has(nextStatus)) {
      return fail(400, 'MEDIA_SCHEDULE_STATUS_TRANSITION_INVALID', '排期状态流转不允许。')
    }

    const hasFailureReasonField = Object.prototype.hasOwnProperty.call(payload ?? {}, 'failureReason')
    let failureReason = hasFailureReasonField ? readText(payload, 'failureReason', 300, '') : existing.failureReason
    if (nextStatus === 'failed' && !String(failureReason ?? '').trim()) {
      failureReason = '执行失败，待补充原因。'
    }
    if (nextStatus !== 'failed') {
      failureReason = ''
    }

    let executedAt = existing.executedAt
    if (nextStatus === 'published' || nextStatus === 'failed') {
      executedAt = existing.executedAt || new Date().toISOString()
    } else if (nextStatus === 'planned') {
      executedAt = ''
    }

    const hasTopicField = Object.prototype.hasOwnProperty.call(payload ?? {}, 'topicId')
    const hasContentField = Object.prototype.hasOwnProperty.call(payload ?? {}, 'contentId')
    const hasProductField = Object.prototype.hasOwnProperty.call(payload ?? {}, 'productId')

    const nextTopicId = hasTopicField ? String(payload?.topicId ?? '').trim() : existing.topicId
    const nextContentId = hasContentField ? String(payload?.contentId ?? '').trim() : existing.contentId
    const nextProductId = hasProductField ? String(payload?.productId ?? '').trim() : existing.productId

    if (nextTopicId) {
      const topic = await dataRepository.findMediaTopicById(user.id, nextTopicId)
      if (!topic || topic.projectId !== project.projectId) {
        return fail(400, 'MEDIA_SCHEDULE_TOPIC_INVALID', '关联选题不存在或不属于当前项目。')
      }
    }
    if (nextContentId) {
      const content = await dataRepository.findMediaContentById(user.id, nextContentId)
      if (!content || content.projectId !== project.projectId) {
        return fail(400, 'MEDIA_SCHEDULE_CONTENT_INVALID', '关联内容不存在或不属于当前项目。')
      }
    }
    if (nextProductId) {
      const product = await dataRepository.findMediaProductById(user.id, nextProductId)
      if (!product || product.projectId !== project.projectId) {
        return fail(400, 'MEDIA_SCHEDULE_PRODUCT_INVALID', '关联商品不存在或不属于当前项目。')
      }
    }

    const note = readText(payload, 'note', 500, existing.note)
    const updated = await dataRepository.updateMediaSchedule(user.id, safeScheduleId, {
      publishDate,
      platform,
      topicId: nextTopicId || null,
      contentId: nextContentId || null,
      productId: nextProductId || null,
      status: nextStatus,
      note,
      executedAt: executedAt || null,
      failureReason,
    })

    return { data: { project, schedule: updated } }
  }

  async function listSchedules(user, payload) {
    const accessError = assertModuleAccess(user)
    if (accessError) return accessError

    const projectResult = await ensureProject(user, payload?.projectId)
    if (projectResult.error) return projectResult.error
    const project = projectResult.data
    const schedules = await dataRepository.listMediaSchedules(user.id, project.projectId, 200)
    const summary = buildScheduleSummary(schedules)
    return { data: { project, schedules, summary } }
  }

  return {
    getDashboard,
    listProjects,
    createProject,
    generateTopics,
    listTopics,
    generateContent,
    rewriteContent,
    listContents,
    createProduct,
    updateProduct,
    removeProduct,
    listProducts,
    scoreProducts,
    generateSchedules,
    updateSchedule,
    listSchedules,
  }
}
