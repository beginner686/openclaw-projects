import { randomBytes } from 'node:crypto'

const DEAL_TAGS = new Set(['特价', '限时', '爆款'])

function fail(status, code, message) {
  return { error: { status, code, message } }
}

function readBoundedNumber(payload, key, { min, max, fallback, code, label, integer = false }) {
  const hasValue = Object.prototype.hasOwnProperty.call(payload ?? {}, key)
  if (!hasValue || payload?.[key] === undefined || payload?.[key] === null || payload?.[key] === '') {
    return { value: fallback }
  }

  const raw = Number(payload[key])
  if (!Number.isFinite(raw)) {
    return { error: fail(400, code, `${label}格式不正确。`) }
  }

  const value = integer ? Math.floor(raw) : raw
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

function toUnitPricePer500g(feed) {
  const weight = Math.max(1, Number(feed.specWeightG ?? 500))
  return Number(((Number(feed.price ?? 0) / weight) * 500).toFixed(2))
}

function normalizeText(input) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
}

function uniqueBy(array, keyFn) {
  const seen = new Set()
  return array.filter((item) => {
    const key = keyFn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`
}

function levelByScore(score) {
  if (score >= 80) return '新鲜'
  if (score >= 60) return '一般'
  return '谨慎购买'
}

function analyzeFreshnessHint(text) {
  const input = normalizeText(text)
  let score = 76
  if (!input) return score

  const positiveTokens = ['鲜亮', '饱满', '硬挺', '色泽好', '有光泽', '紧实', '弹性']
  const negativeTokens = ['发黄', '发黑', '软烂', '出水', '萎蔫', '异味', '霉', '烂']

  for (const token of positiveTokens) {
    if (input.includes(token)) score += 5
  }
  for (const token of negativeTokens) {
    if (input.includes(token)) score -= 9
  }

  return Math.max(20, Math.min(96, score))
}

function defaultMenuTemplates() {
  return [
    { day: '周一', meal: '番茄鸡蛋面', needs: ['西红柿', '鸡蛋', '挂面'] },
    { day: '周二', meal: '土豆炖鸡胸', needs: ['土豆', '鸡胸肉', '青菜'] },
    { day: '周三', meal: '黄瓜炒蛋', needs: ['黄瓜', '鸡蛋', '大米'] },
    { day: '周四', meal: '五花肉青菜饭', needs: ['五花肉', '青菜', '大米'] },
    { day: '周五', meal: '鸡胸肉蔬菜面', needs: ['鸡胸肉', '西红柿', '挂面'] },
    { day: '周六', meal: '土豆五花肉', needs: ['土豆', '五花肉', '青菜'] },
    { day: '周日', meal: '家常蔬菜拼盘', needs: ['西红柿', '黄瓜', '鸡蛋'] },
  ]
}

export function createGroceryService({ dataRepository }) {
  async function getFeeds() {
    const feeds = await dataRepository.listLatestGroceryFeeds(600)
    return feeds.map((item) => ({
      ...item,
      unitPrice500g: toUnitPricePer500g(item),
    }))
  }

  async function getPreference(userId) {
    const preference = await dataRepository.getGroceryPreference(userId)
    if (preference) return preference
    return dataRepository.upsertGroceryPreference(userId, {
      budgetPerMeal: 20,
      familySize: 2,
      dietaryNotes: '',
    })
  }

  async function savePreference(userId, payload) {
    const budgetRes = readBoundedNumber(payload, 'budgetPerMeal', {
      min: 5,
      max: 300,
      fallback: 20,
      code: 'GROCERY_INVALID_BUDGET',
      label: '每餐预算',
    })
    if (budgetRes.error) return budgetRes.error

    const familyRes = readBoundedNumber(payload, 'familySize', {
      min: 1,
      max: 10,
      fallback: 2,
      code: 'GROCERY_INVALID_FAMILY_SIZE',
      label: '家庭人数',
      integer: true,
    })
    if (familyRes.error) return familyRes.error

    const budgetPerMeal = budgetRes.value
    const familySize = familyRes.value
    const dietaryNotes = readTrimmedText(payload, 'dietaryNotes', 500)
    const data = await dataRepository.upsertGroceryPreference(userId, {
      budgetPerMeal,
      familySize,
      dietaryNotes,
    })
    return { data }
  }

  async function comparePrices(_user, payload) {
    const items = Array.isArray(payload?.items)
      ? payload.items.map((item) => String(item).trim().slice(0, 50)).filter(Boolean)
      : String(payload?.items ?? '')
          .split(/[\n,，、]/)
          .map((item) => item.trim().slice(0, 50))
          .filter(Boolean)

    if (!items.length) {
      return fail(400, 'GROCERY_ITEMS_REQUIRED', '请至少输入一个商品名称。')
    }
    if (items.length > 20) {
      return fail(400, 'GROCERY_ITEMS_TOO_MANY', '单次最多比价 20 个商品。')
    }

    const feeds = await getFeeds()

    const comparisons = items.map((itemName) => {
      const needle = normalizeText(itemName)
      const matched = feeds
        .filter((feed) => normalizeText(feed.itemName).includes(needle))
        .sort((a, b) => a.unitPrice500g - b.unitPrice500g)

      const cheapest = matched[0] ?? null
      return {
        itemName,
        cheapestPlatform: cheapest?.platform ?? '',
        cheapestPrice: cheapest?.price ?? null,
        cheapestUnitPrice500g: cheapest?.unitPrice500g ?? null,
        offers: matched.slice(0, 8).map((offer) => ({
          platform: offer.platform,
          itemName: offer.itemName,
          displaySpec: offer.displaySpec,
          price: offer.price,
          unitPrice500g: offer.unitPrice500g,
          dealTag: offer.dealTag,
          sourceLink: offer.sourceLink,
          capturedAt: offer.capturedAt,
        })),
      }
    })

    return { data: comparisons }
  }

  function pickCheapestByCategory(feeds, category, limit = 5) {
    return uniqueBy(
      feeds.filter((item) => item.category === category).sort((a, b) => a.unitPrice500g - b.unitPrice500g),
      (item) => `${item.platform}-${item.itemName}`,
    ).slice(0, limit)
  }

  async function recommendToday(user, payload) {
    const preference = await getPreference(user.id)
    const budgetRes = readBoundedNumber(payload, 'budgetPerMeal', {
      min: 5,
      max: 300,
      fallback: Number(preference.budgetPerMeal ?? 20),
      code: 'GROCERY_INVALID_BUDGET',
      label: '每餐预算',
    })
    if (budgetRes.error) return budgetRes.error

    const familyRes = readBoundedNumber(payload, 'familySize', {
      min: 1,
      max: 10,
      fallback: Number(preference.familySize ?? 2),
      code: 'GROCERY_INVALID_FAMILY_SIZE',
      label: '家庭人数',
      integer: true,
    })
    if (familyRes.error) return familyRes.error

    const budgetPerMeal = budgetRes.value
    const familySize = familyRes.value
    const budget = Number((budgetPerMeal * familySize).toFixed(2))

    const feeds = await getFeeds()
    const vegetables = pickCheapestByCategory(feeds, 'vegetable', 6)
    const proteins = pickCheapestByCategory(feeds, 'protein', 6)
    const staples = pickCheapestByCategory(feeds, 'staple', 6)

    const selected = [vegetables[0], vegetables[1], proteins[0], staples[0]].filter(Boolean)
    const totalCost = Number(selected.reduce((sum, item) => sum + Number(item.price), 0).toFixed(2))

    const decision = totalCost <= budget ? '预算内推荐' : '预算略超，建议减少一个蛋白类商品'

    return {
      data: {
        budgetPerMeal,
        familySize,
        budget,
        estimatedCost: totalCost,
        decision,
        todayMustBuy: selected.map((item) => ({
          itemName: item.itemName,
          platform: item.platform,
          price: item.price,
          dealTag: item.dealTag,
          displaySpec: item.displaySpec,
        })),
        topDeals: feeds
          .filter((item) => DEAL_TAGS.has(item.dealTag))
          .sort((a, b) => a.unitPrice500g - b.unitPrice500g)
          .slice(0, 10)
          .map((item) => ({
            itemName: item.itemName,
            platform: item.platform,
            price: item.price,
            displaySpec: item.displaySpec,
            dealTag: item.dealTag,
          })),
      },
    }
  }

  async function buildWeeklyMenu(user, payload) {
    const preference = await getPreference(user.id)
    const budgetRes = readBoundedNumber(payload, 'budgetPerMeal', {
      min: 5,
      max: 300,
      fallback: Number(preference.budgetPerMeal ?? 20),
      code: 'GROCERY_INVALID_BUDGET',
      label: '每餐预算',
    })
    if (budgetRes.error) return budgetRes.error

    const familyRes = readBoundedNumber(payload, 'familySize', {
      min: 1,
      max: 10,
      fallback: Number(preference.familySize ?? 2),
      code: 'GROCERY_INVALID_FAMILY_SIZE',
      label: '家庭人数',
      integer: true,
    })
    if (familyRes.error) return familyRes.error

    const budgetPerMeal = budgetRes.value
    const familySize = familyRes.value

    const feeds = await getFeeds()

    const menu = defaultMenuTemplates().map((template) => {
      const ingredients = template.needs
        .map((name) => {
          const offer = feeds
            .filter((item) => normalizeText(item.itemName).includes(normalizeText(name)))
            .sort((a, b) => a.unitPrice500g - b.unitPrice500g)[0]
          if (!offer) {
            return {
              itemName: name,
              platform: '',
              price: null,
              displaySpec: '',
            }
          }
          return {
            itemName: offer.itemName,
            platform: offer.platform,
            price: offer.price,
            displaySpec: offer.displaySpec,
          }
        })
        .filter(Boolean)

      const estimatedCost = Number(ingredients.reduce((sum, item) => sum + Number(item.price ?? 0), 0).toFixed(2))
      return {
        day: template.day,
        meal: template.meal,
        ingredients,
        estimatedCost,
        withinBudget: estimatedCost <= budgetPerMeal * familySize,
      }
    })

    const weekBudget = Number((budgetPerMeal * familySize * 7).toFixed(2))
    const weekEstimated = Number(menu.reduce((sum, day) => sum + day.estimatedCost, 0).toFixed(2))

    return {
      data: {
        budgetPerMeal,
        familySize,
        weekBudget,
        weekEstimated,
        weeklyMenu: menu,
      },
    }
  }

  async function listDeals() {
    const feeds = await getFeeds()
    const deals = uniqueBy(
      feeds.filter((item) => DEAL_TAGS.has(item.dealTag)).sort((a, b) => a.unitPrice500g - b.unitPrice500g),
      (item) => `${item.platform}-${item.itemName}-${item.displaySpec}`,
    ).slice(0, 30)

    return {
      data: deals.map((item) => ({
        platform: item.platform,
        itemName: item.itemName,
        price: item.price,
        displaySpec: item.displaySpec,
        unitPrice500g: item.unitPrice500g,
        dealTag: item.dealTag,
        sourceLink: item.sourceLink,
        capturedAt: item.capturedAt,
      })),
    }
  }

  async function checkFreshness(user, payload) {
    const imageName = readTrimmedText(payload, 'imageName', 120)
    const description = readTrimmedText(payload, 'description', 500)
    if (!imageName) {
      return fail(400, 'GROCERY_IMAGE_REQUIRED', '请提供图片名称或描述。')
    }

    const score = analyzeFreshnessHint(`${imageName} ${description}`)
    const level = levelByScore(score)
    const tips =
      level === '新鲜'
        ? ['颜色和纹理表现良好，可正常购买。', '回家后尽快冷藏，优先 2 天内食用。']
        : level === '一般'
          ? ['建议少量购买，优先当天使用。', '注意异味与软烂区域。']
          : ['建议谨慎购买或放弃。', '如已购买，请尽快拍照留存并与商家沟通。']

    const check = await dataRepository.createGroceryFreshnessCheck({
      checkId: createId('grocery-fresh'),
      ownerId: user.id,
      imageName,
      freshnessScore: score,
      freshnessLevel: level,
      summary: `识别结果：${level}（${score}分）`,
      tips,
      createdAt: new Date().toISOString(),
    })

    return { data: check }
  }

  async function listFreshnessChecks(user) {
    const data = await dataRepository.listGroceryFreshnessChecks(user.id, 30)
    return { data }
  }

  async function buildBudgetPlan(user, payload) {
    const preference = await getPreference(user.id)
    const budgetRes = readBoundedNumber(payload, 'budgetPerMeal', {
      min: 5,
      max: 300,
      fallback: Number(preference.budgetPerMeal ?? 20),
      code: 'GROCERY_INVALID_BUDGET',
      label: '每餐预算',
    })
    if (budgetRes.error) return budgetRes.error

    const familyRes = readBoundedNumber(payload, 'familySize', {
      min: 1,
      max: 10,
      fallback: Number(preference.familySize ?? 2),
      code: 'GROCERY_INVALID_FAMILY_SIZE',
      label: '家庭人数',
      integer: true,
    })
    if (familyRes.error) return familyRes.error

    const mealsRes = readBoundedNumber(payload, 'mealsPerDay', {
      min: 1,
      max: 4,
      fallback: 2,
      code: 'GROCERY_INVALID_MEALS_PER_DAY',
      label: '每日做饭餐次',
      integer: true,
    })
    if (mealsRes.error) return mealsRes.error

    const budgetPerMeal = budgetRes.value
    const familySize = familyRes.value
    const mealsPerDay = mealsRes.value

    const dailyBudget = Number((budgetPerMeal * familySize * mealsPerDay).toFixed(2))
    const weeklyBudget = Number((dailyBudget * 7).toFixed(2))
    const monthlyBudget = Number((dailyBudget * 30).toFixed(2))

    return {
      data: {
        budgetPerMeal,
        familySize,
        mealsPerDay,
        dailyBudget,
        weeklyBudget,
        monthlyBudget,
        splitSuggestion: {
          vegetable: Number((dailyBudget * 0.32).toFixed(2)),
          protein: Number((dailyBudget * 0.38).toFixed(2)),
          staple: Number((dailyBudget * 0.2).toFixed(2)),
          seasoningAndOthers: Number((dailyBudget * 0.1).toFixed(2)),
        },
      },
    }
  }

  async function getDashboard(user) {
    const preference = await getPreference(user.id)
    const feeds = await getFeeds()
    const deals = (await listDeals()).data.slice(0, 8)
    const recommendation = (await recommendToday(user, preference)).data
    const freshnessChecks = await dataRepository.listGroceryFreshnessChecks(user.id, 6)

    return {
      data: {
        preference,
        stats: {
          feedCount: feeds.length,
          platformCount: new Set(feeds.map((item) => item.platform)).size,
          dealCount: deals.length,
          freshnessChecks: freshnessChecks.length,
        },
        todayRecommendation: recommendation,
        deals,
        recentFreshnessChecks: freshnessChecks,
        complianceNote:
          '本服务仅提供公开价格信息分析与消费决策建议，不代下单、不抢券、不触达私有数据。',
      },
    }
  }

  return {
    getDashboard,
    comparePrices,
    recommendToday,
    buildWeeklyMenu,
    listDeals,
    checkFreshness,
    listFreshnessChecks,
    buildBudgetPlan,
    getPreference,
    savePreference,
  }
}
