# 小龙虾统一网页后台 - 后端 (NestJS + Prisma)

## 1. 项目概况
本项目是根据“小龙虾统一网页后台技术文档（15 模块预留版）”搭建的后端框架。采用 NestJS 框架，使用 Prisma ORM，预留了 15 个业务模块的扩展位，并实现了核心的公共能力。

## 2. 已完成功能
- **总体架构**: 采用 NestJS 模块化分层，代码结构清晰，易于垂直扩展。
- **数据库设计**: 使用 Prisma 定义了包括租户、用户、角色、权限、模块、任务、消息、报表等在内的核心表结构。
- **认证与鉴权**: 实现了基于 JWT 的登录、访问控制（AuthModule, UserModule）。
- **模块管理**: 实现了预留的 15 个模块的查询与租户关联管理（ModuleManageModule）。
- **任务中心**: 实现了任务的创建、查询、日志记录等基础功能（TaskModule）。
- **消息中心**: 实现了系统消息、模块消息的查询与已读管理（MessageModule）。
- **系统设置**: 实现了全局与租户级别的配置管理（SettingsModule）。
- **报表中心**: 预留了报表查询接口（ReportModule）。

## 3. 技术栈
- **Framework**: NestJS
- **ORM**: Prisma (Support for MySQL)
- **Auth**: Passport.js + JWT + Bcrypt
- **Language**: TypeScript

## 4. 快速开始

### 4.1 安装依赖
```bash
cd crayfish-server
npm install
```

### 4.2 配置数据库
编辑 `.env` 文件，确保 `DATABASE_URL` 正确连接到你的 MySQL 数据库。

### 4.3 数据库迁移与初始化
```bash
# 生成 Prisma Client
npx prisma generate

# 推送表结构到数据库 (或使用 npx prisma migrate dev)
npx prisma db push

# 运行种子数据 (初始化 15 个模块和 admin 用户)
npx prisma db seed
```

### 4.4 启动服务
```bash
npm run start:dev
```

## 5. 接口规范
统一前缀: `/api/v1` (建议在 main.ts 中配置)
- `POST /auth/login` - 登录
- `GET /auth/profile` - 获取当前用户信息
- `GET /modules` - 获取所有模块
- `GET /tasks` - 获取任务列表
- `GET /messages` - 获取消息列表

## 6. 后续开发建议
- **文件服务**: 实现 `FileModule` 对接 OSS。
- **外部对接**: 在 `IntegrationModule` 中实现 OpenClaw 或其他第三方 API 的对接。
- **角色权限**: 在 `RoleModule` 中完善 RBAC 的详细权限控制逻辑。
