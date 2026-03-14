import { randomBytes } from 'node:crypto'
import { AppError, assertOrThrow } from '../utils/app-error.js'

function toJson(value) {
  return JSON.stringify(value ?? null)
}

function normalizePage(query) {
  const page = Math.max(1, Number(query?.page ?? 1) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize ?? 20) || 20))
  const offset = (page - 1) * pageSize
  return { page, pageSize, offset }
}

function splitCodes(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeStatus(value, allowed, fallback) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  return allowed.includes(normalized) ? normalized : fallback
}

function toRoleValue(roleCode) {
  if (roleCode === 'platform_super_admin' || roleCode === 'platform_operator_admin') return 'platform_admin'
  if (roleCode === 'customer_admin') return 'customer_admin'
  if (roleCode === 'read_only') return 'read_only'
  return 'customer_member'
}

function toDateOrNull(value, errorFactory) {
  if (value == null || value === '') return null
  const date = new Date(value)
  assertOrThrow(!Number.isNaN(date.getTime()), errorFactory())
  return date
}

function canManageModule(user) {
  const roles = user.roleCodes ?? []
  return (
    roles.includes('platform_super_admin') ||
    roles.includes('platform_operator_admin') ||
    roles.includes('customer_admin') ||
    user.role === 'platform_admin' ||
    user.role === 'customer_admin'
  )
}

function isReadOnlyUser(user) {
  const roles = user.roleCodes ?? []
  return roles.includes('read_only') || user.role === 'read_only'
}

function isPlatformAdmin(user) {
  const roles = user.roleCodes ?? []
  return (
    roles.includes('platform_super_admin') ||
    roles.includes('platform_operator_admin') ||
    user.role === 'platform_admin'
  )
}

function canManageTenant(user, tenantId) {
  if (isPlatformAdmin(user)) return true
  const roles = user.roleCodes ?? []
  return user.tenantId === tenantId && (roles.includes('customer_admin') || user.role === 'customer_admin')
}

function mapModuleRow(row) {
  return {
    id: Number(row.id),
    moduleCode: row.module_code,
    moduleName: row.module_name,
    moduleType: row.module_type,
    routePath: row.route_path,
    icon: row.icon,
    sort: Number(row.sort ?? 0),
    status: row.tenant_status ?? row.default_status,
    accessMode: row.tenant_access_mode ?? row.default_access_mode,
    description: row.description ?? '',
    openedAt: row.opened_at ? new Date(row.opened_at).toISOString() : null,
  }
}

function mapTaskRow(row, parseJson) {
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
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  }
}

function mapTenantRow(row) {
  return {
    id: row.id,
    tenantCode: row.tenant_code,
    tenantName: row.tenant_name,
    status: row.status,
    userCount: Number(row.user_count ?? 0),
    enabledModuleCount: Number(row.enabled_module_count ?? 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    package: row.package_id
      ? {
          id: Number(row.package_id),
          packageCode: row.package_code,
          packageName: row.package_name,
          packageType: row.package_type,
          status: row.subscription_status ?? 'active',
          startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
          expiredAt: row.expired_at ? new Date(row.expired_at).toISOString() : null,
        }
      : null,
  }
}

function mapUserRow(row, parseJson) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name ?? '',
    username: row.username ?? '',
    name: row.name,
    contact: row.contact,
    role: row.role,
    roleCodes: splitCodes(row.role_codes),
    status: row.status,
    tokenState: row.token_state,
    enabledModules: parseJson(row.enabled_modules_json, []),
    enabledModuleCount: Number(row.enabled_module_count ?? 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  }
}

function mapPackageRow(row) {
  return {
    id: Number(row.id),
    packageCode: row.package_code,
    packageName: row.package_name,
    packageType: row.package_type,
    priceMonthly: Number(row.price_monthly ?? 0),
    priceYearly: Number(row.price_yearly ?? 0),
    status: row.status,
    description: row.description ?? '',
    moduleCodes: splitCodes(row.module_codes),
    tenantCount: Number(row.tenant_count ?? 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  }
}

export function createPlatformService({ platformRepository, securityService }) {
  const helpers = platformRepository._helpers

  function assertPlatformAdmin(authUser, message = 'platform admin permission required') {
    assertOrThrow(isPlatformAdmin(authUser), { status: 403, code: 40321, message })
  }

  function assertTenantManager(authUser, tenantId, message = 'no permission to manage tenant') {
    assertOrThrow(canManageTenant(authUser, tenantId), { status: 403, code: 40322, message })
  }

  async function getPackageModuleCodes(packageId) {
    const p = await helpers.ensurePool()
    const [rows] = await p.query(
      `SELECT module_code
       FROM package_modules
       WHERE package_id = ?
       ORDER BY module_code ASC`,
      [Number(packageId)],
    )
    return rows.map((row) => row.module_code)
  }

  async function syncTenantPackageState({ tenantId, packageId, status, startedAt, expiredAt, createdBy }) {
    const p = await helpers.ensurePool()
    const moduleCodes = await getPackageModuleCodes(packageId)
    assertOrThrow(moduleCodes.length > 0, { status: 400, code: 40021, message: 'package has no modules configured' })
    const effectiveModuleStatus = status === 'active' ? 'enabled' : 'disabled'
    const effectiveEnabledModules = status === 'active' ? moduleCodes : []

    await p.query(
      `INSERT INTO tenant_packages (tenant_id, package_id, status, started_at, expired_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         package_id = VALUES(package_id),
         status = VALUES(status),
         started_at = VALUES(started_at),
         expired_at = VALUES(expired_at),
         created_by = VALUES(created_by)`,
      [tenantId, Number(packageId), status, startedAt, expiredAt, createdBy ?? null],
    )

    await p.query(
      `UPDATE tenant_modules
       SET status = 'disabled', updated_at = CURRENT_TIMESTAMP(3)
       WHERE tenant_id = ?`,
      [tenantId],
    )

    for (const moduleCode of moduleCodes) {
      await p.query(
        `INSERT INTO tenant_modules (tenant_id, module_code, status, access_mode, opened_at)
         VALUES (?, ?, ?, 'tenant', ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           access_mode = VALUES(access_mode),
           opened_at = VALUES(opened_at)`,
        [tenantId, moduleCode, effectiveModuleStatus, startedAt],
      )
    }

    await p.query(
      `UPDATE users
       SET enabled_modules_json = CAST(? AS JSON), updated_at = CURRENT_TIMESTAMP(3)
       WHERE tenant_id = ?`,
      [toJson(effectiveEnabledModules), tenantId],
    )

    return effectiveEnabledModules
  }

  async function attachUserRole({ userId, tenantId, roleCode }) {
    const p = await helpers.ensurePool()
    const [roleRows] = await p.query('SELECT id FROM roles WHERE role_code = ? LIMIT 1', [roleCode])
    assertOrThrow(roleRows.length > 0, { status: 400, code: 40022, message: 'role not found' })
    await p.query(
      `INSERT INTO user_roles (user_id, role_id, tenant_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE tenant_id = VALUES(tenant_id)`,
      [userId, Number(roleRows[0].id), tenantId],
    )
  }

  async function buildTenantQuery(whereSql, args, pageSize, offset) {
    const p = await helpers.ensurePool()
    const [rows] = await p.query(
      `SELECT
          t.tenant_id AS id,
          t.tenant_code,
          t.tenant_name,
          t.status,
          t.created_at,
          t.updated_at,
          tp.package_id,
          tp.status AS subscription_status,
          tp.started_at,
          tp.expired_at,
          pp.package_code,
         pp.package_name,
         pp.package_type,
         COUNT(DISTINCT u.id) AS user_count,
         COUNT(DISTINCT CASE WHEN tm.status = 'enabled' THEN tm.module_code END) AS enabled_module_count
       FROM tenants t
       LEFT JOIN tenant_packages tp ON tp.tenant_id = t.tenant_id
       LEFT JOIN package_plans pp ON pp.id = tp.package_id
       LEFT JOIN users u ON u.tenant_id = t.tenant_id
       LEFT JOIN tenant_modules tm ON tm.tenant_id = t.tenant_id
       ${whereSql}
       GROUP BY
         t.tenant_id, t.tenant_code, t.tenant_name, t.status, t.created_at, t.updated_at,
         tp.package_id, tp.status, tp.started_at, tp.expired_at,
         pp.package_code, pp.package_name, pp.package_type
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...args, pageSize, offset],
    )
    return rows.map(mapTenantRow)
  }

  async function login({ account, password, remember }) {
    const normalized = String(account ?? '').trim().toLowerCase()
    const rawPassword = String(password ?? '')
    assertOrThrow(normalized && rawPassword, {
      status: 400,
      code: 40001,
      message: 'account and password are required',
    })

    const user = await platformRepository.findUserByAccount(normalized)
    assertOrThrow(user, { status: 401, code: 40101, message: 'invalid credentials' })
    assertOrThrow(user.status === 'active', { status: 403, code: 40301, message: 'user is disabled' })

    const ok = securityService.verifyPassword(rawPassword, user)
    assertOrThrow(ok, { status: 401, code: 40102, message: 'invalid credentials' })

    if (user.tokenState !== 'active') {
      await platformRepository.setUserTokenState(user.id, 'active')
    }

    const roleCodes = await platformRepository.getUserRoleCodes(user.id, user.tenantId)
    const token = securityService.signAuthToken({
      userId: user.id,
      role: roleCodes[0] ?? user.role,
      remember: Boolean(remember),
      tokenVersion: user.tokenVersion,
      tenantId: user.tenantId,
    })
    return {
      token,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        username: user.username,
        name: user.name,
        contact: user.contact,
        role: user.role,
        roleCodes,
        enabledModules: user.enabledModules,
      },
    }
  }

  async function buildProfile(authUser) {
    const roleCodes = await platformRepository.getUserRoleCodes(authUser.id, authUser.tenantId)
    return {
      id: authUser.id,
      tenantId: authUser.tenantId,
      username: authUser.username,
      name: authUser.name,
      contact: authUser.contact,
      role: authUser.role,
      roleCodes,
      enabledModules: authUser.enabledModules,
      tokenState: authUser.tokenState,
    }
  }

  async function logout(userId) {
    await platformRepository.incrementUserTokenVersion(userId)
    await platformRepository.setUserTokenState(userId, 'expired')
  }

  async function listMenus(authUser) {
    const p = await helpers.ensurePool()
    const [rows] = await p.query(
      `SELECT id, menu_code, menu_name, route_path, icon, parent_code, sort, status, permission_code
       FROM menus
       WHERE status = 'enabled'
       ORDER BY sort ASC, id ASC`,
    )

    const hiddenForTenant = new Set(['customer-management', 'package-management'])
    return rows
      .filter((row) => (isPlatformAdmin(authUser) ? true : !hiddenForTenant.has(row.menu_code)))
      .map((row) => ({
        id: Number(row.id),
        menuCode: row.menu_code,
        menuName: row.menu_name,
        routePath: row.route_path,
        icon: row.icon,
        parentCode: row.parent_code,
        sort: Number(row.sort ?? 0),
        status: row.status,
        permissionCode: row.permission_code ?? null,
      }))
  }

  async function listRoles() {
    const p = await helpers.ensurePool()
    const [rows] = await p.query(
      `SELECT id, role_code, role_name, created_at
       FROM roles
       ORDER BY role_code ASC`,
    )
    return rows.map((row) => ({
      id: Number(row.id),
      roleCode: row.role_code,
      roleName: row.role_name,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    }))
  }

  async function listPermissions() {
    const p = await helpers.ensurePool()
    const [rows] = await p.query(
      `SELECT id, perm_code, perm_name, module_code, created_at
       FROM permissions
       ORDER BY perm_code ASC`,
    )
    return rows.map((row) => ({
      id: Number(row.id),
      permCode: row.perm_code,
      permName: row.perm_name,
      moduleCode: row.module_code,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    }))
  }

  async function listModules(authUser) {
    const p = await helpers.ensurePool()
    const [rows] = await p.query(
      `SELECT
          m.id,
          m.module_code,
          m.module_name,
          m.module_type,
          m.route_path,
          m.icon,
          m.sort,
          m.status AS default_status,
          m.access_mode AS default_access_mode,
          m.description,
          tm.status AS tenant_status,
          tm.access_mode AS tenant_access_mode,
          tm.opened_at
       FROM modules m
       LEFT JOIN tenant_modules tm
         ON tm.module_code = m.module_code
        AND tm.tenant_id = ?
       ORDER BY m.sort ASC`,
      [authUser.tenantId],
    )
    return rows.map(mapModuleRow)
  }

  async function getModule(authUser, code) {
    const p = await helpers.ensurePool()
    const [rows] = await p.query(
      `SELECT
          m.id,
          m.module_code,
          m.module_name,
          m.module_type,
          m.route_path,
          m.icon,
          m.sort,
          m.status AS default_status,
          m.access_mode AS default_access_mode,
          m.description,
          tm.status AS tenant_status,
          tm.access_mode AS tenant_access_mode,
          tm.opened_at
       FROM modules m
       LEFT JOIN tenant_modules tm
         ON tm.module_code = m.module_code
        AND tm.tenant_id = ?
       WHERE m.module_code = ?
       LIMIT 1`,
      [authUser.tenantId, code],
    )
    assertOrThrow(rows.length > 0, { status: 404, code: 40401, message: 'module not found' })
    return mapModuleRow(rows[0])
  }

  async function openModule(authUser, code, accessMode = 'tenant') {
    assertOrThrow(canManageModule(authUser), { status: 403, code: 40311, message: 'no permission to open module' })
    const p = await helpers.ensurePool()
    const [existsRows] = await p.query('SELECT module_code FROM modules WHERE module_code = ? LIMIT 1', [code])
    assertOrThrow(existsRows.length > 0, { status: 404, code: 40401, message: 'module not found' })

    await p.query(
      `INSERT INTO tenant_modules (tenant_id, module_code, status, access_mode, opened_at)
       VALUES (?, ?, 'enabled', ?, ?)
       ON DUPLICATE KEY UPDATE status = 'enabled', access_mode = VALUES(access_mode), opened_at = VALUES(opened_at)`,
      [authUser.tenantId, code, accessMode, new Date()],
    )
    return getModule(authUser, code)
  }

  async function listTenants(authUser, query) {
    const { page, pageSize, offset } = normalizePage(query)
    const where = []
    const args = []
    const keyword = String(query?.keyword ?? '').trim()
    const status = String(query?.status ?? '').trim()
    const requestedTenantId = String(query?.tenantId ?? '').trim()

    if (!isPlatformAdmin(authUser)) {
      where.push('t.tenant_id = ?')
      args.push(authUser.tenantId)
    } else if (requestedTenantId) {
      where.push('t.tenant_id = ?')
      args.push(requestedTenantId)
    }

    if (keyword) {
      where.push('(t.tenant_name LIKE ? OR t.tenant_code LIKE ?)')
      args.push(`%${keyword}%`, `%${keyword}%`)
    }

    if (status) {
      where.push('t.status = ?')
      args.push(status)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const p = await helpers.ensurePool()
    const [countRows] = await p.query(`SELECT COUNT(*) AS c FROM tenants t ${whereSql}`, args)
    const total = Number(countRows[0]?.c ?? 0)
    const list = await buildTenantQuery(whereSql, args, pageSize, offset)
    return {
      list,
      pagination: { total, page, pageSize },
    }
  }

  async function getTenant(authUser, tenantId) {
    const safeTenantId = String(tenantId ?? '').trim()
    assertTenantManager(authUser, safeTenantId, 'no permission to view tenant')

    const list = await buildTenantQuery('WHERE t.tenant_id = ?', [safeTenantId], 1, 0)
    assertOrThrow(list.length > 0, { status: 404, code: 40431, message: 'tenant not found' })

    const p = await helpers.ensurePool()
    const [moduleRows] = await p.query(
      `SELECT tm.module_code, tm.status, tm.access_mode, tm.opened_at, m.module_name, m.module_type
       FROM tenant_modules tm
       LEFT JOIN modules m ON m.module_code = tm.module_code
       WHERE tm.tenant_id = ?
       ORDER BY m.sort ASC, tm.module_code ASC`,
      [safeTenantId],
    )
    const [userRows] = await p.query(
      `SELECT
          u.id,
          u.tenant_id,
          t.tenant_name,
          u.username,
          u.name,
          u.contact,
          u.role,
          u.status,
          u.token_state,
          u.enabled_modules_json,
          COALESCE(JSON_LENGTH(u.enabled_modules_json), 0) AS enabled_module_count,
          u.created_at,
          u.updated_at,
          GROUP_CONCAT(DISTINCT r.role_code ORDER BY r.role_code SEPARATOR ',') AS role_codes
       FROM users u
       LEFT JOIN tenants t ON t.tenant_id = u.tenant_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.tenant_id = u.tenant_id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.tenant_id = ?
       GROUP BY
         u.id, u.tenant_id, t.tenant_name, u.username, u.name, u.contact,
         u.role, u.status, u.token_state, u.enabled_modules_json,
         u.created_at, u.updated_at
       ORDER BY u.created_at DESC`,
      [safeTenantId],
    )

    return {
      ...list[0],
      modules: moduleRows.map((row) => ({
        moduleCode: row.module_code,
        moduleName: row.module_name ?? row.module_code,
        moduleType: row.module_type ?? 'enterprise',
        status: row.status,
        accessMode: row.access_mode,
        openedAt: row.opened_at ? new Date(row.opened_at).toISOString() : null,
      })),
      users: userRows.map((row) => mapUserRow(row, helpers.parseJson)),
    }
  }

  async function createTenant(authUser, payload) {
    assertPlatformAdmin(authUser, 'no permission to create tenant')
    const tenantCode = String(payload?.tenantCode ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
    const tenantName = String(payload?.tenantName ?? '').trim()
    const initialPackageId = Number(payload?.packageId ?? 0) || null
    assertOrThrow(tenantCode && tenantName, {
      status: 400,
      code: 40023,
      message: 'tenantCode and tenantName are required',
    })

    const p = await helpers.ensurePool()
    const [tenantCodeRows] = await p.query('SELECT tenant_id FROM tenants WHERE tenant_code = ? LIMIT 1', [tenantCode])
    assertOrThrow(tenantCodeRows.length === 0, { status: 409, code: 40921, message: 'tenantCode already exists' })

    const tenantId = `t-${randomBytes(5).toString('hex')}`
    await p.query(
      `INSERT INTO tenants (tenant_id, tenant_code, tenant_name, status)
       VALUES (?, ?, ?, ?)`,
      [tenantId, tenantCode, tenantName, normalizeStatus(payload?.status, ['active', 'disabled'], 'active')],
    )

    let packageId = initialPackageId
    if (!packageId) {
      const [packageRows] = await p.query(
        `SELECT id
         FROM package_plans
         WHERE package_code = 'growth'
         LIMIT 1`,
      )
      packageId = packageRows.length ? Number(packageRows[0].id) : null
    }

    let enabledModules = []
    if (packageId) {
      const [packageRows] = await p.query('SELECT id FROM package_plans WHERE id = ? LIMIT 1', [packageId])
      assertOrThrow(packageRows.length > 0, { status: 404, code: 40441, message: 'package not found' })
      enabledModules = await syncTenantPackageState({
        tenantId,
        packageId,
        status: 'active',
        startedAt: new Date(),
        expiredAt: null,
        createdBy: authUser.id,
      })
    }

    const adminPayload = payload?.adminUser ?? {}
    const tempPassword = String(adminPayload.password ?? '').trim() || '123456'
    const username = String(adminPayload.username ?? `${tenantCode}-admin`)
      .trim()
      .toLowerCase()
    const name = String(adminPayload.name ?? `${tenantName} Admin`).trim()
    const contact = String(adminPayload.contact ?? `${tenantCode}.admin@openclaw.local`)
      .trim()
      .toLowerCase()
    assertOrThrow(username && name && contact, { status: 400, code: 40024, message: 'admin user info is invalid' })

    const [userDupRows] = await p.query(
      `SELECT id
       FROM users
       WHERE LOWER(username) = ? OR LOWER(contact) = ?
       LIMIT 1`,
      [username, contact],
    )
    assertOrThrow(userDupRows.length === 0, { status: 409, code: 40922, message: 'admin username or contact already exists' })

    const adminUser = securityService.createStoredUser({
      id: `u-${randomBytes(4).toString('hex')}`,
      username,
      tenantId,
      name,
      contact,
      password: tempPassword,
      enabledModules,
      role: 'customer_admin',
      status: 'active',
    })

    await p.query(
      `INSERT INTO users (id, tenant_id, username, name, contact, password_salt, password_hash, password_algo, enabled_modules_json, role, status, token_state, token_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, 'active', 0)`,
      [
        adminUser.id,
        adminUser.tenantId,
        adminUser.username,
        adminUser.name,
        adminUser.contact,
        adminUser.passwordSalt,
        adminUser.passwordHash,
        adminUser.passwordAlgo,
        toJson(adminUser.enabledModules),
        adminUser.role,
        adminUser.status,
      ],
    )
    await attachUserRole({ userId: adminUser.id, tenantId, roleCode: 'customer_admin' })

    return {
      tenant: await getTenant(authUser, tenantId),
      adminUser: {
        id: adminUser.id,
        username: adminUser.username,
        contact: adminUser.contact,
        tempPassword,
      },
    }
  }

  async function listTasks(authUser, query) {
    const p = await helpers.ensurePool()
    const { page, pageSize, offset } = normalizePage(query)
    const where = ['tenant_id = ?']
    const args = [authUser.tenantId]
    const moduleCode = String(query?.moduleCode ?? '').trim()
    const status = String(query?.status ?? '').trim()
    if (moduleCode) {
      where.push('module_code = ?')
      args.push(moduleCode)
    }
    if (status) {
      where.push('status = ?')
      args.push(status)
    }

    const [countRows] = await p.query(`SELECT COUNT(*) AS c FROM tasks WHERE ${where.join(' AND ')}`, args)
    const total = Number(countRows[0]?.c ?? 0)
    const [rows] = await p.query(
      `SELECT * FROM tasks WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset],
    )
    return {
      list: rows.map((row) => mapTaskRow(row, helpers.parseJson)),
      pagination: { total, page, pageSize },
    }
  }

  async function assertModuleEnabledForUser(authUser, moduleCode) {
    const module = await getModule(authUser, moduleCode)
    assertOrThrow(module.status === 'enabled', { status: 403, code: 40302, message: 'module not enabled' })
    return module
  }

  async function createTask(authUser, payload) {
    assertOrThrow(!isReadOnlyUser(authUser), { status: 403, code: 40312, message: 'read only user cannot create task' })
    const moduleCode = String(payload?.moduleCode ?? '').trim()
    const taskType = String(payload?.taskType ?? '').trim() || 'general'
    const taskName = String(payload?.taskName ?? '').trim()
    const inputPayload = payload?.inputPayload ?? payload?.input ?? {}
    assertOrThrow(moduleCode && taskName, { status: 400, code: 40002, message: 'moduleCode and taskName are required' })
    await assertModuleEnabledForUser(authUser, moduleCode)

    const p = await helpers.ensurePool()
    const taskId = `task-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`
    const now = new Date()
    const inputText = typeof inputPayload === 'string' ? inputPayload : JSON.stringify(inputPayload)
    const [result] = await p.query(
      `INSERT INTO tasks
      (
        task_id, owner_id, tenant_id, module_key, module_code, scenario, task_type, task_name,
        input_text, input_payload, output_payload, attachments_json,
        status, summary, report_url, report_format, error_message, created_by, created_at, started_at, finished_at, updated_at
      )
      VALUES
      (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON),
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`,
      [
        taskId,
        authUser.id,
        authUser.tenantId,
        moduleCode,
        moduleCode,
        taskType,
        taskType,
        taskName,
        inputText,
        toJson(inputPayload),
        toJson({}),
        toJson([]),
        'pending',
        'task created',
        null,
        'json',
        null,
        authUser.id,
        now,
        null,
        null,
        now,
      ],
    )
    const insertedId = Number(result.insertId)
    await p.query(
      `INSERT INTO task_logs (task_id, tenant_id, log_level, message, payload_json)
       VALUES (?, ?, 'info', ?, CAST(? AS JSON))`,
      [insertedId, authUser.tenantId, 'task created', toJson({ taskName, taskType })],
    )
    await p.query(
      `INSERT INTO reports (tenant_id, module_code, task_id, report_name, report_format, report_url, summary, created_by)
       VALUES (?, ?, ?, ?, 'json', NULL, ?, ?)`,
      [authUser.tenantId, moduleCode, insertedId, `${taskName} report`, 'report placeholder created', authUser.id],
    )
    return getTask(authUser, insertedId)
  }

  async function getTask(authUser, id) {
    const p = await helpers.ensurePool()
    const [rows] = await p.query('SELECT * FROM tasks WHERE tenant_id = ? AND id = ? LIMIT 1', [authUser.tenantId, Number(id)])
    assertOrThrow(rows.length > 0, { status: 404, code: 40411, message: 'task not found' })
    return mapTaskRow(rows[0], helpers.parseJson)
  }

  async function listTaskLogs(authUser, taskId) {
    await getTask(authUser, taskId)
    const p = await helpers.ensurePool()
    const [rows] = await p.query(
      `SELECT id, task_id, log_level, message, payload_json, created_at
       FROM task_logs
       WHERE tenant_id = ? AND task_id = ?
       ORDER BY created_at ASC`,
      [authUser.tenantId, Number(taskId)],
    )
    return rows.map((row) => ({
      id: Number(row.id),
      taskId: Number(row.task_id),
      logLevel: row.log_level,
      message: row.message,
      payload: helpers.parseJson(row.payload_json, null),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    }))
  }

  async function listMessages(authUser, query) {
    const p = await helpers.ensurePool()
    const { page, pageSize, offset } = normalizePage(query)
    const where = ['tenant_id = ?', '(user_id IS NULL OR user_id = ?)']
    const args = [authUser.tenantId, authUser.id]
    const status = String(query?.status ?? '').trim()
    if (status) {
      where.push('status = ?')
      args.push(status)
    }
    const [countRows] = await p.query(`SELECT COUNT(*) AS c FROM messages WHERE ${where.join(' AND ')}`, args)
    const total = Number(countRows[0]?.c ?? 0)
    const [rows] = await p.query(
      `SELECT * FROM messages WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset],
    )
    return {
      list: rows.map((row) => ({
        id: Number(row.id),
        messageType: row.message_type,
        title: row.title,
        content: row.content,
        status: row.status,
        sourceModule: row.source_module,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
      })),
      pagination: { total, page, pageSize },
    }
  }

  async function markMessagesRead(authUser, messageIds) {
    const ids = (Array.isArray(messageIds) ? messageIds : []).map((id) => Number(id)).filter((id) => Number.isFinite(id))
    if (!ids.length) return { updated: 0 }
    const placeholders = ids.map(() => '?').join(', ')
    const p = await helpers.ensurePool()
    const [result] = await p.query(
      `UPDATE messages
       SET status = 'read', read_at = ?
       WHERE tenant_id = ?
         AND (user_id IS NULL OR user_id = ?)
         AND id IN (${placeholders})`,
      [new Date(), authUser.tenantId, authUser.id, ...ids],
    )
    return { updated: Number(result.affectedRows ?? 0) }
  }

  async function listUsers(authUser, query) {
    const { page, pageSize, offset } = normalizePage(query)
    const tenantId = String(query?.tenantId ?? '').trim()
    const keyword = String(query?.keyword ?? '').trim()
    const status = String(query?.status ?? '').trim()
    const where = []
    const args = []

    if (isPlatformAdmin(authUser)) {
      if (tenantId) {
        where.push('u.tenant_id = ?')
        args.push(tenantId)
      }
    } else {
      where.push('u.tenant_id = ?')
      args.push(authUser.tenantId)
    }

    if (keyword) {
      where.push('(u.username LIKE ? OR u.name LIKE ? OR u.contact LIKE ?)')
      args.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }

    if (status) {
      where.push('u.status = ?')
      args.push(status)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const p = await helpers.ensurePool()
    const [countRows] = await p.query(`SELECT COUNT(*) AS c FROM users u ${whereSql}`, args)
    const total = Number(countRows[0]?.c ?? 0)
    const [rows] = await p.query(
      `SELECT
          u.id,
          u.tenant_id,
          t.tenant_name,
          u.username,
          u.name,
          u.contact,
          u.role,
          u.status,
          u.token_state,
          u.enabled_modules_json,
          COALESCE(JSON_LENGTH(u.enabled_modules_json), 0) AS enabled_module_count,
          u.created_at,
          u.updated_at,
          GROUP_CONCAT(DISTINCT r.role_code ORDER BY r.role_code SEPARATOR ',') AS role_codes
       FROM users u
       LEFT JOIN tenants t ON t.tenant_id = u.tenant_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.tenant_id = u.tenant_id
       LEFT JOIN roles r ON r.id = ur.role_id
       ${whereSql}
       GROUP BY
         u.id, u.tenant_id, t.tenant_name, u.username, u.name, u.contact,
         u.role, u.status, u.token_state, u.enabled_modules_json,
         u.created_at, u.updated_at
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...args, pageSize, offset],
    )
    return {
      list: rows.map((row) => mapUserRow(row, helpers.parseJson)),
      pagination: { total, page, pageSize },
    }
  }

  async function getUser(authUser, userId) {
    const p = await helpers.ensurePool()
    const [rows] = await p.query(
      `SELECT
          u.id,
          u.tenant_id,
          t.tenant_name,
          u.username,
          u.name,
          u.contact,
          u.role,
          u.status,
          u.token_state,
          u.enabled_modules_json,
          COALESCE(JSON_LENGTH(u.enabled_modules_json), 0) AS enabled_module_count,
          u.created_at,
          u.updated_at,
          GROUP_CONCAT(DISTINCT r.role_code ORDER BY r.role_code SEPARATOR ',') AS role_codes
       FROM users u
       LEFT JOIN tenants t ON t.tenant_id = u.tenant_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.tenant_id = u.tenant_id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = ?
       GROUP BY
         u.id, u.tenant_id, t.tenant_name, u.username, u.name, u.contact,
         u.role, u.status, u.token_state, u.enabled_modules_json,
         u.created_at, u.updated_at
       LIMIT 1`,
      [String(userId ?? '').trim()],
    )
    assertOrThrow(rows.length > 0, { status: 404, code: 40432, message: 'user not found' })
    const user = mapUserRow(rows[0], helpers.parseJson)
    assertTenantManager(authUser, user.tenantId, 'no permission to view user')
    return user
  }

  async function createUser(authUser, payload) {
    const tenantId = String(payload?.tenantId ?? authUser.tenantId).trim()
    assertTenantManager(authUser, tenantId, 'no permission to create user')
    const username = String(payload?.username ?? '')
      .trim()
      .toLowerCase()
    const name = String(payload?.name ?? '').trim()
    const contact = String(payload?.contact ?? '')
      .trim()
      .toLowerCase()
    const password = String(payload?.password ?? '').trim()
    const roleCode = String(payload?.roleCode ?? 'customer_member').trim() || 'customer_member'
    const status = normalizeStatus(payload?.status, ['active', 'disabled'], 'active')
    assertOrThrow(username && name && contact && password, {
      status: 400,
      code: 40025,
      message: 'username, name, contact and password are required',
    })
    assertOrThrow(password.length >= 6, { status: 400, code: 40026, message: 'password must be at least 6 characters' })
    if (!isPlatformAdmin(authUser)) {
      assertOrThrow(!roleCode.startsWith('platform_'), {
        status: 403,
        code: 40323,
        message: 'tenant admin cannot create platform roles',
      })
    }

    const p = await helpers.ensurePool()
    const [tenantRows] = await p.query('SELECT tenant_id FROM tenants WHERE tenant_id = ? LIMIT 1', [tenantId])
    assertOrThrow(tenantRows.length > 0, { status: 404, code: 40431, message: 'tenant not found' })

    const [dupRows] = await p.query(
      `SELECT id
       FROM users
       WHERE LOWER(username) = ? OR LOWER(contact) = ?
       LIMIT 1`,
      [username, contact],
    )
    assertOrThrow(dupRows.length === 0, { status: 409, code: 40923, message: 'username or contact already exists' })

    const [roleRows] = await p.query('SELECT id FROM roles WHERE role_code = ? LIMIT 1', [roleCode])
    assertOrThrow(roleRows.length > 0, { status: 404, code: 40433, message: 'role not found' })

    let enabledModules = Array.isArray(payload?.enabledModules)
      ? payload.enabledModules.map((item) => String(item)).filter(Boolean)
      : []
    if (!enabledModules.length) {
      enabledModules = await getTenantModuleCodes(tenantId)
    }

    const user = securityService.createStoredUser({
      id: `u-${randomBytes(4).toString('hex')}`,
      username,
      tenantId,
      name,
      contact,
      password,
      enabledModules,
      role: toRoleValue(roleCode),
      status,
    })

    await p.query(
      `INSERT INTO users (id, tenant_id, username, name, contact, password_salt, password_hash, password_algo, enabled_modules_json, role, status, token_state, token_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, 'active', 0)`,
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
        user.status,
      ],
    )
    await attachUserRole({ userId: user.id, tenantId, roleCode })
    return getUser(authUser, user.id)
  }

  async function listReports(authUser, query) {
    const p = await helpers.ensurePool()
    const { page, pageSize, offset } = normalizePage(query)
    const where = ['tenant_id = ?']
    const args = [authUser.tenantId]
    const moduleCode = String(query?.moduleCode ?? '').trim()
    if (moduleCode) {
      where.push('module_code = ?')
      args.push(moduleCode)
    }

    const [countRows] = await p.query(`SELECT COUNT(*) AS c FROM reports WHERE ${where.join(' AND ')}`, args)
    const total = Number(countRows[0]?.c ?? 0)
    const [rows] = await p.query(
      `SELECT * FROM reports WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, offset],
    )
    return {
      list: rows.map((row) => ({
        id: Number(row.id),
        moduleCode: row.module_code,
        taskId: row.task_id == null ? null : Number(row.task_id),
        reportName: row.report_name,
        reportFormat: row.report_format,
        reportUrl: row.report_url,
        summary: row.summary,
        createdBy: row.created_by,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      })),
      pagination: { total, page, pageSize },
    }
  }

  async function getReport(authUser, reportId) {
    const p = await helpers.ensurePool()
    const [rows] = await p.query('SELECT * FROM reports WHERE tenant_id = ? AND id = ? LIMIT 1', [authUser.tenantId, Number(reportId)])
    assertOrThrow(rows.length > 0, { status: 404, code: 40421, message: 'report not found' })
    const row = rows[0]
    return {
      id: Number(row.id),
      moduleCode: row.module_code,
      taskId: row.task_id == null ? null : Number(row.task_id),
      reportName: row.report_name,
      reportFormat: row.report_format,
      reportUrl: row.report_url,
      summary: row.summary,
      createdBy: row.created_by,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    }
  }

  async function listPackages() {
    const p = await helpers.ensurePool()
    const [rows] = await p.query(
      `SELECT
          pp.id,
          pp.package_code,
          pp.package_name,
          pp.package_type,
          pp.price_monthly,
          pp.price_yearly,
          pp.status,
          pp.description,
          pp.created_at,
          pp.updated_at,
          GROUP_CONCAT(DISTINCT pm.module_code ORDER BY pm.module_code SEPARATOR ',') AS module_codes,
          COUNT(DISTINCT CASE WHEN tp.status = 'active' THEN tp.tenant_id END) AS tenant_count
       FROM package_plans pp
       LEFT JOIN package_modules pm ON pm.package_id = pp.id
       LEFT JOIN tenant_packages tp ON tp.package_id = pp.id
       GROUP BY
         pp.id, pp.package_code, pp.package_name, pp.package_type,
         pp.price_monthly, pp.price_yearly, pp.status, pp.description,
         pp.created_at, pp.updated_at
       ORDER BY pp.id ASC`,
    )
    return rows.map(mapPackageRow)
  }

  async function getPackage(authUser, packageId) {
    const p = await helpers.ensurePool()
    const [rows] = await p.query(
      `SELECT
          pp.id,
          pp.package_code,
          pp.package_name,
          pp.package_type,
          pp.price_monthly,
          pp.price_yearly,
          pp.status,
          pp.description,
          pp.created_at,
          pp.updated_at,
          GROUP_CONCAT(DISTINCT pm.module_code ORDER BY pm.module_code SEPARATOR ',') AS module_codes,
          COUNT(DISTINCT CASE WHEN tp.status = 'active' THEN tp.tenant_id END) AS tenant_count
       FROM package_plans pp
       LEFT JOIN package_modules pm ON pm.package_id = pp.id
       LEFT JOIN tenant_packages tp ON tp.package_id = pp.id
       WHERE pp.id = ?
       GROUP BY
         pp.id, pp.package_code, pp.package_name, pp.package_type,
         pp.price_monthly, pp.price_yearly, pp.status, pp.description,
         pp.created_at, pp.updated_at
       LIMIT 1`,
      [Number(packageId)],
    )
    assertOrThrow(rows.length > 0, { status: 404, code: 40441, message: 'package not found' })
    const pkg = mapPackageRow(rows[0])
    const [moduleRows] = await p.query(
      `SELECT m.module_code, m.module_name, m.module_type, m.status
       FROM package_modules pm
       JOIN modules m ON m.module_code = pm.module_code
       WHERE pm.package_id = ?
       ORDER BY m.sort ASC, m.module_code ASC`,
      [Number(packageId)],
    )
    return {
      ...pkg,
      modules: moduleRows.map((row) => ({
        moduleCode: row.module_code,
        moduleName: row.module_name,
        moduleType: row.module_type,
        status: row.status,
      })),
    }
  }

  async function createPackage(authUser, payload) {
    assertPlatformAdmin(authUser, 'no permission to create package')
    const packageCode = String(payload?.packageCode ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
    const packageName = String(payload?.packageName ?? '').trim()
    const packageType = String(payload?.packageType ?? 'standard').trim() || 'standard'
    const description = String(payload?.description ?? '').trim()
    const status = normalizeStatus(payload?.status, ['active', 'draft', 'disabled'], 'active')
    const priceMonthly = Number(payload?.priceMonthly ?? 0)
    const priceYearly = Number(payload?.priceYearly ?? 0)
    const moduleCodes = Array.isArray(payload?.moduleCodes)
      ? [...new Set(payload.moduleCodes.map((item) => String(item).trim()).filter(Boolean))]
      : []
    assertOrThrow(packageCode && packageName, {
      status: 400,
      code: 40027,
      message: 'packageCode and packageName are required',
    })
    assertOrThrow(moduleCodes.length > 0, { status: 400, code: 40028, message: 'moduleCodes cannot be empty' })

    const p = await helpers.ensurePool()
    const [dupRows] = await p.query('SELECT id FROM package_plans WHERE package_code = ? LIMIT 1', [packageCode])
    assertOrThrow(dupRows.length === 0, { status: 409, code: 40924, message: 'packageCode already exists' })

    const placeholders = moduleCodes.map(() => '?').join(', ')
    const [moduleRows] = await p.query(
      `SELECT module_code
       FROM modules
       WHERE module_code IN (${placeholders})`,
      moduleCodes,
    )
    assertOrThrow(moduleRows.length === moduleCodes.length, {
      status: 400,
      code: 40029,
      message: 'moduleCodes contains unknown module',
    })

    const [result] = await p.query(
      `INSERT INTO package_plans (package_code, package_name, package_type, price_monthly, price_yearly, status, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [packageCode, packageName, packageType, priceMonthly, priceYearly, status, description || null],
    )
    const insertedPackageId = Number(result.insertId)
    for (const moduleCode of moduleCodes) {
      await p.query(
        `INSERT INTO package_modules (package_id, module_code)
         VALUES (?, ?)`,
        [insertedPackageId, moduleCode],
      )
    }
    return getPackage(authUser, insertedPackageId)
  }

  async function assignTenantPackage(authUser, tenantId, payload) {
    assertPlatformAdmin(authUser, 'no permission to assign tenant package')
    const safeTenantId = String(tenantId ?? '').trim()
    const packageId = Number(payload?.packageId ?? 0)
    assertOrThrow(packageId > 0, { status: 400, code: 40030, message: 'packageId is required' })

    const p = await helpers.ensurePool()
    const [tenantRows] = await p.query('SELECT tenant_id FROM tenants WHERE tenant_id = ? LIMIT 1', [safeTenantId])
    assertOrThrow(tenantRows.length > 0, { status: 404, code: 40431, message: 'tenant not found' })

    const [packageRows] = await p.query('SELECT id FROM package_plans WHERE id = ? LIMIT 1', [packageId])
    assertOrThrow(packageRows.length > 0, { status: 404, code: 40441, message: 'package not found' })

    await syncTenantPackageState({
      tenantId: safeTenantId,
      packageId,
      status: normalizeStatus(payload?.status, ['active', 'paused', 'expired'], 'active'),
      startedAt: toDateOrNull(payload?.startedAt, () => ({ status: 400, code: 40031, message: 'startedAt is invalid' })) ?? new Date(),
      expiredAt: toDateOrNull(payload?.expiredAt, () => ({ status: 400, code: 40032, message: 'expiredAt is invalid' })),
      createdBy: authUser.id,
    })

    return getTenant(authUser, safeTenantId)
  }

  async function getSettings(authUser) {
    const p = await helpers.ensurePool()
    const [rows] = await p.query(
      `SELECT id, config_key, config_value_json, description, updated_by, created_at, updated_at
       FROM system_configs
       WHERE tenant_id = ?
       ORDER BY config_key ASC`,
      [authUser.tenantId],
    )
    return rows.map((row) => ({
      id: Number(row.id),
      configKey: row.config_key,
      configValue: helpers.parseJson(row.config_value_json, null),
      description: row.description,
      updatedBy: row.updated_by,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    }))
  }

  async function updateSettings(authUser, payload) {
    assertOrThrow(!isReadOnlyUser(authUser), { status: 403, code: 40313, message: 'read only user cannot update settings' })
    const settings = Array.isArray(payload?.settings) ? payload.settings : []
    assertOrThrow(settings.length > 0, { status: 400, code: 40003, message: 'settings cannot be empty' })
    const p = await helpers.ensurePool()
    for (const item of settings) {
      const key = String(item?.configKey ?? '').trim()
      assertOrThrow(key, { status: 400, code: 40004, message: 'configKey is required' })
      await p.query(
        `INSERT INTO system_configs (tenant_id, config_key, config_value_json, description, updated_by)
         VALUES (?, ?, CAST(? AS JSON), ?, ?)
         ON DUPLICATE KEY UPDATE
           config_value_json = VALUES(config_value_json),
           description = VALUES(description),
           updated_by = VALUES(updated_by)`,
        [authUser.tenantId, key, toJson(item.configValue), item.description ?? null, authUser.id],
      )
    }
    return getSettings(authUser)
  }

  async function getDashboard(authUser) {
    const p = await helpers.ensurePool()
    const [[todayTaskRow]] = await p.query(
      `SELECT COUNT(*) AS c FROM tasks WHERE tenant_id = ? AND DATE(created_at) = CURRENT_DATE()`,
      [authUser.tenantId],
    )
    const [[runningTaskRow]] = await p.query(
      `SELECT COUNT(*) AS c FROM tasks WHERE tenant_id = ? AND status IN ('running', 'pending', 'queued')`,
      [authUser.tenantId],
    )
    const [[failedTaskRow]] = await p.query(
      `SELECT COUNT(*) AS c FROM tasks WHERE tenant_id = ? AND status = 'failed'`,
      [authUser.tenantId],
    )
    const [[moduleRow]] = await p.query(
      `SELECT COUNT(*) AS c FROM tenant_modules WHERE tenant_id = ? AND status = 'enabled'`,
      [authUser.tenantId],
    )
    const [messageRows] = await p.query(
      `SELECT id, title, message_type, status, created_at
       FROM messages
       WHERE tenant_id = ? AND (user_id IS NULL OR user_id = ?)
       ORDER BY created_at DESC LIMIT 5`,
      [authUser.tenantId, authUser.id],
    )
    const [reportRows] = await p.query(
      `SELECT id, report_name, module_code, report_format, created_at
       FROM reports
       WHERE tenant_id = ?
       ORDER BY created_at DESC LIMIT 5`,
      [authUser.tenantId],
    )
    return {
      todayTaskCount: Number(todayTaskRow.c ?? 0),
      runningTaskCount: Number(runningTaskRow.c ?? 0),
      failedTaskCount: Number(failedTaskRow.c ?? 0),
      openedModuleCount: Number(moduleRow.c ?? 0),
      recentMessages: messageRows.map((row) => ({
        id: Number(row.id),
        title: row.title,
        messageType: row.message_type,
        status: row.status,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      })),
      recentReports: reportRows.map((row) => ({
        id: Number(row.id),
        reportName: row.report_name,
        moduleCode: row.module_code,
        reportFormat: row.report_format,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      })),
    }
  }

  async function getTenantModuleCodes(tenantId) {
    const p = await helpers.ensurePool()
    const [rows] = await p.query(
      `SELECT module_code
       FROM tenant_modules
       WHERE tenant_id = ? AND status = 'enabled'
       ORDER BY module_code ASC`,
      [tenantId],
    )
    return rows.map((row) => row.module_code)
  }

  function toHttpError(error) {
    if (error instanceof AppError) return error
    return new AppError({ status: 500, code: 50001, message: 'internal server error' })
  }

  return {
    login,
    buildProfile,
    logout,
    listMenus,
    listRoles,
    listPermissions,
    listModules,
    getModule,
    openModule,
    listTenants,
    getTenant,
    createTenant,
    listTasks,
    createTask,
    getTask,
    listTaskLogs,
    listMessages,
    markMessagesRead,
    listUsers,
    getUser,
    createUser,
    listReports,
    getReport,
    listPackages,
    getPackage,
    createPackage,
    assignTenantPackage,
    getSettings,
    updateSettings,
    getDashboard,
    toHttpError,
  }
}
