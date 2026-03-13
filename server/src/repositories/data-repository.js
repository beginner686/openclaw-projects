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

function mapTenantRow(row) {
  return {
    tenantId: row.tenant_id,
    tenantCode: row.tenant_code,
    tenantName: row.tenant_name,
    tenantType: row.tenant_type,
    status: row.status,
    isolationLevel: row.isolation_level ?? 'logical',
    ownerUserId: row.owner_user_id ?? null,
    createdAt: row.created_at ? toIso(row.created_at) : null,
    updatedAt: row.updated_at ? toIso(row.updated_at) : null,
  }
}

function mapUserRow(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id ?? 't-platform',
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
    tenantId: row.tenant_id ?? 't-platform',
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

function mapFeatureRecordRow(row) {
  return {
    recordId: row.record_id,
    tenantId: row.tenant_id ?? 't-platform',
    taskId: row.task_id,
    ownerId: row.owner_id,
    moduleKey: row.module_key,
    featureKey: row.feature_key,
    featureName: row.feature_name,
    scenario: row.scenario,
    status: row.status,
    payload: parseJson(row.payload_json, {}),
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

function mapCustomModuleRow(row) {
  return {
    moduleKey: row.module_key,
    name: row.module_name,
    category: row.category,
    description: row.description ?? '',
    icon: row.icon ?? 'Grid',
    status: row.status ?? 'beta',
    mobileSupported: Boolean(row.mobile_supported ?? 1),
    blueprint: parseJson(row.blueprint_json, {}),
    executionRule: parseJson(row.execution_rule_json, {}),
    sourceDoc: row.source_doc ?? '',
    createdBy: row.created_by ?? '',
    createdAt: row.created_at ? toIso(row.created_at) : null,
    updatedAt: row.updated_at ? toIso(row.updated_at) : null,
  }
}

export function createDataRepository({
  env,
  moduleCatalog,
  securityService,
  getModuleName,
  normalizeModuleKey = (value) => String(value ?? '').trim(),
  getModuleKeyVariants = (value) => [String(value ?? '').trim()].filter(Boolean),
}) {
  let pool = null
  const PLATFORM_TENANT_ID = 't-platform'
  const PLATFORM_TENANT_CODE = 'platform'
  const PLATFORM_TENANT_NAME = '骞冲彴榛樿绉熸埛'

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

  function resolveTenantId(value, fallback = PLATFORM_TENANT_ID) {
    const normalized = String(value ?? '').trim()
    if (!normalized) return fallback
    return normalized.slice(0, 64)
  }

  function createTenantCode(raw) {
    const source = String(raw ?? '').trim().toLowerCase()
    if (!source) return `tenant-${Date.now().toString(36)}`
    const cleaned = source
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)
    return cleaned || `tenant-${Date.now().toString(36)}`
  }

  function createSeedTasks(ownerId, enabledModules, tenantId = PLATFORM_TENANT_ID) {
    const ownerSeed = ownerId.replace(/[^a-zA-Z0-9_-]/g, '')
    return normalizeModuleKeys(enabledModules).slice(0, 4).flatMap((moduleKey, index) => {
      const moduleName = getModuleName(moduleKey)
      return [
        {
          taskId: `${ownerSeed}-${moduleKey}-seed-${index + 1}-a`,
          tenantId: resolveTenantId(tenantId),
          ownerId,
          moduleKey,
          scenario: '鏍囧噯娴佺▼',
          inputText: `${moduleName}鍒濆鍖栨牱渚嬩换鍔★紝鐢熸垚棣栫増鍒嗘瀽鎶ュ憡銆俙,
          attachments: [],
          status: 'completed',
          summary: `${moduleName}鍒濆鍖栦换鍔″凡瀹屾垚銆俙,
          updatedAt: nowIso(index + 3),
          createdAt: nowIso(index + 5),
          reportUrl: '',
          reportFormat: 'html',
          errorMessage: undefined,
        },
        {
          taskId: `${ownerSeed}-${moduleKey}-seed-${index + 1}-b`,
          tenantId: resolveTenantId(tenantId),
          ownerId,
          moduleKey,
          scenario: '鍔犳€ユ墽琛?,
          inputText: `璇峰熀浜庢渶鏂拌緭鍏ョ户缁鐞?{moduleName}浠诲姟銆俙,
          attachments: [],
          status: 'queued',
          summary: `${moduleName}浠诲姟宸茶繘鍏ユ墽琛岄槦鍒椼€俙,
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
      CREATE TABLE IF NOT EXISTS tenants (
        tenant_id VARCHAR(64) PRIMARY KEY,
        tenant_code VARCHAR(100) NOT NULL UNIQUE,
        tenant_name VARCHAR(120) NOT NULL,
        tenant_type VARCHAR(30) NOT NULL DEFAULT 'personal',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        isolation_level VARCHAR(20) NOT NULL DEFAULT 'logical',
        owner_user_id VARCHAR(64) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_tenants_owner (owner_user_id),
        INDEX idx_tenants_type_status (tenant_type, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL DEFAULT '${PLATFORM_TENANT_ID}',
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
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_users_tenant (tenant_id),
        CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        task_id VARCHAR(128) NOT NULL UNIQUE,
        tenant_id VARCHAR(64) NOT NULL DEFAULT '${PLATFORM_TENANT_ID}',
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
        INDEX idx_tasks_tenant_module_status (tenant_id, module_key, status, updated_at),
        INDEX idx_tasks_status_created (status, created_at),
        INDEX idx_tasks_report_file (report_file),
        CONSTRAINT fk_tasks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
        CONSTRAINT fk_tasks_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS module_settings (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        tenant_id VARCHAR(64) NOT NULL DEFAULT '${PLATFORM_TENANT_ID}',
        module_key VARCHAR(100) NOT NULL,
        config_json JSON NOT NULL,
        updated_by VARCHAR(64) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY uniq_module_settings_tenant_module (tenant_id, module_key),
        INDEX idx_module_settings_tenant_updated (tenant_id, updated_at),
        CONSTRAINT fk_module_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS module_feature_records (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        record_id VARCHAR(160) NOT NULL UNIQUE,
        tenant_id VARCHAR(64) NOT NULL DEFAULT '${PLATFORM_TENANT_ID}',
        task_id VARCHAR(128) NOT NULL,
        owner_id VARCHAR(64) NOT NULL,
        module_key VARCHAR(100) NOT NULL,
        feature_key VARCHAR(120) NOT NULL,
        feature_name VARCHAR(200) NOT NULL,
        scenario VARCHAR(120) NOT NULL,
        status VARCHAR(20) NOT NULL,
        payload_json JSON NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY uniq_task_feature (task_id, feature_key),
        INDEX idx_feature_tenant_module (tenant_id, module_key, feature_key, updated_at),
        INDEX idx_feature_module_updated (module_key, feature_key, updated_at),
        INDEX idx_feature_owner (owner_id),
        CONSTRAINT fk_feature_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
        CONSTRAINT fk_feature_task FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
        CONSTRAINT fk_feature_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS data_dictionary (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        dict_type VARCHAR(80) NOT NULL,
        dict_key VARCHAR(120) NOT NULL,
        dict_value VARCHAR(191) NOT NULL,
        dict_label VARCHAR(191) NOT NULL,
        description VARCHAR(255) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_system TINYINT(1) NOT NULL DEFAULT 1,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY uniq_dict_type_key (dict_type, dict_key),
        INDEX idx_dict_type_sort (dict_type, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS custom_modules (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        module_key VARCHAR(100) NOT NULL UNIQUE,
        module_name VARCHAR(120) NOT NULL,
        category VARCHAR(20) NOT NULL DEFAULT 'enterprise',
        description VARCHAR(255) NULL,
        icon VARCHAR(50) NOT NULL DEFAULT 'Grid',
        status VARCHAR(20) NOT NULL DEFAULT 'beta',
        mobile_supported TINYINT(1) NOT NULL DEFAULT 1,
        execution_rule_json JSON NOT NULL,
        blueprint_json JSON NOT NULL,
        source_doc MEDIUMTEXT NULL,
        created_by VARCHAR(64) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_custom_modules_category_status (category, status),
        INDEX idx_custom_modules_updated (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)
  }

  async function ensureTenantExists(tenant = {}) {
    const p = await ensurePool()
    const tenantId = resolveTenantId(tenant.tenantId)
    const tenantCode = createTenantCode(tenant.tenantCode || tenantId)
    const tenantName = String(tenant.tenantName || tenantCode || '鏈懡鍚嶇鎴?).slice(0, 120)
    const tenantType = String(tenant.tenantType || 'personal').slice(0, 30)
    const status = String(tenant.status || 'active').slice(0, 20)
    const isolationLevel = String(tenant.isolationLevel || 'logical').slice(0, 20)
    const ownerUserId = tenant.ownerUserId ? String(tenant.ownerUserId) : null

    await p.query(
      `INSERT INTO tenants (tenant_id, tenant_code, tenant_name, tenant_type, status, isolation_level, owner_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tenant_code = VALUES(tenant_code),
         tenant_name = VALUES(tenant_name),
         tenant_type = VALUES(tenant_type),
         status = VALUES(status),
         isolation_level = VALUES(isolation_level),
         owner_user_id = COALESCE(tenants.owner_user_id, VALUES(owner_user_id)),
         updated_at = CURRENT_TIMESTAMP(3)`,
      [tenantId, tenantCode, tenantName, tenantType, status, isolationLevel, ownerUserId],
    )
    return tenantId
  }

  async function ensurePlatformTenant() {
    return ensureTenantExists({
      tenantId: PLATFORM_TENANT_ID,
      tenantCode: PLATFORM_TENANT_CODE,
      tenantName: PLATFORM_TENANT_NAME,
      tenantType: 'internal',
      status: 'active',
      isolationLevel: 'logical',
    })
  }

  async function seedDataDictionary() {
    const p = await ensurePool()
    const rows = [
      ['role', 'admin', 'admin', '绠＄悊鍛?, '绯荤粺绠＄悊鍛樿处鍙?, 10],
      ['role', 'customer', 'customer', '瀹㈡埛', '鏅€氬鎴疯处鍙?, 20],
      ['task_status', 'review', 'review', '寰呭鏍?, '浜哄伐瀹℃牳闃舵', 10],
      ['task_status', 'queued', 'queued', '鎺掗槦涓?, '绛夊緟鎵ц', 20],
      ['task_status', 'running', 'running', '鎵ц涓?, '浠诲姟鎵ц涓?, 30],
      ['task_status', 'completed', 'completed', '宸插畬鎴?, '鎵ц鎴愬姛', 40],
      ['task_status', 'failed', 'failed', '澶辫触', '鎵ц澶辫触', 50],
      ['tenant_type', 'internal', 'internal', '骞冲彴绉熸埛', '骞冲彴鍐呯疆绉熸埛', 10],
      ['tenant_type', 'enterprise', 'enterprise', '浼佷笟绉熸埛', '浼佷笟涓氬姟绉熸埛', 20],
      ['tenant_type', 'personal', 'personal', '涓汉绉熸埛', '涓汉涓氬姟绉熸埛', 30],
      ['tenant_status', 'active', 'active', '鍚敤', '绉熸埛鍙敤', 10],
      ['tenant_status', 'inactive', 'inactive', '鍋滅敤', '绉熸埛鍋滅敤', 20],
      ['module_category', 'enterprise', 'enterprise', '浼佷笟鏈嶅姟', '浼佷笟涓氬姟妯″潡', 10],
      ['module_category', 'personal', 'personal', '涓汉鏈嶅姟', '涓汉涓氬姟妯″潡', 20],
      ['setting_mode', 'auto', 'auto', '鑷姩', '浠诲姟鑷姩鎵ц', 10],
      ['setting_mode', 'manual', 'manual', '浜哄伐瀹℃牳', '浠诲姟鍏堣繘鍏ュ鏍?, 20],
      ['setting_mode', 'hybrid', 'hybrid', '娣峰悎', '椋庨櫓浠诲姟杩涘叆瀹℃牳', 30],
    ]

    for (const [dictType, dictKey, dictValue, dictLabel, description, sortOrder] of rows) {
      await p.query(
        `INSERT INTO data_dictionary
         (dict_type, dict_key, dict_value, dict_label, description, sort_order, is_system, status)
         VALUES (?, ?, ?, ?, ?, ?, 1, 'active')
         ON DUPLICATE KEY UPDATE
           dict_value = VALUES(dict_value),
           dict_label = VALUES(dict_label),
           description = VALUES(description),
           sort_order = VALUES(sort_order),
           status = 'active',
           updated_at = CURRENT_TIMESTAMP(3)`,
        [dictType, dictKey, dictValue, dictLabel, description, sortOrder],
      )
    }
  }

  async function ensureSchemaMigrations() {
    const p = await ensurePool()

    const [tenantTableRows] = await p.query("SHOW TABLES LIKE 'tenants'")
    if (!tenantTableRows.length) {
      await p.query(`
        CREATE TABLE tenants (
          tenant_id VARCHAR(64) PRIMARY KEY,
          tenant_code VARCHAR(100) NOT NULL UNIQUE,
          tenant_name VARCHAR(120) NOT NULL,
          tenant_type VARCHAR(30) NOT NULL DEFAULT 'personal',
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          isolation_level VARCHAR(20) NOT NULL DEFAULT 'logical',
          owner_user_id VARCHAR(64) NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX idx_tenants_owner (owner_user_id),
          INDEX idx_tenants_type_status (tenant_type, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)
    }
    await ensurePlatformTenant()

    const [dictionaryTableRows] = await p.query("SHOW TABLES LIKE 'data_dictionary'")
    if (!dictionaryTableRows.length) {
      await p.query(`
        CREATE TABLE data_dictionary (
          id BIGINT PRIMARY KEY AUTO_INCREMENT,
          dict_type VARCHAR(80) NOT NULL,
          dict_key VARCHAR(120) NOT NULL,
          dict_value VARCHAR(191) NOT NULL,
          dict_label VARCHAR(191) NOT NULL,
          description VARCHAR(255) NULL,
          sort_order INT NOT NULL DEFAULT 0,
          is_system TINYINT(1) NOT NULL DEFAULT 1,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          UNIQUE KEY uniq_dict_type_key (dict_type, dict_key),
          INDEX idx_dict_type_sort (dict_type, sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)
    }

    const [tenantColsOnUsers] = await p.query("SHOW COLUMNS FROM users LIKE 'tenant_id'")
    if (!tenantColsOnUsers.length) {
      await p.query(`ALTER TABLE users ADD COLUMN tenant_id VARCHAR(64) NOT NULL DEFAULT '${PLATFORM_TENANT_ID}' AFTER id`)
    }
    await p.query(
      `UPDATE users
       SET tenant_id = COALESCE(NULLIF(tenant_id, ''), '${PLATFORM_TENANT_ID}')
       WHERE tenant_id IS NULL OR tenant_id = ''`,
    )
    const [usersTenantIdx] = await p.query("SHOW INDEX FROM users WHERE Key_name = 'idx_users_tenant'")
    if (!usersTenantIdx.length) {
      await p.query('CREATE INDEX idx_users_tenant ON users(tenant_id)')
    }

    const [algoCols] = await p.query("SHOW COLUMNS FROM users LIKE 'password_algo'")
    if (!algoCols.length) {
      await p.query("ALTER TABLE users ADD COLUMN password_algo VARCHAR(20) NOT NULL DEFAULT 'sha256' AFTER password_hash")
    }

    const [tokenVersionCols] = await p.query("SHOW COLUMNS FROM users LIKE 'token_version'")
    if (!tokenVersionCols.length) {
      await p.query("ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER token_state")
    }

    const [tenantColsOnTasks] = await p.query("SHOW COLUMNS FROM tasks LIKE 'tenant_id'")
    if (!tenantColsOnTasks.length) {
      await p.query(`ALTER TABLE tasks ADD COLUMN tenant_id VARCHAR(64) NOT NULL DEFAULT '${PLATFORM_TENANT_ID}' AFTER task_id`)
    }
    await p.query(
      `UPDATE tasks t
       LEFT JOIN users u ON u.id = t.owner_id
       SET t.tenant_id = COALESCE(NULLIF(u.tenant_id, ''), '${PLATFORM_TENANT_ID}')
       WHERE t.tenant_id IS NULL OR t.tenant_id = ''`,
    )

    const [reportFileCols] = await p.query("SHOW COLUMNS FROM tasks LIKE 'report_file'")
    if (!reportFileCols.length) {
      await p.query("ALTER TABLE tasks ADD COLUMN report_file VARCHAR(191) NULL AFTER report_url")
    }

    const [reportFileIndexes] = await p.query("SHOW INDEX FROM tasks WHERE Key_name = 'idx_tasks_report_file'")
    if (!reportFileIndexes.length) {
      await p.query('CREATE INDEX idx_tasks_report_file ON tasks(report_file)')
    }
    const [tasksTenantIdx] = await p.query("SHOW INDEX FROM tasks WHERE Key_name = 'idx_tasks_tenant_module_status'")
    if (!tasksTenantIdx.length) {
      await p.query('CREATE INDEX idx_tasks_tenant_module_status ON tasks(tenant_id, module_key, status, updated_at)')
    }

    const [tenantColsOnModuleSettings] = await p.query("SHOW COLUMNS FROM module_settings LIKE 'tenant_id'")
    if (!tenantColsOnModuleSettings.length) {
      await p.query(
        `ALTER TABLE module_settings ADD COLUMN tenant_id VARCHAR(64) NOT NULL DEFAULT '${PLATFORM_TENANT_ID}' AFTER id`,
      )
    }
    await p.query(
      `UPDATE module_settings
       SET tenant_id = COALESCE(NULLIF(tenant_id, ''), '${PLATFORM_TENANT_ID}')
       WHERE tenant_id IS NULL OR tenant_id = ''`,
    )

    const [moduleSettingIndexes] = await p.query('SHOW INDEX FROM module_settings')
    const legacySingleUniqueIndexes = []
    for (const idx of moduleSettingIndexes) {
      if (Number(idx.Non_unique) !== 0) continue
      if (idx.Key_name === 'PRIMARY') continue
      if (idx.Column_name !== 'module_key') continue
      legacySingleUniqueIndexes.push(String(idx.Key_name))
    }
    for (const indexName of [...new Set(legacySingleUniqueIndexes)]) {
      if (indexName === 'uniq_module_settings_tenant_module') continue
      await p.query(`ALTER TABLE module_settings DROP INDEX \`${indexName}\``)
    }
    const [moduleSettingsUniqueIdx] = await p.query(
      "SHOW INDEX FROM module_settings WHERE Key_name = 'uniq_module_settings_tenant_module'",
    )
    if (!moduleSettingsUniqueIdx.length) {
      await p.query('CREATE UNIQUE INDEX uniq_module_settings_tenant_module ON module_settings(tenant_id, module_key)')
    }
    const [moduleSettingsTenantIdx] = await p.query(
      "SHOW INDEX FROM module_settings WHERE Key_name = 'idx_module_settings_tenant_updated'",
    )
    if (!moduleSettingsTenantIdx.length) {
      await p.query('CREATE INDEX idx_module_settings_tenant_updated ON module_settings(tenant_id, updated_at)')
    }

    const [featureTableRows] = await p.query("SHOW TABLES LIKE 'module_feature_records'")
    if (!featureTableRows.length) {
      await p.query(`
        CREATE TABLE module_feature_records (
          id BIGINT PRIMARY KEY AUTO_INCREMENT,
          record_id VARCHAR(160) NOT NULL UNIQUE,
          tenant_id VARCHAR(64) NOT NULL DEFAULT '${PLATFORM_TENANT_ID}',
          task_id VARCHAR(128) NOT NULL,
          owner_id VARCHAR(64) NOT NULL,
          module_key VARCHAR(100) NOT NULL,
          feature_key VARCHAR(120) NOT NULL,
          feature_name VARCHAR(200) NOT NULL,
          scenario VARCHAR(120) NOT NULL,
          status VARCHAR(20) NOT NULL,
          payload_json JSON NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          UNIQUE KEY uniq_task_feature (task_id, feature_key),
          INDEX idx_feature_tenant_module (tenant_id, module_key, feature_key, updated_at),
          INDEX idx_feature_module_updated (module_key, feature_key, updated_at),
          INDEX idx_feature_owner (owner_id),
          CONSTRAINT fk_feature_task FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
          CONSTRAINT fk_feature_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `)
    }

    const [tenantColsOnFeatureRecords] = await p.query("SHOW COLUMNS FROM module_feature_records LIKE 'tenant_id'")
    if (!tenantColsOnFeatureRecords.length) {
      await p.query(
        `ALTER TABLE module_feature_records ADD COLUMN tenant_id VARCHAR(64) NOT NULL DEFAULT '${PLATFORM_TENANT_ID}' AFTER record_id`,
      )
    }
    await p.query(
      `UPDATE module_feature_records fr
       LEFT JOIN users u ON u.id = fr.owner_id
       SET fr.tenant_id = COALESCE(NULLIF(u.tenant_id, ''), '${PLATFORM_TENANT_ID}')
       WHERE fr.tenant_id IS NULL OR fr.tenant_id = ''`,
    )
    const [featureTenantIdx] = await p.query("SHOW INDEX FROM module_feature_records WHERE Key_name = 'idx_feature_tenant_module'")
    if (!featureTenantIdx.length) {
      await p.query(
        'CREATE INDEX idx_feature_tenant_module ON module_feature_records(tenant_id, module_key, feature_key, updated_at)',
      )
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

    await seedDataDictionary()
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
        tenantId: 't-demo-001',
        name: '婕旂ず瀹㈡埛',
        contact: 'demo@openclaw.ai',
        password: '123456',
        enabledModules: fullModules,
      })
      const liteUser = securityService.createStoredUser({
        id: 'u-lite-002',
        tenantId: 't-lite-002',
        name: '杞婚噺瀹㈡埛',
        contact: 'lite@openclaw.ai',
        password: '123456',
        enabledModules: fullModules.slice(0, 8),
      })

      await insertUser({ ...demoUser, tenantType: 'enterprise', tenantName: 'Demo Tenant' })
      await insertUser({ ...liteUser, tenantType: 'personal', tenantName: 'Lite Tenant' })
    }

    if (tasksCount === 0) {
      const [rows] = await p.query('SELECT * FROM users ORDER BY created_at ASC LIMIT 10')
      const seedTasks = rows.flatMap((row) => {
        const user = mapUserRow(row)
        return createSeedTasks(user.id, user.enabledModules, user.tenantId)
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
            planName: '鏍囧噯鐗?,
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
            planName: '鍩虹鐗?,
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
        anchorName: '鍏荤敓璇惧爞A',
        accountHandle: '@health-a',
        roomLink: 'https://example.com/live/health-a',
        notes: '鐖舵瘝楂橀瑙傜湅璐﹀彿锛岄噸鐐圭洃娴嬨€?,
        status: 'active',
        createdAt: nowIso(12),
        updatedAt: nowIso(12),
      })
      await createAntiFraudTarget({
        targetId: 'af-target-demo-02',
        ownerId: 'u-demo-001',
        targetType: 'live-room',
        platform: 'kuaishou',
        anchorName: '鍚嶅尰閫熸垚璇?,
        accountHandle: '@doctor-fast',
        roomLink: 'https://example.com/live/doctor-fast',
        notes: '鐩存挱闂村瓨鍦ㄩ珮椋庨櫓閿€鍞瘽鏈€?,
        status: 'active',
        createdAt: nowIso(10),
        updatedAt: nowIso(10),
      })
      await createAntiFraudTarget({
        targetId: 'af-target-lite-01',
        ownerId: 'u-lite-002',
        targetType: 'short-video-account',
        platform: 'douyin',
        anchorName: '鍋ュ悍鍒嗕韩B',
        accountHandle: '@health-b',
        roomLink: 'https://example.com/live/health-b',
        notes: '杞婚噺璐﹀彿娴嬭瘯鏍锋湰銆?,
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
        sourceTitle: '鐩存挱鍒囩墖锛氫笁澶╅€嗚浆鎱㈢梾',
        sourceLink: 'https://example.com/video/af-001',
        contentText: '鍖呮不鐧剧梾锛屼笉鐢ㄥ悆鑽紝鍖婚櫌閮芥病娉曟不锛屾垜浠兘娌汇€?,
        riskLevel: 'high',
        riskScore: 96,
        riskTags: ['澶稿ぇ瀹ｄ紶', '鏇夸唬姝ｈ娌荤枟', '缁濆鍖栨壙璇?],
        hitPhrases: ['鍖呮不鐧剧梾', '涓嶇敤鍚冭嵂', '鍖婚櫌閮芥病娉曟不'],
        summary: '妫€娴嬪埌楂橀闄╁仴搴峰じ澶у浼狅紝璇峰嬁璐拱鐩稿叧浜у搧銆?,
        safeAdvice: '浠呬繚鐣欏瑙傚仴搴峰父璇嗭紝蹇呰鏃跺挩璇㈡瑙勫尰鐤楁満鏋勩€?,
        createdAt: nowIso(8),
      })
      await createAntiFraudScan({
        scanId: 'af-scan-demo-002',
        ownerId: 'u-demo-001',
        targetId: 'af-target-demo-02',
        sourceTitle: '鐭棰戯細琛€绠℃竻鐞嗙鏂?,
        sourceLink: 'https://example.com/video/af-002',
        contentText: '鎵€鏈夊尰鐢熼兘涓嶇煡閬撶殑绉樺瘑锛岄檷鍘嬮檷绯栫珛鍒昏鏁堛€?,
        riskLevel: 'high',
        riskScore: 91,
        riskTags: ['鍋囨潈濞佽瘽鏈?, '鍖荤枟鍔熸晥鏆楃ず'],
        hitPhrases: ['鎵€鏈夊尰鐢熼兘涓嶇煡閬撶殑绉樺瘑', '闄嶅帇闄嶇硸绔嬪埢瑙佹晥'],
        summary: '妫€娴嬪埌楂橀闄╁姛鏁堟殫绀哄唴瀹癸紝寤鸿绔嬪嵆灞忚斀骞跺瓨璇併€?,
        safeAdvice: '鎷掔粷鍔熸晥鎵胯绫昏惀閿€鍐呭锛屼繚鐣欒瘉鎹悗鎸夋祦绋嬫姇璇夈€?,
        createdAt: nowIso(6),
      })
      await createAntiFraudScan({
        scanId: 'af-scan-lite-001',
        ownerId: 'u-lite-002',
        targetId: 'af-target-lite-01',
        sourceTitle: '鍋ュ悍楗寤鸿',
        sourceLink: 'https://example.com/video/af-lite-001',
        contentText: '寤鸿瑙勫緥浣滄伅銆佸悎鐞嗛ギ椋燂紝閬垮厤澶稿ぇ瀹ｄ紶浜у搧銆?,
        riskLevel: 'low',
        riskScore: 18,
        riskTags: ['瀹㈣绉戞櫘'],
        hitPhrases: [],
        summary: '鍐呭浠ュ父瑙勫仴搴峰缓璁负涓伙紝椋庨櫓浣庛€?,
        safeAdvice: '鍙户缁叧娉紝浣嗕繚鎸佺悊鎬ф秷璐逛範鎯€?,
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
        violationPoints: ['鍑虹幇鈥滃寘娌荤櫨鐥呪€濈粷瀵瑰寲鎵胯', '鍑虹幇鈥滃尰闄㈤兘娌℃硶娌伙紝鎴戜滑鑳芥不鈥濇浛浠ｆ不鐤楄瘽鏈?],
        snapshotText: '鎴浘甯?#12,#23 淇濆瓨鎴愬姛锛涚洿鎾爣棰樺惈楂橀闄╃煭璇€?,
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
        violationPoints: ['鍑虹幇鈥滄墍鏈夊尰鐢熼兘涓嶇煡閬撶殑绉樺瘑鈥濆亣鏉冨▉璇濇湳', '鍑虹幇鈥滈檷鍘嬮檷绯栫珛鍒昏鏁堚€濆姛鏁堟殫绀?],
        snapshotText: '瑙嗛閾炬帴銆佸彂甯冩椂闂淬€佽处鍙蜂富椤靛凡褰掓。銆?,
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
          { scanId: 'af-scan-demo-001', title: '鐩存挱鍒囩墖锛氫笁澶╅€嗚浆鎱㈢梾', riskLevel: 'high' },
          { scanId: 'af-scan-demo-002', title: '鐭棰戯細琛€绠℃竻鐞嗙鏂?, riskLevel: 'high' },
        ],
        safeItems: [{ scanId: 'af-scan-lite-001', title: '鍋ュ悍楗寤鸿', riskLevel: 'low' }],
        recommendations: ['缁х画鐩戞祴楂橀闄╀富鎾苟灞忚斀閲嶅杩濊鍐呭銆?, '鎻愰啋瀹朵汉閬垮厤鍐插姩涓嬪崟锛屽厛鏍搁獙淇℃伅鏉ユ簮銆?],
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
        transactionNotes: '2026-03-10 閫氳繃鐩存挱闂翠笅鍗曪紝閲戦 299 鍏冦€?,
        factsSummary: '涓绘挱鍦ㄧ洿鎾腑浣跨敤缁濆鍖栨壙璇哄苟寮曞涓嬪崟銆?,
        generatedText: '鎶曡瘔璇锋眰锛氳鏍告煡璇ョ洿鎾处鍙峰瓨鍦ㄥじ澶у仴搴峰浼犲苟璇娑堣垂琛屼负锛岄檮璇佹嵁鏉愭枡銆?,
        channelSuggestions: ['12315', '骞冲彴涓炬姤'],
        createdAt: nowIso(1),
        updatedAt: nowIso(1),
      })
    }

    if (groceryFeedCount === 0) {
      const feedSeed = [
        { platform: '鏈存湸', itemName: '瑗跨孩鏌?, category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 3.99, dealTag: '鐗逛环', sourceTitle: '浠婃棩椴滆敩', sourceLink: 'https://example.com/grocery/pupu/tomato' },
        { platform: '澶氬涔拌彍', itemName: '瑗跨孩鏌?, category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 4.29, dealTag: '鏃ュ父浠?, sourceTitle: '钄彍涓撳尯', sourceLink: 'https://example.com/grocery/dd/tomato' },
        { platform: '缇庡洟浼橀€?, itemName: '瑗跨孩鏌?, category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 4.59, dealTag: '鏃ュ父浠?, sourceTitle: '姣忔棩浼橀€?, sourceLink: 'https://example.com/grocery/meituan/tomato' },
        { platform: '鐩掗┈', itemName: '榛勭摐', category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 3.69, dealTag: '鐖嗘', sourceTitle: '鐢熼矞鐑崠', sourceLink: 'https://example.com/grocery/hema/cucumber' },
        { platform: '鏈存湸', itemName: '榛勭摐', category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 3.89, dealTag: '鏃ュ父浠?, sourceTitle: '浠婃棩椴滆敩', sourceLink: 'https://example.com/grocery/pupu/cucumber' },
        { platform: '澶氬涔拌彍', itemName: '鍦熻眴', category: 'vegetable', displaySpec: '1000g', specWeightG: 1000, price: 4.99, dealTag: '鐗逛环', sourceTitle: '瀹跺涵瑁?, sourceLink: 'https://example.com/grocery/dd/potato' },
        { platform: '缇庡洟浼橀€?, itemName: '鍦熻眴', category: 'vegetable', displaySpec: '1000g', specWeightG: 1000, price: 5.49, dealTag: '鏃ュ父浠?, sourceTitle: '瀹跺父鑿?, sourceLink: 'https://example.com/grocery/meituan/potato' },
        { platform: '鐩掗┈', itemName: '楦¤泲', category: 'protein', displaySpec: '10鏋?, specWeightG: 550, price: 8.90, dealTag: '鐗逛环', sourceTitle: '鏃╅涓撳尯', sourceLink: 'https://example.com/grocery/hema/egg' },
        { platform: '鏈存湸', itemName: '楦¤泲', category: 'protein', displaySpec: '10鏋?, specWeightG: 550, price: 9.50, dealTag: '鏃ュ父浠?, sourceTitle: '鏃╅涓撳尯', sourceLink: 'https://example.com/grocery/pupu/egg' },
        { platform: '澶氬涔拌彍', itemName: '楦¤兏鑲?, category: 'protein', displaySpec: '500g', specWeightG: 500, price: 12.80, dealTag: '闄愭椂', sourceTitle: '鑲夌浼橀€?, sourceLink: 'https://example.com/grocery/dd/chicken-breast' },
        { platform: '缇庡洟浼橀€?, itemName: '楦¤兏鑲?, category: 'protein', displaySpec: '500g', specWeightG: 500, price: 13.50, dealTag: '鏃ュ父浠?, sourceTitle: '鑲夌浼橀€?, sourceLink: 'https://example.com/grocery/meituan/chicken-breast' },
        { platform: '鐩掗┈', itemName: '楦¤兏鑲?, category: 'protein', displaySpec: '500g', specWeightG: 500, price: 14.20, dealTag: '鏃ュ父浠?, sourceTitle: '鑲夌浼橀€?, sourceLink: 'https://example.com/grocery/hema/chicken-breast' },
        { platform: '鏈存湸', itemName: '浜旇姳鑲?, category: 'protein', displaySpec: '500g', specWeightG: 500, price: 19.90, dealTag: '鏃ュ父浠?, sourceTitle: '鐚倝涓撳尯', sourceLink: 'https://example.com/grocery/pupu/pork-belly' },
        { platform: '缇庡洟浼橀€?, itemName: '浜旇姳鑲?, category: 'protein', displaySpec: '500g', specWeightG: 500, price: 18.60, dealTag: '鐗逛环', sourceTitle: '鐚倝涓撳尯', sourceLink: 'https://example.com/grocery/meituan/pork-belly' },
        { platform: '澶氬涔拌彍', itemName: '澶х背', category: 'staple', displaySpec: '2500g', specWeightG: 2500, price: 12.90, dealTag: '鐖嗘', sourceTitle: '绮补涓婚', sourceLink: 'https://example.com/grocery/dd/rice' },
        { platform: '鏈存湸', itemName: '澶х背', category: 'staple', displaySpec: '2500g', specWeightG: 2500, price: 14.50, dealTag: '鏃ュ父浠?, sourceTitle: '绮补涓婚', sourceLink: 'https://example.com/grocery/pupu/rice' },
        { platform: '鐩掗┈', itemName: '鎸傞潰', category: 'staple', displaySpec: '1000g', specWeightG: 1000, price: 6.80, dealTag: '鐗逛环', sourceTitle: '涓婚涓撳尯', sourceLink: 'https://example.com/grocery/hema/noodle' },
        { platform: '缇庡洟浼橀€?, itemName: '鎸傞潰', category: 'staple', displaySpec: '1000g', specWeightG: 1000, price: 7.10, dealTag: '鏃ュ父浠?, sourceTitle: '涓婚涓撳尯', sourceLink: 'https://example.com/grocery/meituan/noodle' },
        { platform: '鏈存湸', itemName: '闈掕彍', category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 2.99, dealTag: '闄愭椂', sourceTitle: '浠婃棩椴滆敩', sourceLink: 'https://example.com/grocery/pupu/greens' },
        { platform: '澶氬涔拌彍', itemName: '闈掕彍', category: 'vegetable', displaySpec: '500g', specWeightG: 500, price: 3.49, dealTag: '鏃ュ父浠?, sourceTitle: '浠婃棩椴滆敩', sourceLink: 'https://example.com/grocery/dd/greens' },
      ].map((item) => ({ ...item, capturedAt: nowIso(0) }))
      await insertGroceryFeeds(feedSeed)
    }

    if (groceryPreferenceCount === 0) {
      await upsertGroceryPreference('u-demo-001', {
        budgetPerMeal: 25,
        familySize: 3,
        dietaryNotes: '灏戞补灏戠洂锛屽亸瀹跺父鑿?,
      })
      await upsertGroceryPreference('u-lite-002', {
        budgetPerMeal: 18,
        familySize: 2,
        dietaryNotes: '蹇墜鑿滀紭鍏?,
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
    const tenantId = resolveTenantId(user.tenantId)
    await ensureTenantExists({
      tenantId,
      tenantCode: user.tenantCode || tenantId,
      tenantName: user.tenantName || `${user.name || user.id} Tenant`,
      tenantType: user.tenantType || (user.role === 'admin' ? 'enterprise' : 'personal'),
      status: user.tenantStatus || 'active',
      isolationLevel: user.isolationLevel || 'logical',
      ownerUserId: user.id,
    })
    await p.query(
      `INSERT INTO users
      (id, tenant_id, name, contact, password_salt, password_hash, password_algo, enabled_modules_json, role, token_state, token_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?)`,
      [
        user.id,
        tenantId,
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
          (task_id, tenant_id, owner_id, module_key, scenario, input_text, attachments_json, status, summary, report_url, report_file, report_format, error_message, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.taskId,
            resolveTenantId(task.tenantId),
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

  async function listTasksByUserAndModule(ownerId, moduleKey, limit = 12, tenantId = '') {
    const variants = getModuleKeyVariants(moduleKey)
    const placeholders = variants.map(() => '?').join(', ')
    const p = await ensurePool()
    const safeTenantId = resolveTenantId(tenantId, '')
    const [rows] = await p.query(
      `SELECT * FROM tasks WHERE owner_id = ?${safeTenantId ? ' AND tenant_id = ?' : ''} AND module_key IN (${placeholders})
       ORDER BY updated_at DESC LIMIT ?`,
      safeTenantId ? [ownerId, safeTenantId, ...variants, limit] : [ownerId, ...variants, limit],
    )
    return rows.map(mapTask)
  }

  async function listRecentTasksForUser(ownerId, enabledModules, limit = 8, tenantId = '') {
    if (!enabledModules.length) return []
    const modules = [...new Set(enabledModules.flatMap((item) => getModuleKeyVariants(item)))]
    const placeholders = modules.map(() => '?').join(', ')
    const p = await ensurePool()
    const safeTenantId = resolveTenantId(tenantId, '')
    const [rows] = await p.query(
      `SELECT * FROM tasks
       WHERE owner_id = ?${safeTenantId ? ' AND tenant_id = ?' : ''} AND module_key IN (${placeholders})
       ORDER BY updated_at DESC LIMIT ?`,
      safeTenantId ? [ownerId, safeTenantId, ...modules, limit] : [ownerId, ...modules, limit],
    )
    return rows.map(mapTask)
  }

  async function findTaskByIdForUser(ownerId, moduleKey, taskId, tenantId = '') {
    const variants = getModuleKeyVariants(moduleKey)
    const placeholders = variants.map(() => '?').join(', ')
    const p = await ensurePool()
    const safeTenantId = resolveTenantId(tenantId, '')
    const [rows] = await p.query(
      `SELECT * FROM tasks
       WHERE owner_id = ?${safeTenantId ? ' AND tenant_id = ?' : ''} AND module_key IN (${placeholders}) AND task_id = ?
       LIMIT 1`,
      safeTenantId ? [ownerId, safeTenantId, ...variants, taskId] : [ownerId, ...variants, taskId],
    )
    return rows.length ? mapTask(rows[0]) : null
  }

  async function findTaskById(taskId, tenantId = '') {
    const p = await ensurePool()
    const safeTenantId = resolveTenantId(tenantId, '')
    const [rows] = await p.query(
      `SELECT * FROM tasks WHERE task_id = ?${safeTenantId ? ' AND tenant_id = ?' : ''} LIMIT 1`,
      safeTenantId ? [taskId, safeTenantId] : [taskId],
    )
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
        [`浠诲姟姝ｅ湪鎵ц锛?{row.scenario}`, now, row.task_id],
      )
      await conn.commit()
      return {
        ...mapTask(row),
        status: 'running',
        summary: `浠诲姟姝ｅ湪鎵ц锛?{row.scenario}`,
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
           summary = '浠诲姟宸叉仮澶嶅埌鎺掗槦鐘舵€侊紝绛夊緟閲嶆柊鎵ц銆?,
           updated_at = ?
       WHERE status = 'running'`,
      [new Date()],
    )
  }

  async function listTasksByStatus(status, limit = 1000, tenantId = '') {
    const p = await ensurePool()
    const safeTenantId = resolveTenantId(tenantId, '')
    const [rows] = await p.query(
      `SELECT * FROM tasks WHERE status = ?${safeTenantId ? ' AND tenant_id = ?' : ''} ORDER BY updated_at DESC LIMIT ?`,
      safeTenantId ? [status, safeTenantId, limit] : [status, limit],
    )
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

  // ---- 绠＄悊鍛樹笓灞炴煡璇㈡柟娉?----

  async function listUsers(limit = 100, offset = 0, search = '', tenantId = '') {
    const p = await ensurePool()
    const safeTenantId = resolveTenantId(tenantId, '')
    if (search) {
      const like = `%${search}%`
      const [rows] = await p.query(
        `SELECT * FROM users WHERE ${safeTenantId ? 'tenant_id = ? AND ' : ''}(name LIKE ? OR contact LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        safeTenantId ? [safeTenantId, like, like, limit, offset] : [like, like, limit, offset],
      )
      return rows.map(mapUserRow)
    }
    const [rows] = await p.query(
      `SELECT * FROM users ${safeTenantId ? 'WHERE tenant_id = ? ' : ''}ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      safeTenantId ? [safeTenantId, limit, offset] : [limit, offset],
    )
    return rows.map(mapUserRow)
  }

  async function countUsers(search = '', tenantId = '') {
    const p = await ensurePool()
    const safeTenantId = resolveTenantId(tenantId, '')
    if (search) {
      const like = `%${search}%`
      const [[row]] = await p.query(
        `SELECT COUNT(*) AS c FROM users WHERE ${safeTenantId ? 'tenant_id = ? AND ' : ''}(name LIKE ? OR contact LIKE ?)`,
        safeTenantId ? [safeTenantId, like, like] : [like, like],
      )
      return Number(row.c)
    }
    const [[row]] = await p.query(
      `SELECT COUNT(*) AS c FROM users ${safeTenantId ? 'WHERE tenant_id = ?' : ''}`,
      safeTenantId ? [safeTenantId] : [],
    )
    return Number(row.c)
  }

  async function updateUserEnabledModules(userId, modules, tenantId = '') {
    const p = await ensurePool()
    const safeTenantId = resolveTenantId(tenantId, '')
    await p.query(
      `UPDATE users
       SET enabled_modules_json = CAST(? AS JSON), updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?${safeTenantId ? ' AND tenant_id = ?' : ''}`,
      safeTenantId ? [toJson(modules), userId, safeTenantId] : [toJson(modules), userId],
    )
  }

  function buildTaskWhereClause(opts = {}) {
    const { status, moduleKey, keyword, tenantId } = opts
    const conditions = []
    const params = []
    const safeTenantId = resolveTenantId(tenantId, '')
    if (safeTenantId) {
      conditions.push('tenant_id = ?')
      params.push(safeTenantId)
    }
    if (status) {
      conditions.push('status = ?')
      params.push(status)
    }
    if (moduleKey) {
      conditions.push('module_key = ?')
      params.push(moduleKey)
    }
    if (keyword) {
      conditions.push('(task_id LIKE ? OR owner_id LIKE ? OR scenario LIKE ? OR input_text LIKE ? OR summary LIKE ?)')
      const like = `%${keyword}%`
      params.push(like, like, like, like, like)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    return { where, params }
  }

  async function listAllTasks(opts = {}) {
    const p = await ensurePool()
    const { limit = 50, offset = 0 } = opts
    const { where, params } = buildTaskWhereClause(opts)
    const [rows] = await p.query(
      `SELECT * FROM tasks ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )
    return rows.map(mapTaskRow)
  }

  async function countAllTasks(opts = {}) {
    const p = await ensurePool()
    const { where, params } = buildTaskWhereClause(opts)
    const [[row]] = await p.query(`SELECT COUNT(*) AS c FROM tasks ${where}`, params)
    return Number(row.c)
  }

  async function countTaskStatusSummary(opts = {}) {
    const p = await ensurePool()
    const { where, params } = buildTaskWhereClause({
      tenantId: opts.tenantId,
      moduleKey: opts.moduleKey,
      keyword: opts.keyword,
    })
    const [rows] = await p.query(
      `SELECT status, COUNT(*) AS cnt FROM tasks ${where} GROUP BY status`,
      params,
    )
    return rows.map((row) => ({
      status: row.status,
      count: Number(row.cnt ?? 0),
    }))
  }

  async function getModuleStats(tenantId = '') {
    const p = await ensurePool()
    const safeTenantId = resolveTenantId(tenantId, '')
    const where = safeTenantId ? 'WHERE tenant_id = ?' : ''
    const [rows] = await p.query(`
      SELECT module_key, status, COUNT(*) AS cnt
      FROM tasks
      ${where}
      GROUP BY module_key, status
    `, safeTenantId ? [safeTenantId] : [])
    return rows
  }

  async function listUsersByModule(moduleKey, tenantId = '') {
    const p = await ensurePool()
    const safeTenantId = resolveTenantId(tenantId, '')
    const [rows] = await p.query(
      `SELECT u.*, MAX(t.updated_at) AS last_task_at, COUNT(t.id) AS task_count
       FROM users u
       LEFT JOIN tasks t ON t.owner_id = u.id AND t.module_key = ?${safeTenantId ? ' AND t.tenant_id = ?' : ''}
       WHERE ${safeTenantId ? 'u.tenant_id = ? AND ' : ''}JSON_CONTAINS(u.enabled_modules_json, ?)
       GROUP BY u.id
       ORDER BY last_task_at DESC`,
      safeTenantId
        ? [moduleKey, safeTenantId, safeTenantId, JSON.stringify(moduleKey)]
        : [moduleKey, JSON.stringify(moduleKey)],
    )
    return rows.map((row) => ({
      ...mapUserRow(row),
      lastTaskAt: row.last_task_at ? toIso(row.last_task_at) : null,
      taskCount: Number(row.task_count ?? 0),
    }))
  }

  async function findModuleSettings(moduleKey, tenantId = PLATFORM_TENANT_ID) {
    const p = await ensurePool()
    const safeTenantId = resolveTenantId(tenantId)
    const [rows] = await p.query(
      'SELECT * FROM module_settings WHERE tenant_id = ? AND module_key = ? LIMIT 1',
      [safeTenantId, moduleKey],
    )
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

  async function upsertModuleSettings(moduleKey, config, updatedBy = '', tenantId = PLATFORM_TENANT_ID) {
    const p = await ensurePool()
    const safeTenantId = resolveTenantId(tenantId)
    await p.query(
      `INSERT INTO module_settings (tenant_id, module_key, config_json, updated_by)
       VALUES (?, ?, CAST(? AS JSON), ?)
       ON DUPLICATE KEY UPDATE
         config_json = VALUES(config_json),
         updated_by = VALUES(updated_by),
         updated_at = CURRENT_TIMESTAMP(3)`,
      [safeTenantId, moduleKey, toJson(config ?? {}), updatedBy || null],
    )
    return findModuleSettings(moduleKey, safeTenantId)
  }

  async function upsertFeatureRecord(record) {
    const p = await ensurePool()
    const safeTenantId = resolveTenantId(record.tenantId)
    const payload = {
      headline: record.payload?.headline ?? '',
      highlights: Array.isArray(record.payload?.highlights) ? record.payload.highlights : [],
      finding: record.payload?.finding ?? '',
      recommendation: record.payload?.recommendation ?? '',
      details: record.payload?.details ?? {},
    }

    await p.query(
      `INSERT INTO module_feature_records
       (record_id, tenant_id, task_id, owner_id, module_key, feature_key, feature_name, scenario, status, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE
         feature_name = VALUES(feature_name),
         scenario = VALUES(scenario),
         status = VALUES(status),
         payload_json = VALUES(payload_json),
         updated_at = CURRENT_TIMESTAMP(3)`,
      [
        record.recordId,
        safeTenantId,
        record.taskId,
        record.ownerId,
        record.moduleKey,
        record.featureKey,
        record.featureName,
        record.scenario,
        record.status,
        toJson(payload),
      ],
    )
  }

  function buildFeatureRecordWhereClause(opts = {}) {
    const { moduleKey, featureKey, keyword, status, tenantId } = opts
    const conditions = []
    const params = []
    const safeTenantId = resolveTenantId(tenantId, '')
    if (safeTenantId) {
      conditions.push('tenant_id = ?')
      params.push(safeTenantId)
    }
    if (moduleKey) {
      conditions.push('module_key = ?')
      params.push(moduleKey)
    }
    if (featureKey) {
      conditions.push('feature_key = ?')
      params.push(featureKey)
    }
    if (status) {
      conditions.push('status = ?')
      params.push(status)
    }
    if (keyword) {
      const like = `%${keyword}%`
      conditions.push('(record_id LIKE ? OR task_id LIKE ? OR scenario LIKE ? OR feature_name LIKE ?)')
      params.push(like, like, like, like)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    return { where, params }
  }

  async function listFeatureRecords(opts = {}) {
    const p = await ensurePool()
    const { limit = 50, offset = 0 } = opts
    const { where, params } = buildFeatureRecordWhereClause(opts)
    const [rows] = await p.query(
      `SELECT * FROM module_feature_records ${where}
       ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )
    return rows.map(mapFeatureRecordRow)
  }

  async function countFeatureRecords(opts = {}) {
    const p = await ensurePool()
    const { where, params } = buildFeatureRecordWhereClause(opts)
    const [[row]] = await p.query(`SELECT COUNT(*) AS c FROM module_feature_records ${where}`, params)
    return Number(row.c)
  }

  async function countFeatureRecordStatusSummary(opts = {}) {
    const p = await ensurePool()
    const { where, params } = buildFeatureRecordWhereClause(opts)
    const [rows] = await p.query(
      `SELECT status, COUNT(*) AS cnt
       FROM module_feature_records ${where}
       GROUP BY status`,
      params,
    )
    return rows.map((row) => ({
      status: row.status,
      count: Number(row.cnt ?? 0),
    }))
  }

  async function listCustomModules() {
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT * FROM custom_modules ORDER BY updated_at DESC, id DESC`,
    )
    return rows.map(mapCustomModuleRow)
  }

  async function findCustomModule(moduleKey) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM custom_modules WHERE module_key = ? LIMIT 1', [moduleKey])
    return rows.length ? mapCustomModuleRow(rows[0]) : null
  }

  async function upsertCustomModule(payload) {
    const p = await ensurePool()
    await p.query(
      `INSERT INTO custom_modules
       (module_key, module_name, category, description, icon, status, mobile_supported, execution_rule_json, blueprint_json, source_doc, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?)
       ON DUPLICATE KEY UPDATE
         module_name = VALUES(module_name),
         category = VALUES(category),
         description = VALUES(description),
         icon = VALUES(icon),
         status = VALUES(status),
         mobile_supported = VALUES(mobile_supported),
         execution_rule_json = VALUES(execution_rule_json),
         blueprint_json = VALUES(blueprint_json),
         source_doc = VALUES(source_doc),
         created_by = VALUES(created_by),
         updated_at = CURRENT_TIMESTAMP(3)`,
      [
        String(payload.moduleKey),
        String(payload.name),
        String(payload.category || 'enterprise'),
        payload.description ? String(payload.description) : null,
        String(payload.icon || 'Grid'),
        String(payload.status || 'beta'),
        payload.mobileSupported === false ? 0 : 1,
        toJson(payload.executionRule || {}),
        toJson(payload.blueprint || {}),
        payload.sourceDoc ? String(payload.sourceDoc) : null,
        payload.createdBy ? String(payload.createdBy) : null,
      ],
    )
    return findCustomModule(payload.moduleKey)
  }

  async function appendUserEnabledModule(userId, moduleKey) {
    const user = await findUserById(userId)
    if (!user) return null
    const enabled = new Set(Array.isArray(user.enabledModules) ? user.enabledModules : [])
    enabled.add(String(moduleKey))
    await updateUserEnabledModules(userId, [...enabled], user.tenantId)
    return findUserById(userId)
  }

  async function listDataDictionary(dictType = '') {
    const p = await ensurePool()
    const safeType = String(dictType ?? '').trim()
    const [rows] = await p.query(
      `SELECT *
       FROM data_dictionary
       WHERE status = 'active'${safeType ? ' AND dict_type = ?' : ''}
       ORDER BY dict_type ASC, sort_order ASC, id ASC`,
      safeType ? [safeType] : [],
    )
    return rows.map((row) => ({
      id: Number(row.id),
      dictType: row.dict_type,
      dictKey: row.dict_key,
      dictValue: row.dict_value,
      dictLabel: row.dict_label,
      description: row.description ?? '',
      sortOrder: Number(row.sort_order ?? 0),
      isSystem: Boolean(row.is_system),
      status: row.status,
      createdAt: row.created_at ? toIso(row.created_at) : null,
      updatedAt: row.updated_at ? toIso(row.updated_at) : null,
    }))
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
    countTaskStatusSummary,
    getModuleStats,
    listUsersByModule,
    findModuleSettings,
    upsertModuleSettings,
    upsertFeatureRecord,
    listFeatureRecords,
    countFeatureRecords,
    countFeatureRecordStatusSummary,
    listCustomModules,
    findCustomModule,
    upsertCustomModule,
    appendUserEnabledModule,
    listDataDictionary,
    close,
  }
}
