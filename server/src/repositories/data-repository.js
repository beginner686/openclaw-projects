import mysql from 'mysql2/promise'

function toJson(value) {
  return JSON.stringify(value ?? [])
}

function parseJson(value, fallback = []) {
  if (!value) return fallback
  if (Array.isArray(value)) return value
  if (Buffer.isBuffer(value)) {
    value = value.toString('utf8')
  }
  if (typeof value === 'object') {
    return value
  }
  if (typeof value !== 'string') {
    return fallback
  }
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function toIso(input) {
  if (!input) return new Date().toISOString()
  return new Date(input).toISOString()
}

function toMysqlDateTime(input) {
  return input ? new Date(input) : new Date()
}

function extractReportFile(reportUrl) {
  if (!reportUrl) return null
  const clean = String(reportUrl).split('?')[0]
  const fileName = clean.split('/').pop()
  return fileName || null
}

function mapUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    passwordSalt: row.password_salt,
    passwordHash: row.password_hash,
    passwordAlgo: row.password_algo ?? 'sha256',
    enabledModules: parseJson(row.enabled_modules_json, []),
    role: row.role,
    tokenState: row.token_state ?? 'active',
    tokenVersion: Number(row.token_version ?? 0),
  }
}

function mapTaskRow(row) {
  return {
    taskId: row.task_id,
    ownerId: row.owner_id,
    moduleKey: row.module_key,
    scenario: row.scenario,
    inputText: row.input_text,
    attachments: parseJson(row.attachments_json, []),
    status: row.status,
    summary: row.summary,
    reportUrl: row.report_url ?? '',
    reportFormat: row.report_format ?? 'html',
    errorMessage: row.error_message ?? undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function mapAntiFraudSubscriptionRow(row) {
  if (!row) return null
  return {
    ownerId: row.owner_id,
    planCode: row.plan_code,
    planName: row.plan_name,
    status: row.status,
    startsAt: toIso(row.starts_at),
    expiresAt: toIso(row.expires_at),
    maxTargets: Number(row.max_targets ?? 0),
    reportFrequency: row.report_frequency ?? 'weekly',
    realtimeAlerts: Boolean(row.realtime_alerts),
    productScreening: Boolean(row.product_screening),
    complaintQuotaMonth: Number(row.complaint_quota_month ?? 0),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function mapAntiFraudTargetRow(row) {
  return {
    targetId: row.target_id,
    ownerId: row.owner_id,
    targetType: row.target_type,
    platform: row.platform,
    anchorName: row.anchor_name,
    accountHandle: row.account_handle,
    roomLink: row.room_link ?? '',
    notes: row.notes ?? '',
    status: row.status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function mapAntiFraudScanRow(row) {
  return {
    scanId: row.scan_id,
    ownerId: row.owner_id,
    targetId: row.target_id ?? '',
    sourceTitle: row.source_title,
    sourceLink: row.source_link ?? '',
    contentText: row.content_text ?? '',
    riskLevel: row.risk_level,
    riskScore: Number(row.risk_score ?? 0),
    riskTags: parseJson(row.risk_tags_json, []),
    hitPhrases: parseJson(row.hit_phrases_json, []),
    summary: row.summary ?? '',
    safeAdvice: row.safe_advice ?? '',
    createdAt: toIso(row.created_at),
  }
}

function mapAntiFraudEvidenceRow(row) {
  return {
    evidenceId: row.evidence_id,
    ownerId: row.owner_id,
    scanId: row.scan_id,
    targetId: row.target_id ?? '',
    sourceLink: row.source_link ?? '',
    capturedAt: toIso(row.captured_at),
    violationPoints: parseJson(row.violation_points_json, []),
    snapshotText: row.snapshot_text ?? '',
    status: row.status,
    createdAt: toIso(row.created_at),
  }
}

function mapAntiFraudReportRow(row) {
  return {
    reportId: row.report_id,
    ownerId: row.owner_id,
    periodType: row.period_type,
    periodStart: toIso(row.period_start),
    periodEnd: toIso(row.period_end),
    overview: parseJson(row.overview_json, {}),
    highRiskItems: parseJson(row.high_risk_json, []),
    safeItems: parseJson(row.safe_content_json, []),
    recommendations: parseJson(row.recommendations_json, []),
    createdAt: toIso(row.created_at),
  }
}

function mapAntiFraudComplaintRow(row) {
  return {
    complaintId: row.complaint_id,
    ownerId: row.owner_id,
    status: row.status,
    scenario: row.scenario,
    evidenceIds: parseJson(row.evidence_ids_json, []),
    transactionNotes: row.transaction_notes ?? '',
    factsSummary: row.facts_summary ?? '',
    generatedText: row.generated_text ?? '',
    channelSuggestions: parseJson(row.channel_suggestions_json, []),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function mapGroceryFeedRow(row) {
  return {
    feedId: Number(row.id),
    platform: row.platform,
    itemName: row.item_name,
    category: row.category,
    displaySpec: row.display_spec,
    specWeightG: Number(row.spec_weight_g ?? 500),
    price: Number(row.price ?? 0),
    dealTag: row.deal_tag ?? '',
    sourceTitle: row.source_title ?? '',
    sourceLink: row.source_link ?? '',
    capturedAt: toIso(row.captured_at),
  }
}

function mapGroceryPreferenceRow(row) {
  if (!row) return null
  return {
    ownerId: row.owner_id,
    budgetPerMeal: Number(row.budget_per_meal ?? 20),
    familySize: Number(row.family_size ?? 2),
    dietaryNotes: row.dietary_notes ?? '',
    updatedAt: toIso(row.updated_at),
  }
}

function mapGroceryFreshnessRow(row) {
  return {
    checkId: row.check_id,
    ownerId: row.owner_id,
    imageName: row.image_name,
    freshnessScore: Number(row.freshness_score ?? 0),
    freshnessLevel: row.freshness_level,
    summary: row.summary ?? '',
    tips: parseJson(row.tips_json, []),
    createdAt: toIso(row.created_at),
  }
}

export function createDataRepository({
  env,
  moduleCatalog,
  securityService,
  getModuleName,
  normalizeModuleKey,
  getModuleKeyVariants,
}) {
  let pool = null

  async function ensureDatabaseExists() {
    const connection = await mysql.createConnection({
      host: env.mysqlHost,
      port: env.mysqlPort,
      user: env.mysqlUser,
      password: env.mysqlPassword,
      charset: 'utf8mb4',
    })
    try {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.mysqlDatabase}\` DEFAULT CHARACTER SET utf8mb4`)
    } finally {
      await connection.end()
    }
  }

  async function ensurePool() {
    if (pool) {
      return pool
    }
    await ensureDatabaseExists()
    pool = mysql.createPool({
      host: env.mysqlHost,
      port: env.mysqlPort,
      user: env.mysqlUser,
      password: env.mysqlPassword,
      database: env.mysqlDatabase,
      connectionLimit: env.mysqlPoolSize,
      charset: 'utf8mb4',
      namedPlaceholders: true,
    })
    return pool
  }

  function normalizeModuleKeys(moduleKeys) {
    return [...new Set((moduleKeys ?? []).map((item) => normalizeModuleKey(item)))]
  }

  function mapUser(row) {
    const user = mapUserRow(row)
    return {
      ...user,
      enabledModules: normalizeModuleKeys(user.enabledModules),
    }
  }

  function mapTask(row) {
    const task = mapTaskRow(row)
    return {
      ...task,
      moduleKey: normalizeModuleKey(task.moduleKey),
    }
  }

  function nowIso(hoursAgo = 0) {
    return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
  }

  function createSeedTasks(ownerId, enabledModules) {
    const ownerSeed = ownerId.replace(/[^a-zA-Z0-9_-]/g, '')
    return normalizeModuleKeys(enabledModules)
      .slice(0, 4)
      .flatMap((moduleKey, index) => {
        const moduleName = getModuleName(moduleKey)
        return [
          {
            taskId: `${ownerSeed}-${moduleKey}-seed-${index + 1}-a`,
            ownerId,
            moduleKey,
            scenario: '标准流程',
            inputText: `${moduleName}初始化样例任务，生成首版分析报告。`,
            attachments: [],
            status: 'completed',
            summary: `${moduleName}初始化任务已完成。`,
            updatedAt: nowIso(index + 3),
            createdAt: nowIso(index + 5),
            reportUrl: '',
            reportFormat: 'html',
            errorMessage: undefined,
          },
          {
            taskId: `${ownerSeed}-${moduleKey}-seed-${index + 1}-b`,
            ownerId,
            moduleKey,
            scenario: '加急执行',
            inputText: `请基于最新输入继续处理${moduleName}任务。`,
            attachments: [],
            status: 'queued',
            summary: `${moduleName}任务已进入执行队列。`,
            updatedAt: nowIso(index + 1),
            createdAt: nowIso(index + 2),
            reportUrl: '',
            reportFormat: 'html',
            errorMessage: undefined,
          },
        ]
      })
  }

  async function setupSchema() {
    const p = await ensurePool()
    await p.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        contact VARCHAR(191) NOT NULL UNIQUE,
        password_salt VARCHAR(128) NOT NULL,
        password_hash VARCHAR(256) NOT NULL,
        password_algo VARCHAR(20) NOT NULL DEFAULT 'bcrypt',
        enabled_modules_json JSON NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'customer',
        token_state VARCHAR(20) NOT NULL DEFAULT 'active',
        token_version INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        task_id VARCHAR(128) NOT NULL UNIQUE,
        owner_id VARCHAR(64) NOT NULL,
        module_key VARCHAR(100) NOT NULL,
        scenario VARCHAR(100) NOT NULL,
        input_text TEXT NOT NULL,
        attachments_json JSON NOT NULL,
        status VARCHAR(20) NOT NULL,
        summary TEXT NOT NULL,
        report_url VARCHAR(512) NULL,
        report_file VARCHAR(191) NULL,
        report_format VARCHAR(20) NOT NULL DEFAULT 'html',
        error_message TEXT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        INDEX idx_tasks_owner_module_updated (owner_id, module_key, updated_at),
        INDEX idx_tasks_status_created (status, created_at),
        INDEX idx_tasks_report_file (report_file),
        CONSTRAINT fk_tasks_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS module_settings (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        module_key VARCHAR(100) NOT NULL UNIQUE,
        config_json JSON NOT NULL,
        updated_by VARCHAR(64) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)
  }

  async function ensureSchemaMigrations() {
    const p = await ensurePool()
    const [algoCols] = await p.query("SHOW COLUMNS FROM users LIKE 'password_algo'")
    if (!algoCols.length) {
      await p.query("ALTER TABLE users ADD COLUMN password_algo VARCHAR(20) NOT NULL DEFAULT 'sha256' AFTER password_hash")
    }

    const [tokenVersionCols] = await p.query("SHOW COLUMNS FROM users LIKE 'token_version'")
    if (!tokenVersionCols.length) {
      await p.query("ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER token_state")
    }

    const [reportFileCols] = await p.query("SHOW COLUMNS FROM tasks LIKE 'report_file'")
    if (!reportFileCols.length) {
      await p.query("ALTER TABLE tasks ADD COLUMN report_file VARCHAR(191) NULL AFTER report_url")
    }

    const [reportFileIndexes] = await p.query("SHOW INDEX FROM tasks WHERE Key_name = 'idx_tasks_report_file'")
    if (!reportFileIndexes.length) {
      await p.query('CREATE INDEX idx_tasks_report_file ON tasks(report_file)')
    }

    await p.query(`
      UPDATE users
      SET password_algo = CASE
        WHEN password_hash LIKE '$2%' THEN 'bcrypt'
        ELSE 'sha256'
      END
      WHERE password_algo IS NULL OR password_algo = ''
    `)

    await p.query(`
      UPDATE tasks
      SET report_file = SUBSTRING_INDEX(SUBSTRING_INDEX(report_url, '?', 1), '/', -1)
      WHERE report_url IS NOT NULL
        AND report_url <> ''
        AND (report_file IS NULL OR report_file = '')
    `)
  }

  async function ensureModuleKeyMigrations() {
    const p = await ensurePool()
    const [userRows] = await p.query('SELECT id, enabled_modules_json FROM users')

    for (const row of userRows) {
      const currentModules = parseJson(row.enabled_modules_json, [])
      const normalizedModules = normalizeModuleKeys(currentModules)
      if (JSON.stringify(currentModules) === JSON.stringify(normalizedModules)) {
        continue
      }

      await p.query(
        `UPDATE users
         SET enabled_modules_json = CAST(? AS JSON), updated_at = ?
         WHERE id = ?`,
        [toJson(normalizedModules), new Date(), row.id],
      )
    }

    const legacyToCanonical = [
      ['matchmaking-ai', normalizeModuleKey('matchmaking-ai')],
      ['job-lead-capture', normalizeModuleKey('job-lead-capture')],
      ['content-auto-publishing', normalizeModuleKey('content-auto-publishing')],
    ]

    for (const [legacyKey, canonicalKey] of legacyToCanonical) {
      if (legacyKey === canonicalKey) {
        continue
      }
      await p.query('UPDATE tasks SET module_key = ? WHERE module_key = ?', [canonicalKey, legacyKey])
    }
  }

  async function ensureRequiredModuleAccess(requiredModuleKeys = []) {
    if (!requiredModuleKeys.length) {
      return
    }

    const requiredKeys = normalizeModuleKeys(requiredModuleKeys)
    const p = await ensurePool()
    const [rows] = await p.query('SELECT id, enabled_modules_json FROM users')

    for (const row of rows) {
      const currentModules = normalizeModuleKeys(parseJson(row.enabled_modules_json, []))
      const mergedModules = [...new Set([...currentModules, ...requiredKeys])]
      if (mergedModules.length === currentModules.length) {
        continue
      }

      await p.query(
        `UPDATE users
         SET enabled_modules_json = CAST(? AS JSON), updated_at = ?
         WHERE id = ?`,
        [toJson(mergedModules), new Date(), row.id],
      )
    }
  }

  async function seedIfEmpty() {
    const p = await ensurePool()
    const [[userCountRow]] = await p.query('SELECT COUNT(*) AS c FROM users')
    const [[taskCountRow]] = await p.query('SELECT COUNT(*) AS c FROM tasks')
    const [[subscriptionCountRow]] = await p.query('SELECT COUNT(*) AS c FROM anti_fraud_subscriptions')
    const [[targetCountRow]] = await p.query('SELECT COUNT(*) AS c FROM anti_fraud_targets')
    const [[scanCountRow]] = await p.query('SELECT COUNT(*) AS c FROM anti_fraud_scans')
    const [[evidenceCountRow]] = await p.query('SELECT COUNT(*) AS c FROM anti_fraud_evidences')
    const [[reportCountRow]] = await p.query('SELECT COUNT(*) AS c FROM anti_fraud_reports')
    const [[complaintCountRow]] = await p.query('SELECT COUNT(*) AS c FROM anti_fraud_complaints')
    const [[groceryFeedCountRow]] = await p.query('SELECT COUNT(*) AS c FROM grocery_price_feeds')
    const [[groceryPreferenceCountRow]] = await p.query('SELECT COUNT(*) AS c FROM grocery_user_preferences')
    const usersCount = Number(userCountRow.c)
    const tasksCount = Number(taskCountRow.c)
    const subscriptionCount = Number(subscriptionCountRow.c)
    const targetCount = Number(targetCountRow.c)
    const scanCount = Number(scanCountRow.c)
    const evidenceCount = Number(evidenceCountRow.c)
    const reportCount = Number(reportCountRow.c)
    const complaintCount = Number(complaintCountRow.c)
    const groceryFeedCount = Number(groceryFeedCountRow.c)
    const groceryPreferenceCount = Number(groceryPreferenceCountRow.c)

    if (usersCount === 0) {
      const fullModules = moduleCatalog.map((item) => item.moduleKey)
      const demoUser = securityService.createStoredUser({
        id: 'u-demo-001',
        name: '演示客户',
        contact: 'demo@openclaw.ai',
        password: '123456',
        enabledModules: fullModules,
      })
      const liteUser = securityService.createStoredUser({
        id: 'u-lite-002',
        name: '轻量客户',
        contact: 'lite@openclaw.ai',
        password: '123456',
        enabledModules: fullModules.slice(0, 8),
      })

      await insertUser(demoUser)
      await insertUser(liteUser)
    }

    if (tasksCount === 0) {
      const [rows] = await p.query('SELECT * FROM users ORDER BY created_at ASC LIMIT 10')
      const seedTasks = rows.flatMap((row) => {
        const user = mapUser(row)
        return createSeedTasks(user.id, user.enabledModules)
      })
      await insertTasks(seedTasks)
    }

    const [seedUsers] = await p.query('SELECT * FROM users ORDER BY created_at ASC LIMIT 20')
    if (subscriptionCount === 0) {
      for (const row of seedUsers) {
        const user = mapUser(row)
        if (user.id === 'u-demo-001') {
          await upsertAntiFraudSubscription(user.id, {
            planCode: 'standard',
            planName: '标准版',
            status: 'active',
            startsAt: nowIso(24),
            expiresAt: nowIso(-24 * 90),
            maxTargets: 2,
            reportFrequency: 'daily',
            realtimeAlerts: true,
            productScreening: true,
            complaintQuotaMonth: 6,
          })
        } else {
          await upsertAntiFraudSubscription(user.id, {
            planCode: 'basic',
            planName: '基础版',
            status: 'active',
            startsAt: nowIso(24),
            expiresAt: nowIso(-24 * 30),
            maxTargets: 1,
            reportFrequency: 'weekly',
            realtimeAlerts: false,
            productScreening: false,
            complaintQuotaMonth: 2,
          })
        }
      }
    }

    if (targetCount === 0) {
      await createAntiFraudTarget({
        targetId: 'af-target-demo-01',
        ownerId: 'u-demo-001',
        targetType: 'short-video-account',
        platform: 'douyin',
        anchorName: '养生课堂A',
        accountHandle: '@health-a',
        roomLink: 'https://example.com/live/health-a',
        notes: '父母高频观看账号，重点监测。',
        status: 'active',
        createdAt: nowIso(12),
        updatedAt: nowIso(12),
      })
      await createAntiFraudTarget({
        targetId: 'af-target-demo-02',
        ownerId: 'u-demo-001',
        targetType: 'live-room',
        platform: 'kuaishou',
        anchorName: '名医速成课',
        accountHandle: '@doctor-fast',
        roomLink: 'https://example.com/live/doctor-fast',
        notes: '直播间存在高风险销售话术。',
        status: 'active',
        createdAt: nowIso(10),
        updatedAt: nowIso(10),
      })
      await createAntiFraudTarget({
        targetId: 'af-target-lite-01',
        ownerId: 'u-lite-002',
        targetType: 'short-video-account',
        platform: 'douyin',
        anchorName: '健康分享B',
        accountHandle: '@health-b',
        roomLink: 'https://example.com/live/health-b',
        notes: '轻量账号测试样本。',
        status: 'active',
        createdAt: nowIso(9),
        updatedAt: nowIso(9),
      })
    }

    if (scanCount === 0) {
      await createAntiFraudScan({
        scanId: 'af-scan-demo-001',
        ownerId: 'u-demo-001',
        targetId: 'af-target-demo-01',
        sourceTitle: '直播切片：三天逆转慢病',
        sourceLink: 'https://example.com/video/af-001',
        contentText: '包治百病，不用吃药，医院都没法治，我们能治。',
        riskLevel: 'high',
        riskScore: 96,
        riskTags: ['夸大宣传', '替代正规治疗', '绝对化承诺'],
        hitPhrases: ['包治百病', '不用吃药', '医院都没法治'],
        summary: '检测到高风险健康夸大宣传，请勿购买相关产品。',
        safeAdvice: '仅保留客观健康常识，必要时咨询正规医疗机构。',
        createdAt: nowIso(8),
      })
      await createAntiFraudScan({
        scanId: 'af-scan-demo-002',
        ownerId: 'u-demo-001',
        targetId: 'af-target-demo-02',
        sourceTitle: '短视频：血管清理秘方',
        sourceLink: 'https://example.com/video/af-002',
        contentText: '所有医生都不知道的秘密，降压降糖立刻见效。',
        riskLevel: 'high',
        riskScore: 91,
        riskTags: ['假权威话术', '医疗功效暗示'],
        hitPhrases: ['所有医生都不知道的秘密', '降压降糖立刻见效'],
        summary: '检测到高风险功效暗示内容，建议立即屏蔽并存证。',
        safeAdvice: '拒绝功效承诺类营销内容，保留证据后按流程投诉。',
        createdAt: nowIso(6),
      })
      await createAntiFraudScan({
        scanId: 'af-scan-lite-001',
        ownerId: 'u-lite-002',
        targetId: 'af-target-lite-01',
        sourceTitle: '健康饮食建议',
        sourceLink: 'https://example.com/video/af-lite-001',
        contentText: '建议规律作息、合理饮食，避免夸大宣传产品。',
        riskLevel: 'low',
        riskScore: 18,
        riskTags: ['客观科普'],
        hitPhrases: [],
        summary: '内容以常规健康建议为主，风险低。',
        safeAdvice: '可继续关注，但保持理性消费习惯。',
        createdAt: nowIso(5),
      })
    }

    if (evidenceCount === 0) {
      await createAntiFraudEvidence({
        evidenceId: 'af-evidence-demo-001',
        ownerId: 'u-demo-001',
        scanId: 'af-scan-demo-001',
        targetId: 'af-target-demo-01',
        sourceLink: 'https://example.com/video/af-001',
        capturedAt: nowIso(8),
        violationPoints: ['出现“包治百病”绝对化承诺', '出现“医院都没法治，我们能治”替代治疗话术'],
        snapshotText: '截图帧 #12,#23 保存成功；直播标题含高风险短语。',
        status: 'archived',
        createdAt: nowIso(8),
      })
      await createAntiFraudEvidence({
        evidenceId: 'af-evidence-demo-002',
        ownerId: 'u-demo-001',
        scanId: 'af-scan-demo-002',
        targetId: 'af-target-demo-02',
        sourceLink: 'https://example.com/video/af-002',
        capturedAt: nowIso(6),
        violationPoints: ['出现“所有医生都不知道的秘密”假权威话术', '出现“降压降糖立刻见效”功效暗示'],
        snapshotText: '视频链接、发布时间、账号主页已归档。',
        status: 'archived',
        createdAt: nowIso(6),
      })
    }

    if (reportCount === 0) {
      await createAntiFraudReport({
        reportId: 'af-report-demo-weekly-001',
        ownerId: 'u-demo-001',
        periodType: 'weekly',
        periodStart: nowIso(24 * 7),
        periodEnd: nowIso(0),
        overview: {
          totalScanned: 12,
          highRiskCount: 4,
          mediumRiskCount: 3,
          lowRiskCount: 5,
        },
        highRiskItems: [
          { scanId: 'af-scan-demo-001', title: '直播切片：三天逆转慢病', riskLevel: 'high' },
          { scanId: 'af-scan-demo-002', title: '短视频：血管清理秘方', riskLevel: 'high' },
        ],
        safeItems: [{ scanId: 'af-scan-lite-001', title: '健康饮食建议', riskLevel: 'low' }],
        recommendations: ['继续监测高风险主播并屏蔽重复违规内容。', '提醒家人避免冲动下单，先核验信息来源。'],
        createdAt: nowIso(2),
      })
    }

    if (complaintCount === 0) {
      await createAntiFraudComplaint({
        complaintId: 'af-complaint-demo-001',
        ownerId: 'u-demo-001',
        status: 'ready',
        scenario: 'false-health-promotion',
        evidenceIds: ['af-evidence-demo-001'],
        transactionNotes: '2026-03-10 通过直播间下单，金额 299 元。',
        factsSummary: '主播在直播中使用绝对化承诺并引导下单。',
        generatedText: '投诉请求：请核查该直播账号存在夸大健康宣传并误导消费行为，附证据材料。',
        channelSuggestions: ['12315', '平台举报'],
        createdAt: nowIso(1),
        updatedAt: nowIso(1),
      })
    }

    if (groceryFeedCount === 0) {
      const feedSeed = [
        { platform: '朴朴', itemName: '西红柿', category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 3.99, dealTag: '特价', sourceTitle: '今日鲜蔬', sourceLink: 'https://example.com/grocery/pupu/tomato' },
        { platform: '多多买菜', itemName: '西红柿', category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 4.29, dealTag: '日常价', sourceTitle: '蔬菜专区', sourceLink: 'https://example.com/grocery/dd/tomato' },
        { platform: '美团优选', itemName: '西红柿', category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 4.59, dealTag: '日常价', sourceTitle: '每日优选', sourceLink: 'https://example.com/grocery/meituan/tomato' },
        { platform: '盒马', itemName: '黄瓜', category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 3.69, dealTag: '爆款', sourceTitle: '生鲜热卖', sourceLink: 'https://example.com/grocery/hema/cucumber' },
        { platform: '朴朴', itemName: '黄瓜', category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 3.89, dealTag: '日常价', sourceTitle: '今日鲜蔬', sourceLink: 'https://example.com/grocery/pupu/cucumber' },
        { platform: '多多买菜', itemName: '土豆', category: 'vegetable', displaySpec: '1000g', specWeightG: 1000, price: 4.99, dealTag: '特价', sourceTitle: '家庭装', sourceLink: 'https://example.com/grocery/dd/potato' },
        { platform: '美团优选', itemName: '土豆', category: 'vegetable', displaySpec: '1000g', specWeightG: 1000, price: 5.49, dealTag: '日常价', sourceTitle: '家常菜', sourceLink: 'https://example.com/grocery/meituan/potato' },
        { platform: '盒马', itemName: '鸡蛋', category: 'protein', displaySpec: '10枚', specWeightG: 550, price: 8.90, dealTag: '特价', sourceTitle: '早餐专区', sourceLink: 'https://example.com/grocery/hema/egg' },
        { platform: '朴朴', itemName: '鸡蛋', category: 'protein', displaySpec: '10枚', specWeightG: 550, price: 9.50, dealTag: '日常价', sourceTitle: '早餐专区', sourceLink: 'https://example.com/grocery/pupu/egg' },
        { platform: '多多买菜', itemName: '鸡胸肉', category: 'protein', displaySpec: '500g', specWeightG: 500, price: 12.80, dealTag: '限时', sourceTitle: '肉禽优选', sourceLink: 'https://example.com/grocery/dd/chicken-breast' },
        { platform: '美团优选', itemName: '鸡胸肉', category: 'protein', displaySpec: '500g', specWeightG: 500, price: 13.50, dealTag: '日常价', sourceTitle: '肉禽优选', sourceLink: 'https://example.com/grocery/meituan/chicken-breast' },
        { platform: '盒马', itemName: '鸡胸肉', category: 'protein', displaySpec: '500g', specWeightG: 500, price: 14.20, dealTag: '日常价', sourceTitle: '肉禽优选', sourceLink: 'https://example.com/grocery/hema/chicken-breast' },
        { platform: '朴朴', itemName: '五花肉', category: 'protein', displaySpec: '500g', specWeightG: 500, price: 19.90, dealTag: '日常价', sourceTitle: '猪肉专区', sourceLink: 'https://example.com/grocery/pupu/pork-belly' },
        { platform: '美团优选', itemName: '五花肉', category: 'protein', displaySpec: '500g', specWeightG: 500, price: 18.60, dealTag: '特价', sourceTitle: '猪肉专区', sourceLink: 'https://example.com/grocery/meituan/pork-belly' },
        { platform: '多多买菜', itemName: '大米', category: 'staple', displaySpec: '2500g', specWeightG: 2500, price: 12.90, dealTag: '爆款', sourceTitle: '粮油主食', sourceLink: 'https://example.com/grocery/dd/rice' },
        { platform: '朴朴', itemName: '大米', category: 'staple', displaySpec: '2500g', specWeightG: 2500, price: 14.50, dealTag: '日常价', sourceTitle: '粮油主食', sourceLink: 'https://example.com/grocery/pupu/rice' },
        { platform: '盒马', itemName: '挂面', category: 'staple', displaySpec: '1000g', specWeightG: 1000, price: 6.80, dealTag: '特价', sourceTitle: '主食专区', sourceLink: 'https://example.com/grocery/hema/noodle' },
        { platform: '美团优选', itemName: '挂面', category: 'staple', displaySpec: '1000g', specWeightG: 1000, price: 7.10, dealTag: '日常价', sourceTitle: '主食专区', sourceLink: 'https://example.com/grocery/meituan/noodle' },
        { platform: '朴朴', itemName: '青菜', category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 2.99, dealTag: '限时', sourceTitle: '今日鲜蔬', sourceLink: 'https://example.com/grocery/pupu/greens' },
        { platform: '多多买菜', itemName: '青菜', category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 3.49, dealTag: '日常价', sourceTitle: '今日鲜蔬', sourceLink: 'https://example.com/grocery/dd/greens' },
      ].map((item) => ({ ...item, capturedAt: nowIso(0) }))
      await insertGroceryFeeds(feedSeed)
    }

    if (groceryPreferenceCount === 0) {
      await upsertGroceryPreference('u-demo-001', {
        budgetPerMeal: 25,
        familySize: 3,
        dietaryNotes: '少油少盐，偏家常菜',
      })
      await upsertGroceryPreference('u-lite-002', {
        budgetPerMeal: 18,
        familySize: 2,
        dietaryNotes: '快手菜优先',
      })
    }
  }

  async function ensureInitialized() {
    await ensurePool()
    await setupSchema()
    await ensureSchemaMigrations()
    await ensureModuleKeyMigrations()
    await seedIfEmpty()
    await ensureRequiredModuleAccess(['anti-fraud-guardian', 'smart-grocery-supermarket'])
  }

  async function insertUser(user) {
    const p = await ensurePool()
    const enabledModules = normalizeModuleKeys(user.enabledModules)
    await p.query(
      `INSERT INTO users
      (id, name, contact, password_salt, password_hash, password_algo, enabled_modules_json, role, token_state, token_version)
      VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.contact,
        user.passwordSalt,
        user.passwordHash,
        user.passwordAlgo ?? 'bcrypt',
        toJson(enabledModules),
        user.role,
        user.tokenState,
        Number(user.tokenVersion ?? 0),
      ],
    )
  }

  async function insertTasks(tasks) {
    if (!tasks.length) return
    const p = await ensurePool()
    const conn = await p.getConnection()
    try {
      await conn.beginTransaction()
      for (const task of tasks) {
        const normalizedModuleKey = normalizeModuleKey(task.moduleKey)
        await conn.query(
          `INSERT INTO tasks
          (task_id, owner_id, module_key, scenario, input_text, attachments_json, status, summary, report_url, report_file, report_format, error_message, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.taskId,
            task.ownerId,
            normalizedModuleKey,
            task.scenario,
            task.inputText,
            toJson(task.attachments),
            task.status,
            task.summary,
            task.reportUrl || null,
            extractReportFile(task.reportUrl),
            task.reportFormat || 'html',
            task.errorMessage || null,
            toMysqlDateTime(task.createdAt),
            toMysqlDateTime(task.updatedAt),
          ],
        )
      }
      await conn.commit()
    } catch (error) {
      await conn.rollback()
      throw error
    } finally {
      conn.release()
    }
  }

  async function findUserByContact(contact) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM users WHERE contact = ? LIMIT 1', [contact])
    return rows.length ? mapUser(rows[0]) : null
  }

  async function findUserById(id) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id])
    return rows.length ? mapUser(rows[0]) : null
  }

  async function contactExists(contact) {
    const p = await ensurePool()
    const [[row]] = await p.query('SELECT COUNT(*) AS c FROM users WHERE contact = ?', [contact])
    return Number(row.c) > 0
  }

  async function setUserTokenState(userId, tokenState) {
    const p = await ensurePool()
    await p.query('UPDATE users SET token_state = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [tokenState, userId])
  }

  async function incrementUserTokenVersion(userId) {
    const p = await ensurePool()
    await p.query('UPDATE users SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [userId])
    const [rows] = await p.query('SELECT token_version FROM users WHERE id = ? LIMIT 1', [userId])
    return rows.length ? Number(rows[0].token_version ?? 0) : 0
  }

  async function listTasksByUserAndModule(ownerId, moduleKey, limit = 12) {
    const variants = getModuleKeyVariants(moduleKey)
    const placeholders = variants.map(() => '?').join(', ')
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT * FROM tasks WHERE owner_id = ? AND module_key IN (${placeholders})
       ORDER BY updated_at DESC LIMIT ?`,
      [ownerId, ...variants, limit],
    )
    return rows.map(mapTask)
  }

  async function listRecentTasksForUser(ownerId, enabledModules, limit = 8) {
    if (!enabledModules.length) return []
    const modules = [...new Set(enabledModules.flatMap((item) => getModuleKeyVariants(item)))]
    const placeholders = modules.map(() => '?').join(', ')
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT * FROM tasks
       WHERE owner_id = ? AND module_key IN (${placeholders})
       ORDER BY updated_at DESC LIMIT ?`,
      [ownerId, ...modules, limit],
    )
    return rows.map(mapTask)
  }

  async function findTaskByIdForUser(ownerId, moduleKey, taskId) {
    const variants = getModuleKeyVariants(moduleKey)
    const placeholders = variants.map(() => '?').join(', ')
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT * FROM tasks
       WHERE owner_id = ? AND module_key IN (${placeholders}) AND task_id = ?
       LIMIT 1`,
      [ownerId, ...variants, taskId],
    )
    return rows.length ? mapTask(rows[0]) : null
  }

  async function findTaskById(taskId) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM tasks WHERE task_id = ? LIMIT 1', [taskId])
    return rows.length ? mapTask(rows[0]) : null
  }

  async function findTaskByReportFile(fileName) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM tasks WHERE report_file = ? LIMIT 1', [fileName])
    return rows.length ? mapTask(rows[0]) : null
  }

  async function createTask(task) {
    await insertTasks([task])
    return task
  }

  async function updateTask(task) {
    const p = await ensurePool()
    await p.query(
      `UPDATE tasks
       SET status = ?, summary = ?, updated_at = ?, report_url = ?, report_file = ?, report_format = ?, error_message = ?, scenario = ?, input_text = ?, attachments_json = CAST(? AS JSON)
       WHERE task_id = ?`,
      [
        task.status,
        task.summary,
        toMysqlDateTime(task.updatedAt),
        task.reportUrl || null,
        extractReportFile(task.reportUrl),
        task.reportFormat || 'html',
        task.errorMessage || null,
        task.scenario,
        task.inputText,
        toJson(task.attachments),
        task.taskId,
      ],
    )
  }

  async function trimTasks(maxRows = 3000) {
    const p = await ensurePool()
    await p.query(
      `DELETE FROM tasks
       WHERE id NOT IN (
         SELECT id FROM (
           SELECT id FROM tasks ORDER BY created_at DESC LIMIT ?
         ) AS kept
       )`,
      [maxRows],
    )
  }

  async function claimNextQueuedTask(excludedModuleKeys = []) {
    const p = await ensurePool()
    const conn = await p.getConnection()
    try {
      await conn.beginTransaction()
      const exclusionSql =
        Array.isArray(excludedModuleKeys) && excludedModuleKeys.length
          ? ` AND module_key NOT IN (${excludedModuleKeys.map(() => '?').join(', ')})`
          : ''
      const selectParams =
        Array.isArray(excludedModuleKeys) && excludedModuleKeys.length
          ? [...excludedModuleKeys]
          : []
      const [rows] = await conn.query(
        `SELECT * FROM tasks WHERE status = 'queued'${exclusionSql}
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE`,
        selectParams,
      )
      if (!rows.length) {
        await conn.commit()
        return null
      }
      const row = rows[0]
      const now = new Date()
      await conn.query(
        `UPDATE tasks
         SET status = 'running', summary = ?, updated_at = ?
         WHERE task_id = ?`,
        [`任务正在执行：${row.scenario}`, now, row.task_id],
      )
      await conn.commit()
      return {
        ...mapTask(row),
        status: 'running',
        summary: `任务正在执行：${row.scenario}`,
        updatedAt: now.toISOString(),
      }
    } catch (error) {
      await conn.rollback()
      throw error
    } finally {
      conn.release()
    }
  }

  async function requeueRunningTasks() {
    const p = await ensurePool()
    await p.query(
      `UPDATE tasks
       SET status = 'queued',
           summary = '任务已恢复到排队状态，等待重新执行。',
           updated_at = ?
       WHERE status = 'running'`,
      [new Date()],
    )
  }

  async function listTasksByStatus(status, limit = 1000) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM tasks WHERE status = ? ORDER BY updated_at DESC LIMIT ?', [status, limit])
    return rows.map(mapTask)
  }

  async function insertGroceryFeeds(feeds) {
    if (!feeds.length) return
    const p = await ensurePool()
    const conn = await p.getConnection()
    try {
      await conn.beginTransaction()
      for (const feed of feeds) {
        await conn.query(
          `INSERT INTO grocery_price_feeds
          (platform, item_name, category, display_spec, spec_weight_g, price, deal_tag, source_title, source_link, captured_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            feed.platform,
            feed.itemName,
            feed.category,
            feed.displaySpec,
            Number(feed.specWeightG ?? 500),
            Number(feed.price ?? 0),
            feed.dealTag || null,
            feed.sourceTitle || null,
            feed.sourceLink || null,
            toMysqlDateTime(feed.capturedAt),
          ],
        )
      }
      await conn.commit()
    } catch (error) {
      await conn.rollback()
      throw error
    } finally {
      conn.release()
    }
  }

  async function listLatestGroceryFeeds(limit = 300) {
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT *
       FROM grocery_price_feeds
       ORDER BY captured_at DESC, id DESC
       LIMIT ?`,
      [limit],
    )
    return rows.map(mapGroceryFeedRow)
  }

  async function upsertGroceryPreference(ownerId, payload) {
    const p = await ensurePool()
    await p.query(
      `INSERT INTO grocery_user_preferences (owner_id, budget_per_meal, family_size, dietary_notes)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       budget_per_meal = VALUES(budget_per_meal),
       family_size = VALUES(family_size),
       dietary_notes = VALUES(dietary_notes),
       updated_at = CURRENT_TIMESTAMP(3)`,
      [ownerId, Number(payload.budgetPerMeal ?? 20), Number(payload.familySize ?? 2), payload.dietaryNotes ?? null],
    )
    return getGroceryPreference(ownerId)
  }

  async function getGroceryPreference(ownerId) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM grocery_user_preferences WHERE owner_id = ? LIMIT 1', [ownerId])
    return rows.length ? mapGroceryPreferenceRow(rows[0]) : null
  }

  async function createGroceryFreshnessCheck(record) {
    const p = await ensurePool()
    await p.query(
      `INSERT INTO grocery_freshness_checks
      (check_id, owner_id, image_name, freshness_score, freshness_level, summary, tips_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)`,
      [
        record.checkId,
        record.ownerId,
        record.imageName,
        Number(record.freshnessScore ?? 0),
        record.freshnessLevel,
        record.summary,
        toJson(record.tips ?? []),
        toMysqlDateTime(record.createdAt),
      ],
    )
    return findGroceryFreshnessCheck(record.ownerId, record.checkId)
  }

  async function findGroceryFreshnessCheck(ownerId, checkId) {
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT *
       FROM grocery_freshness_checks
       WHERE owner_id = ? AND check_id = ?
       LIMIT 1`,
      [ownerId, checkId],
    )
    return rows.length ? mapGroceryFreshnessRow(rows[0]) : null
  }

  async function listGroceryFreshnessChecks(ownerId, limit = 30) {
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT *
       FROM grocery_freshness_checks
       WHERE owner_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [ownerId, limit],
    )
    return rows.map(mapGroceryFreshnessRow)
  }

  async function upsertAntiFraudSubscription(ownerId, payload) {
    const p = await ensurePool()
    await p.query(
      `INSERT INTO anti_fraud_subscriptions
      (owner_id, plan_code, plan_name, status, starts_at, expires_at, max_targets, report_frequency, realtime_alerts, product_screening, complaint_quota_month)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      plan_code = VALUES(plan_code),
      plan_name = VALUES(plan_name),
      status = VALUES(status),
      starts_at = VALUES(starts_at),
      expires_at = VALUES(expires_at),
      max_targets = VALUES(max_targets),
      report_frequency = VALUES(report_frequency),
      realtime_alerts = VALUES(realtime_alerts),
      product_screening = VALUES(product_screening),
      complaint_quota_month = VALUES(complaint_quota_month),
      updated_at = CURRENT_TIMESTAMP(3)`,
      [
        ownerId,
        payload.planCode,
        payload.planName,
        payload.status,
        toMysqlDateTime(payload.startsAt),
        toMysqlDateTime(payload.expiresAt),
        Number(payload.maxTargets ?? 1),
        payload.reportFrequency ?? 'weekly',
        payload.realtimeAlerts ? 1 : 0,
        payload.productScreening ? 1 : 0,
        Number(payload.complaintQuotaMonth ?? 1),
      ],
    )
    return getAntiFraudSubscription(ownerId)
  }

  async function getAntiFraudSubscription(ownerId) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM anti_fraud_subscriptions WHERE owner_id = ? LIMIT 1', [ownerId])
    return rows.length ? mapAntiFraudSubscriptionRow(rows[0]) : null
  }

  async function createAntiFraudTarget(target) {
    const p = await ensurePool()
    await p.query(
      `INSERT INTO anti_fraud_targets
      (target_id, owner_id, target_type, platform, anchor_name, account_handle, room_link, notes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        target.targetId,
        target.ownerId,
        target.targetType,
        target.platform,
        target.anchorName,
        target.accountHandle,
        target.roomLink || null,
        target.notes || null,
        target.status ?? 'active',
        toMysqlDateTime(target.createdAt),
        toMysqlDateTime(target.updatedAt),
      ],
    )
    return findAntiFraudTargetById(target.ownerId, target.targetId)
  }

  async function findAntiFraudTargetById(ownerId, targetId) {
    const p = await ensurePool()
    const [rows] = await p.query(
      'SELECT * FROM anti_fraud_targets WHERE owner_id = ? AND target_id = ? LIMIT 1',
      [ownerId, targetId],
    )
    return rows.length ? mapAntiFraudTargetRow(rows[0]) : null
  }

  async function listAntiFraudTargets(ownerId, includeInactive = false) {
    const p = await ensurePool()
    const [rows] = includeInactive
      ? await p.query('SELECT * FROM anti_fraud_targets WHERE owner_id = ? ORDER BY updated_at DESC', [ownerId])
      : await p.query("SELECT * FROM anti_fraud_targets WHERE owner_id = ? AND status = 'active' ORDER BY updated_at DESC", [
          ownerId,
        ])
    return rows.map(mapAntiFraudTargetRow)
  }

  async function countActiveAntiFraudTargets(ownerId) {
    const p = await ensurePool()
    const [[row]] = await p.query(
      "SELECT COUNT(*) AS c FROM anti_fraud_targets WHERE owner_id = ? AND status = 'active'",
      [ownerId],
    )
    return Number(row.c ?? 0)
  }

  async function updateAntiFraudTarget(ownerId, targetId, payload) {
    const existing = await findAntiFraudTargetById(ownerId, targetId)
    if (!existing) return null
    const p = await ensurePool()
    await p.query(
      `UPDATE anti_fraud_targets
       SET target_type = ?, platform = ?, anchor_name = ?, account_handle = ?, room_link = ?, notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP(3)
       WHERE owner_id = ? AND target_id = ?`,
      [
        payload.targetType ?? existing.targetType,
        payload.platform ?? existing.platform,
        payload.anchorName ?? existing.anchorName,
        payload.accountHandle ?? existing.accountHandle,
        payload.roomLink ?? existing.roomLink,
        payload.notes ?? existing.notes,
        payload.status ?? existing.status,
        ownerId,
        targetId,
      ],
    )
    return findAntiFraudTargetById(ownerId, targetId)
  }

  async function removeAntiFraudTarget(ownerId, targetId) {
    const p = await ensurePool()
    await p.query('DELETE FROM anti_fraud_targets WHERE owner_id = ? AND target_id = ?', [ownerId, targetId])
  }

  async function createAntiFraudScan(scan) {
    const p = await ensurePool()
    await p.query(
      `INSERT INTO anti_fraud_scans
      (scan_id, owner_id, target_id, source_title, source_link, content_text, risk_level, risk_score, risk_tags_json, hit_phrases_json, summary, safe_advice, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?, ?)`,
      [
        scan.scanId,
        scan.ownerId,
        scan.targetId || null,
        scan.sourceTitle,
        scan.sourceLink || null,
        scan.contentText || null,
        scan.riskLevel,
        Number(scan.riskScore ?? 0),
        toJson(scan.riskTags ?? []),
        toJson(scan.hitPhrases ?? []),
        scan.summary,
        scan.safeAdvice,
        toMysqlDateTime(scan.createdAt),
      ],
    )
    return findAntiFraudScan(scan.ownerId, scan.scanId)
  }

  async function findAntiFraudScan(ownerId, scanId) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM anti_fraud_scans WHERE owner_id = ? AND scan_id = ? LIMIT 1', [ownerId, scanId])
    return rows.length ? mapAntiFraudScanRow(rows[0]) : null
  }

  async function listAntiFraudScans(ownerId, limit = 50) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM anti_fraud_scans WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?', [
      ownerId,
      limit,
    ])
    return rows.map(mapAntiFraudScanRow)
  }

  async function listAntiFraudScansBetween(ownerId, startAt, endAt, limit = 200) {
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT * FROM anti_fraud_scans
       WHERE owner_id = ? AND created_at >= ? AND created_at <= ?
       ORDER BY created_at DESC LIMIT ?`,
      [ownerId, toMysqlDateTime(startAt), toMysqlDateTime(endAt), limit],
    )
    return rows.map(mapAntiFraudScanRow)
  }

  async function createAntiFraudEvidence(evidence) {
    const p = await ensurePool()
    await p.query(
      `INSERT INTO anti_fraud_evidences
      (evidence_id, owner_id, scan_id, target_id, source_link, captured_at, violation_points_json, snapshot_text, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?)`,
      [
        evidence.evidenceId,
        evidence.ownerId,
        evidence.scanId,
        evidence.targetId || null,
        evidence.sourceLink || null,
        toMysqlDateTime(evidence.capturedAt),
        toJson(evidence.violationPoints ?? []),
        evidence.snapshotText || null,
        evidence.status ?? 'archived',
        toMysqlDateTime(evidence.createdAt),
      ],
    )
    return findAntiFraudEvidence(evidence.ownerId, evidence.evidenceId)
  }

  async function findAntiFraudEvidence(ownerId, evidenceId) {
    const p = await ensurePool()
    const [rows] = await p.query(
      'SELECT * FROM anti_fraud_evidences WHERE owner_id = ? AND evidence_id = ? LIMIT 1',
      [ownerId, evidenceId],
    )
    return rows.length ? mapAntiFraudEvidenceRow(rows[0]) : null
  }

  async function listAntiFraudEvidences(ownerId, limit = 100) {
    const p = await ensurePool()
    const [rows] = await p.query(
      'SELECT * FROM anti_fraud_evidences WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?',
      [ownerId, limit],
    )
    return rows.map(mapAntiFraudEvidenceRow)
  }

  async function listAntiFraudEvidencesByIds(ownerId, evidenceIds) {
    if (!evidenceIds.length) return []
    const placeholders = evidenceIds.map(() => '?').join(', ')
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT * FROM anti_fraud_evidences
       WHERE owner_id = ? AND evidence_id IN (${placeholders})
       ORDER BY created_at DESC`,
      [ownerId, ...evidenceIds],
    )
    return rows.map(mapAntiFraudEvidenceRow)
  }

  async function createAntiFraudReport(report) {
    const p = await ensurePool()
    await p.query(
      `INSERT INTO anti_fraud_reports
      (report_id, owner_id, period_type, period_start, period_end, overview_json, high_risk_json, safe_content_json, recommendations_json, created_at)
      VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON), ?)`,
      [
        report.reportId,
        report.ownerId,
        report.periodType,
        toMysqlDateTime(report.periodStart),
        toMysqlDateTime(report.periodEnd),
        toJson(report.overview ?? {}),
        toJson(report.highRiskItems ?? []),
        toJson(report.safeItems ?? []),
        toJson(report.recommendations ?? []),
        toMysqlDateTime(report.createdAt),
      ],
    )
    return findAntiFraudReport(report.ownerId, report.reportId)
  }

  async function findAntiFraudReport(ownerId, reportId) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM anti_fraud_reports WHERE owner_id = ? AND report_id = ? LIMIT 1', [
      ownerId,
      reportId,
    ])
    return rows.length ? mapAntiFraudReportRow(rows[0]) : null
  }

  async function listAntiFraudReports(ownerId, limit = 30) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM anti_fraud_reports WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?', [
      ownerId,
      limit,
    ])
    return rows.map(mapAntiFraudReportRow)
  }

  async function createAntiFraudComplaint(complaint) {
    const p = await ensurePool()
    await p.query(
      `INSERT INTO anti_fraud_complaints
      (complaint_id, owner_id, status, scenario, evidence_ids_json, transaction_notes, facts_summary, generated_text, channel_suggestions_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, CAST(? AS JSON), ?, ?)`,
      [
        complaint.complaintId,
        complaint.ownerId,
        complaint.status ?? 'ready',
        complaint.scenario,
        toJson(complaint.evidenceIds ?? []),
        complaint.transactionNotes || null,
        complaint.factsSummary || null,
        complaint.generatedText,
        toJson(complaint.channelSuggestions ?? []),
        toMysqlDateTime(complaint.createdAt),
        toMysqlDateTime(complaint.updatedAt),
      ],
    )
    return findAntiFraudComplaint(complaint.ownerId, complaint.complaintId)
  }

  async function findAntiFraudComplaint(ownerId, complaintId) {
    const p = await ensurePool()
    const [rows] = await p.query(
      'SELECT * FROM anti_fraud_complaints WHERE owner_id = ? AND complaint_id = ? LIMIT 1',
      [ownerId, complaintId],
    )
    return rows.length ? mapAntiFraudComplaintRow(rows[0]) : null
  }

  async function listAntiFraudComplaints(ownerId, limit = 50) {
    const p = await ensurePool()
    const [rows] = await p.query(
      'SELECT * FROM anti_fraud_complaints WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?',
      [ownerId, limit],
    )
    return rows.map(mapAntiFraudComplaintRow)
  }

  async function countAntiFraudComplaintsBetween(ownerId, startAt, endAt) {
    const p = await ensurePool()
    const [[row]] = await p.query(
      `SELECT COUNT(*) AS c
       FROM anti_fraud_complaints
       WHERE owner_id = ? AND created_at >= ? AND created_at <= ?`,
      [ownerId, toMysqlDateTime(startAt), toMysqlDateTime(endAt)],
    )
    return Number(row.c ?? 0)
  }

  async function close() {
    if (pool) {
      await pool.end()
      pool = null
    }
  }

  // ---- 管理员专属查询方法 ----

  async function listUsers(limit = 100, offset = 0, search = '') {
    const p = await ensurePool()
    if (search) {
      const like = `%${search}%`
      const [rows] = await p.query(
        'SELECT * FROM users WHERE (name LIKE ? OR contact LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [like, like, limit, offset],
      )
      return rows.map(mapUserRow)
    }
    const [rows] = await p.query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset],
    )
    return rows.map(mapUserRow)
  }

  async function countUsers(search = '') {
    const p = await ensurePool()
    if (search) {
      const like = `%${search}%`
      const [[row]] = await p.query(
        'SELECT COUNT(*) AS c FROM users WHERE (name LIKE ? OR contact LIKE ?)',
        [like, like],
      )
      return Number(row.c)
    }
    const [[row]] = await p.query('SELECT COUNT(*) AS c FROM users')
    return Number(row.c)
  }

  async function updateUserEnabledModules(userId, modules) {
    const p = await ensurePool()
    await p.query(
      'UPDATE users SET enabled_modules_json = CAST(? AS JSON), updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [toJson(modules), userId],
    )
  }

  async function listAllTasks(opts = {}) {
    const p = await ensurePool()
    const { status, moduleKey, limit = 50, offset = 0 } = opts
    const conditions = []
    const params = []
    if (status) { conditions.push('status = ?'); params.push(status) }
    if (moduleKey) { conditions.push('module_key = ?'); params.push(moduleKey) }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const [rows] = await p.query(
      `SELECT * FROM tasks ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )
    return rows.map(mapTaskRow)
  }

  async function countAllTasks(opts = {}) {
    const p = await ensurePool()
    const { status, moduleKey } = opts
    const conditions = []
    const params = []
    if (status) { conditions.push('status = ?'); params.push(status) }
    if (moduleKey) { conditions.push('module_key = ?'); params.push(moduleKey) }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const [[row]] = await p.query(`SELECT COUNT(*) AS c FROM tasks ${where}`, params)
    return Number(row.c)
  }

  async function getModuleStats() {
    const p = await ensurePool()
    const [rows] = await p.query(`
      SELECT module_key, status, COUNT(*) AS cnt
      FROM tasks
      GROUP BY module_key, status
    `)
    return rows
  }

  async function listUsersByModule(moduleKey) {
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT u.*, MAX(t.updated_at) AS last_task_at, COUNT(t.id) AS task_count
       FROM users u
       LEFT JOIN tasks t ON t.owner_id = u.id AND t.module_key = ?
       WHERE JSON_CONTAINS(u.enabled_modules_json, ?)
       GROUP BY u.id
       ORDER BY last_task_at DESC`,
      [moduleKey, JSON.stringify(moduleKey)],
    )
    return rows.map((row) => ({
      ...mapUserRow(row),
      lastTaskAt: row.last_task_at ? toIso(row.last_task_at) : null,
      taskCount: Number(row.task_count ?? 0),
    }))
  }

  async function findModuleSettings(moduleKey) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM module_settings WHERE module_key = ? LIMIT 1', [moduleKey])
    if (!rows.length) return null
    const row = rows[0]
    return {
      moduleKey: row.module_key,
      config: parseJson(row.config_json, {}),
      updatedBy: row.updated_by ?? '',
      updatedAt: row.updated_at ? toIso(row.updated_at) : null,
      createdAt: row.created_at ? toIso(row.created_at) : null,
    }
  }

  async function upsertModuleSettings(moduleKey, config, updatedBy = '') {
    const p = await ensurePool()
    await p.query(
      `INSERT INTO module_settings (module_key, config_json, updated_by)
       VALUES (?, CAST(? AS JSON), ?)
       ON DUPLICATE KEY UPDATE
         config_json = VALUES(config_json),
         updated_by = VALUES(updated_by),
         updated_at = CURRENT_TIMESTAMP(3)`,
      [moduleKey, toJson(config ?? {}), updatedBy || null],
    )
    return findModuleSettings(moduleKey)
  }

  return {
    ensureInitialized,
    createSeedTasks,
    findUserByContact,
    findUserById,
    contactExists,
    setUserTokenState,
    incrementUserTokenVersion,
    insertUser,
    insertTasks,
    listTasksByUserAndModule,
    listRecentTasksForUser,
    findTaskByIdForUser,
    findTaskById,
    findTaskByReportFile,
    createTask,
    updateTask,
    trimTasks,
    claimNextQueuedTask,
    requeueRunningTasks,
    listTasksByStatus,
    // 反诈与买菜
    listLatestGroceryFeeds,
    upsertGroceryPreference,
    getGroceryPreference,
    createGroceryFreshnessCheck,
    findGroceryFreshnessCheck,
    listGroceryFreshnessChecks,
    upsertAntiFraudSubscription,
    getAntiFraudSubscription,
    createAntiFraudTarget,
    findAntiFraudTargetById,
    listAntiFraudTargets,
    countActiveAntiFraudTargets,
    updateAntiFraudTarget,
    removeAntiFraudTarget,
    createAntiFraudScan,
    findAntiFraudScan,
    listAntiFraudScans,
    listAntiFraudScansBetween,
    createAntiFraudEvidence,
    findAntiFraudEvidence,
    listAntiFraudEvidences,
    listAntiFraudEvidencesByIds,
    createAntiFraudReport,
    findAntiFraudReport,
    listAntiFraudReports,
    createAntiFraudComplaint,
    findAntiFraudComplaint,
    listAntiFraudComplaints,
    countAntiFraudComplaintsBetween,
    // 管理员专属
    listUsers,
    countUsers,
    updateUserEnabledModules,
    listAllTasks,
    countAllTasks,
    getModuleStats,
    listUsersByModule,
    findModuleSettings,
    upsertModuleSettings,
    close,
  }
}
