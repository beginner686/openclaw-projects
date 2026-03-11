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

export function createDataRepository({ env, moduleCatalog, securityService, getModuleName }) {
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

  function nowIso(hoursAgo = 0) {
    return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
  }

  function createSeedTasks(ownerId, enabledModules) {
    const ownerSeed = ownerId.replace(/[^a-zA-Z0-9_-]/g, '')
    return enabledModules.slice(0, 4).flatMap((moduleKey, index) => {
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

  async function seedIfEmpty() {
    const p = await ensurePool()
    const [[userCountRow]] = await p.query('SELECT COUNT(*) AS c FROM users')
    const [[taskCountRow]] = await p.query('SELECT COUNT(*) AS c FROM tasks')
    const usersCount = Number(userCountRow.c)
    const tasksCount = Number(taskCountRow.c)

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
        const user = mapUserRow(row)
        return createSeedTasks(user.id, user.enabledModules)
      })
      await insertTasks(seedTasks)
    }
  }

  async function ensureInitialized() {
    await ensurePool()
    await setupSchema()
    await ensureSchemaMigrations()
    await seedIfEmpty()
  }

  async function insertUser(user) {
    const p = await ensurePool()
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
        toJson(user.enabledModules),
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
        await conn.query(
          `INSERT INTO tasks
          (task_id, owner_id, module_key, scenario, input_text, attachments_json, status, summary, report_url, report_file, report_format, error_message, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.taskId,
            task.ownerId,
            task.moduleKey,
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
    return rows.length ? mapUserRow(rows[0]) : null
  }

  async function findUserById(id) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id])
    return rows.length ? mapUserRow(rows[0]) : null
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
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT * FROM tasks WHERE owner_id = ? AND module_key = ?
       ORDER BY updated_at DESC LIMIT ?`,
      [ownerId, moduleKey, limit],
    )
    return rows.map(mapTaskRow)
  }

  async function listRecentTasksForUser(ownerId, enabledModules, limit = 8) {
    if (!enabledModules.length) return []
    const placeholders = enabledModules.map(() => '?').join(', ')
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT * FROM tasks
       WHERE owner_id = ? AND module_key IN (${placeholders})
       ORDER BY updated_at DESC LIMIT ?`,
      [ownerId, ...enabledModules, limit],
    )
    return rows.map(mapTaskRow)
  }

  async function findTaskByIdForUser(ownerId, moduleKey, taskId) {
    const p = await ensurePool()
    const [rows] = await p.query(
      `SELECT * FROM tasks
       WHERE owner_id = ? AND module_key = ? AND task_id = ?
       LIMIT 1`,
      [ownerId, moduleKey, taskId],
    )
    return rows.length ? mapTaskRow(rows[0]) : null
  }

  async function findTaskById(taskId) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM tasks WHERE task_id = ? LIMIT 1', [taskId])
    return rows.length ? mapTaskRow(rows[0]) : null
  }

  async function findTaskByReportFile(fileName) {
    const p = await ensurePool()
    const [rows] = await p.query('SELECT * FROM tasks WHERE report_file = ? LIMIT 1', [fileName])
    return rows.length ? mapTaskRow(rows[0]) : null
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

  async function claimNextQueuedTask() {
    const p = await ensurePool()
    const conn = await p.getConnection()
    try {
      await conn.beginTransaction()
      const [rows] = await conn.query(
        `SELECT * FROM tasks WHERE status = 'queued'
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE`,
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
        ...mapTaskRow(row),
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
    return rows.map(mapTaskRow)
  }

  async function close() {
    if (pool) {
      await pool.end()
      pool = null
    }
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
    close,
  }
}
