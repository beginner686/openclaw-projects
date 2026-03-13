import mysql from 'mysql2/promise'

function toJson(value) {
  return JSON.stringify(value ?? null)
}

function parseJson(value, fallback = null) {
  if (value == null) return fallback
  if (typeof value === 'object') return value
  if (Buffer.isBuffer(value)) value = value.toString('utf8')
  if (typeof value !== 'string') return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null
}

function mapUserRow(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id ?? 't-platform-001',
    username: row.username ?? '',
    name: row.name,
    contact: row.contact,
    passwordSalt: row.password_salt,
    passwordHash: row.password_hash,
    passwordAlgo: row.password_algo ?? 'bcrypt',
    enabledModules: parseJson(row.enabled_modules_json, []),
    role: row.role ?? 'customer_member',
    status: row.status ?? 'active',
    tokenState: row.token_state ?? 'active',
    tokenVersion: Number(row.token_version ?? 0),
  }
}

function mapTaskRow(row) {
  return {
    id: Number(row.id),
    taskId: row.task_id,
    tenantId: row.tenant_id,
    moduleCode: row.module_code ?? row.module_key,
    taskType: row.task_type ?? row.scenario ?? 'general',
    taskName: row.task_name ?? row.scenario ?? '',
    status: row.status,
    inputPayload: parseJson(row.input_payload, row.input_text ? { text: row.input_text } : {}),
    outputPayload: parseJson(row.output_payload, {}),
    errorMessage: row.error_message ?? null,
    createdBy: row.created_by ?? row.owner_id ?? '',
    summary: row.summary ?? '',
    reportUrl: row.report_url ?? '',
    reportFormat: row.report_format ?? 'json',
    createdAt: toIso(row.created_at),
    startedAt: toIso(row.started_at),
    finishedAt: toIso(row.finished_at),
    updatedAt: toIso(row.updated_at),
  }
}

export function createPlatformRepository({
  env,
  securityService,
  platformModuleCatalog,
  platformRoleCatalog,
  platformPermissionCatalog,
  platformMenuCatalog,
}) {
  let pool = null
  const defaultTenantId = 't-platform-001'

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
    if (pool) return pool
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

  async function hasColumn(tableName, columnName) {
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT COUNT(*) AS c
       FROM information_schema.columns
       WHERE table_schema = ?
         AND table_name = ?
         AND column_name = ?`,
      [env.mysqlDatabase, tableName, columnName],
    )
    return Number(rows[0]?.c ?? 0) > 0
  }

  async function ensureColumn(tableName, columnName, ddl) {
    if (await hasColumn(tableName, columnName)) return
    const p = await ensurePool()
    await p.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${ddl}`)
  }

  async function ensureIndex(tableName, indexName, ddlSql) {
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT COUNT(*) AS c
       FROM information_schema.statistics
       WHERE table_schema = ?
         AND table_name = ?
         AND index_name = ?`,
      [env.mysqlDatabase, tableName, indexName],
    )
    if (Number(rows[0]?.c ?? 0) > 0) return
    await p.query(ddlSql)
  }

  async function ensureSchema() {
    const p = await ensurePool()

    await p.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(64) PRIMARY KEY,
        tenant_code VARCHAR(64) NOT NULL UNIQUE,
        tenant_name VARCHAR(120) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        role_code VARCHAR(64) NOT NULL UNIQUE,
        role_name VARCHAR(120) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        perm_code VARCHAR(100) NOT NULL UNIQUE,
        perm_name VARCHAR(120) NOT NULL,
        module_code VARCHAR(100) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        module_code VARCHAR(100) NOT NULL UNIQUE,
        module_name VARCHAR(120) NOT NULL,
        module_type VARCHAR(30) NOT NULL DEFAULT 'enterprise',
        route_path VARCHAR(191) NOT NULL,
        icon VARCHAR(80) NOT NULL DEFAULT 'Grid',
        sort INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'developing',
        access_mode VARCHAR(20) NOT NULL DEFAULT 'tenant',
        description VARCHAR(255) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS tenant_modules (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        tenant_id VARCHAR(64) NOT NULL,
        module_code VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'disabled',
        access_mode VARCHAR(20) NOT NULL DEFAULT 'tenant',
        opened_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY uq_tenant_module (tenant_id, module_code),
        INDEX idx_tenant_modules_tenant_status (tenant_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS menus (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        menu_code VARCHAR(100) NOT NULL UNIQUE,
        menu_name VARCHAR(120) NOT NULL,
        route_path VARCHAR(191) NOT NULL,
        icon VARCHAR(80) NOT NULL DEFAULT 'Grid',
        parent_code VARCHAR(100) NULL,
        sort INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'enabled',
        permission_code VARCHAR(100) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id VARCHAR(64) NOT NULL,
        role_id BIGINT NOT NULL,
        tenant_id VARCHAR(64) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE KEY uq_user_roles_user_role_tenant (user_id, role_id, tenant_id),
        INDEX idx_user_roles_user_tenant (user_id, tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await ensureColumn('users', 'tenant_id', "tenant_id VARCHAR(64) NOT NULL DEFAULT 't-platform-001' AFTER id")
    await ensureColumn('users', 'username', 'username VARCHAR(100) NULL AFTER tenant_id')
    await ensureColumn('users', 'status', "status VARCHAR(20) NOT NULL DEFAULT 'active' AFTER role")
    await ensureIndex('users', 'uq_users_username', 'CREATE UNIQUE INDEX uq_users_username ON users(username)')
    await p.query("UPDATE users SET tenant_id = 't-platform-001' WHERE tenant_id IS NULL OR tenant_id = ''")
    await p.query("UPDATE users SET username = id WHERE username IS NULL OR username = ''")

    await ensureColumn('tasks', 'tenant_id', "tenant_id VARCHAR(64) NOT NULL DEFAULT 't-platform-001' AFTER owner_id")
    await ensureColumn('tasks', 'module_code', 'module_code VARCHAR(100) NULL AFTER module_key')
    await ensureColumn('tasks', 'task_type', 'task_type VARCHAR(100) NULL AFTER module_code')
    await ensureColumn('tasks', 'task_name', 'task_name VARCHAR(191) NULL AFTER task_type')
    await ensureColumn('tasks', 'input_payload', 'input_payload JSON NULL AFTER input_text')
    await ensureColumn('tasks', 'output_payload', 'output_payload JSON NULL AFTER input_payload')
    await ensureColumn('tasks', 'created_by', 'created_by VARCHAR(64) NULL AFTER error_message')
    await ensureColumn('tasks', 'started_at', 'started_at DATETIME(3) NULL AFTER created_at')
    await ensureColumn('tasks', 'finished_at', 'finished_at DATETIME(3) NULL AFTER started_at')
    await ensureIndex('tasks', 'idx_tasks_tenant_status_created', 'CREATE INDEX idx_tasks_tenant_status_created ON tasks(tenant_id, status, created_at)')
    await ensureIndex('tasks', 'idx_tasks_tenant_module_created', 'CREATE INDEX idx_tasks_tenant_module_created ON tasks(tenant_id, module_code, created_at)')

    await p.query("UPDATE tasks SET tenant_id = 't-platform-001' WHERE tenant_id IS NULL OR tenant_id = ''")
    await p.query('UPDATE tasks SET module_code = module_key WHERE module_code IS NULL OR module_code = ""')
    await p.query('UPDATE tasks SET task_type = scenario WHERE task_type IS NULL OR task_type = ""')
    await p.query('UPDATE tasks SET task_name = scenario WHERE task_name IS NULL OR task_name = ""')
    await p.query('UPDATE tasks SET created_by = owner_id WHERE created_by IS NULL OR created_by = ""')
    await p.query("UPDATE tasks SET input_payload = JSON_OBJECT('legacy_text', input_text) WHERE input_payload IS NULL")

    await p.query(`
      CREATE TABLE IF NOT EXISTS task_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        task_id BIGINT NOT NULL,
        tenant_id VARCHAR(64) NOT NULL,
        log_level VARCHAR(20) NOT NULL DEFAULT 'info',
        message TEXT NOT NULL,
        payload_json JSON NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_task_logs_task_created (task_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        tenant_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NULL,
        message_type VARCHAR(30) NOT NULL DEFAULT 'system',
        title VARCHAR(191) NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'unread',
        source_module VARCHAR(100) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        read_at DATETIME(3) NULL,
        INDEX idx_messages_tenant_user_status (tenant_id, user_id, status, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        tenant_id VARCHAR(64) NOT NULL,
        module_code VARCHAR(100) NOT NULL,
        task_id BIGINT NULL,
        report_name VARCHAR(191) NOT NULL,
        report_format VARCHAR(20) NOT NULL DEFAULT 'json',
        report_url VARCHAR(512) NULL,
        summary TEXT NULL,
        created_by VARCHAR(64) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_reports_tenant_created (tenant_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS files (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        tenant_id VARCHAR(64) NOT NULL,
        module_code VARCHAR(100) NULL,
        file_name VARCHAR(191) NOT NULL,
        file_path VARCHAR(512) NOT NULL,
        file_size BIGINT NOT NULL DEFAULT 0,
        mime_type VARCHAR(120) NULL,
        created_by VARCHAR(64) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_files_tenant_created (tenant_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS package_plans (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        package_code VARCHAR(64) NOT NULL UNIQUE,
        package_name VARCHAR(120) NOT NULL,
        package_type VARCHAR(30) NOT NULL DEFAULT 'standard',
        price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
        price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        description VARCHAR(255) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_package_plans_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS package_modules (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        package_id BIGINT NOT NULL,
        module_code VARCHAR(100) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE KEY uq_package_modules_package_module (package_id, module_code),
        INDEX idx_package_modules_package (package_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS tenant_packages (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        tenant_id VARCHAR(64) NOT NULL,
        package_id BIGINT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        started_at DATETIME(3) NULL,
        expired_at DATETIME(3) NULL,
        created_by VARCHAR(64) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY uq_tenant_packages_tenant (tenant_id),
        INDEX idx_tenant_packages_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS system_configs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        tenant_id VARCHAR(64) NULL,
        config_key VARCHAR(120) NOT NULL,
        config_value_json JSON NOT NULL,
        description VARCHAR(255) NULL,
        updated_by VARCHAR(64) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY uq_system_configs_tenant_key (tenant_id, config_key),
        INDEX idx_system_configs_key (config_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)
  }

  async function seedBase() {
    const p = await ensurePool()
    const packagePlans = [
      {
        packageCode: 'starter',
        packageName: 'Starter',
        packageType: 'self_service',
        priceMonthly: 199,
        priceYearly: 1990,
        status: 'active',
        description: 'Starter package for small teams and proof-of-concept delivery.',
        moduleCodes: platformModuleCatalog.slice(0, 3).map((item) => item.moduleCode),
      },
      {
        packageCode: 'growth',
        packageName: 'Growth',
        packageType: 'business',
        priceMonthly: 599,
        priceYearly: 5990,
        status: 'active',
        description: 'Growth package with task, content, lead, and public monitoring modules.',
        moduleCodes: platformModuleCatalog.slice(0, 8).map((item) => item.moduleCode),
      },
      {
        packageCode: 'enterprise',
        packageName: 'Enterprise',
        packageType: 'enterprise',
        priceMonthly: 1999,
        priceYearly: 19990,
        status: 'active',
        description: 'Full platform package with all modules and enterprise operations support.',
        moduleCodes: platformModuleCatalog.map((item) => item.moduleCode),
      },
    ]

    await p.query(
      `INSERT INTO tenants (id, tenant_code, tenant_name, status)
       VALUES (?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE tenant_name = VALUES(tenant_name), status = VALUES(status)`,
      [defaultTenantId, 'openclaw-default', 'OpenClaw Default Tenant'],
    )

    for (const role of platformRoleCatalog) {
      await p.query(
        `INSERT INTO roles (role_code, role_name)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE role_name = VALUES(role_name)`,
        [role.roleCode, role.roleName],
      )
    }

    for (const perm of platformPermissionCatalog) {
      await p.query(
        `INSERT INTO permissions (perm_code, perm_name, module_code)
         VALUES (?, ?, NULL)
         ON DUPLICATE KEY UPDATE perm_name = VALUES(perm_name)`,
        [perm.permCode, perm.permName],
      )
    }

    for (const menu of platformMenuCatalog) {
      await p.query(
        `INSERT INTO menus (menu_code, menu_name, route_path, icon, sort, status)
         VALUES (?, ?, ?, ?, ?, 'enabled')
         ON DUPLICATE KEY UPDATE menu_name = VALUES(menu_name), route_path = VALUES(route_path), icon = VALUES(icon), sort = VALUES(sort)`,
        [menu.menuCode, menu.menuName, menu.routePath, menu.icon, menu.sort],
      )
    }

    for (const module of platformModuleCatalog) {
      await p.query(
        `INSERT INTO modules (module_code, module_name, module_type, route_path, icon, sort, status, access_mode, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           module_name = VALUES(module_name),
           module_type = VALUES(module_type),
           route_path = VALUES(route_path),
           icon = VALUES(icon),
           sort = VALUES(sort),
           status = VALUES(status),
           access_mode = VALUES(access_mode),
           description = VALUES(description)`,
        [
          module.moduleCode,
          module.moduleName,
          module.moduleType,
          module.routePath,
          module.icon,
          module.sort,
          module.status,
          module.accessMode,
          module.description ?? null,
        ],
      )
      await p.query(
        `INSERT INTO tenant_modules (tenant_id, module_code, status, access_mode, opened_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), access_mode = VALUES(access_mode), opened_at = VALUES(opened_at)`,
        [defaultTenantId, module.moduleCode, module.sort <= 5 ? 'enabled' : 'developing', module.accessMode, new Date()],
      )
    }

    for (const item of packagePlans) {
      await p.query(
        `INSERT INTO package_plans (package_code, package_name, package_type, price_monthly, price_yearly, status, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           package_name = VALUES(package_name),
           package_type = VALUES(package_type),
           price_monthly = VALUES(price_monthly),
           price_yearly = VALUES(price_yearly),
           status = VALUES(status),
           description = VALUES(description)`,
        [
          item.packageCode,
          item.packageName,
          item.packageType,
          item.priceMonthly,
          item.priceYearly,
          item.status,
          item.description,
        ],
      )

      const [packageRows] = await p.query('SELECT id FROM package_plans WHERE package_code = ? LIMIT 1', [item.packageCode])
      if (!packageRows.length) continue
      const packageId = Number(packageRows[0].id)
      for (const moduleCode of item.moduleCodes) {
        await p.query(
          `INSERT INTO package_modules (package_id, module_code)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE module_code = VALUES(module_code)`,
          [packageId, moduleCode],
        )
      }
    }

    const enabledModules = platformModuleCatalog.filter((m) => m.sort <= 5).map((m) => m.moduleCode)
    const defaultUsers = [
      {
        id: 'u-admin-001',
        username: 'admin',
        name: 'Platform Admin',
        contact: 'admin@openclaw.local',
        password: '123456',
        role: 'platform_admin',
        roleCode: 'platform_super_admin',
      },
      {
        id: 'u-demo-003',
        username: 'demo',
        name: 'Customer Admin',
        contact: 'demo@openclaw.local',
        password: '123456',
        role: 'customer_admin',
        roleCode: 'customer_admin',
      },
      {
        id: 'u-readonly-004',
        username: 'readonly',
        name: 'Read Only User',
        contact: 'readonly@openclaw.local',
        password: '123456',
        role: 'read_only',
        roleCode: 'read_only',
      },
    ]

    for (const item of defaultUsers) {
      const [userRows] = await p.query('SELECT id FROM users WHERE contact = ? LIMIT 1', [item.contact])
      let userId = item.id
      if (!userRows.length) {
        const user = securityService.createStoredUser({
          id: item.id,
          username: item.username,
          name: item.name,
          contact: item.contact,
          password: item.password,
          enabledModules,
          role: item.role,
          tenantId: defaultTenantId,
        })
        await p.query(
          `INSERT INTO users (id, tenant_id, username, name, contact, password_salt, password_hash, password_algo, enabled_modules_json, role, status, token_state, token_version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, 'active', 'active', 0)`,
          [
            user.id,
            user.tenantId,
            user.username,
            user.name,
            user.contact,
            user.passwordSalt,
            user.passwordHash,
            user.passwordAlgo,
            toJson(user.enabledModules),
            user.role,
          ],
        )
      } else {
        userId = userRows[0].id
      }

      const [roleRows] = await p.query('SELECT id FROM roles WHERE role_code = ? LIMIT 1', [item.roleCode])
      if (roleRows.length) {
        await p.query(
          `INSERT INTO user_roles (user_id, role_id, tenant_id)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE tenant_id = VALUES(tenant_id)`,
          [userId, Number(roleRows[0].id), defaultTenantId],
        )
      }
    }

    const [enterpriseRows] = await p.query('SELECT id FROM package_plans WHERE package_code = ? LIMIT 1', ['enterprise'])
    if (enterpriseRows.length) {
      await p.query(
        `INSERT INTO tenant_packages (tenant_id, package_id, status, started_at, created_by)
         VALUES (?, ?, 'active', ?, ?)
         ON DUPLICATE KEY UPDATE
           package_id = VALUES(package_id),
           status = VALUES(status),
           started_at = VALUES(started_at),
           created_by = VALUES(created_by)`,
        [defaultTenantId, Number(enterpriseRows[0].id), new Date(), 'u-admin-001'],
      )
    }

    const [[messageCount]] = await p.query('SELECT COUNT(*) AS c FROM messages WHERE tenant_id = ?', [defaultTenantId])
    if (Number(messageCount.c) === 0) {
      await p.query(
        `INSERT INTO messages (tenant_id, user_id, message_type, title, content, status, source_module)
         VALUES
         (?, NULL, 'system', 'Backend Ready', 'Platform public modules have been initialized.', 'unread', NULL),
         (?, NULL, 'alert', 'Task Center', 'Task and task log APIs are available.', 'unread', 'campaign')`,
        [defaultTenantId, defaultTenantId],
      )
    }
  }

  async function ensureInitialized() {
    await ensurePool()
    await ensureSchema()
    await seedBase()
  }

  async function findUserByAccount(account) {
    const normalized = String(account ?? '').trim().toLowerCase()
    if (!normalized) return null
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT * FROM users
       WHERE LOWER(contact) = ?
          OR LOWER(COALESCE(username, '')) = ?
          OR id = ?
       LIMIT 1`,
      [normalized, normalized, normalized],
    )
    return rows.length ? mapUserRow(rows[0]) : null
  }

  async function findUserById(id) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id])
    return rows.length ? mapUserRow(rows[0]) : null
  }

  async function getUserRoleCodes(userId, tenantId) {
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT r.role_code FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ? AND ur.tenant_id = ?`,
      [userId, tenantId],
    )
    return rows.map((row) => row.role_code)
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

  async function close() {
    if (pool) {
      await pool.end()
      pool = null
    }
  }

  return {
    ensureInitialized,
    findUserByAccount,
    findUserById,
    getUserRoleCodes,
    setUserTokenState,
    incrementUserTokenVersion,
    close,
    _helpers: {
      ensurePool,
      mapTaskRow,
      parseJson,
      toJson,
      toIso,
      defaultTenantId,
    },
  }
}
