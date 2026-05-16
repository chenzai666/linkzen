<div align="center">
  <h1>LinkZen</h1>
  <p>精简版短链接与 DNS 子域名管理平台，SQLite 数据库，自托管部署，开箱即用。</p>
  <p>
    基于 <a href="https://github.com/oiov/wr.do">oiov/wr.do</a> 精简 Fork
  </p>
  <img alt="Build" src="https://img.shields.io/github/actions/workflow/status/chenzai666/linkzen/docker-build-push.yml?label=build&labelColor=black&logo=githubactions&logoColor=white&style=flat-square">
  <img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/bats666/linkzen?labelColor=black&style=flat-square">
  <img src="https://img.shields.io/github/license/oiov/wr.do?style=flat-square" alt="MIT"/>
</div>

## 与原版的区别

| 功能 | 原版 | LinkZen |
|------|------|---------|
| 短链接管理 | ✅ | ✅ |
| DNS 子域名管理 | ✅ | ✅ |
| 管理员面板 | ✅ | ✅ |
| 数据库 | PostgreSQL | **SQLite**（无需额外容器）|
| 登录方式 | OAuth + 密码 + 邮件验证 | **仅用户名+密码** |
| 用户注册 | ✅ | ✅（可在系统配置中开关）|
| 邮件服务 | ✅ | ❌ |
| 云存储（S3/R2） | ✅ | ❌ |
| 爬取/截图 API | ✅ | ❌ |
| 聊天功能 | ✅ | ❌ |
| 套餐/计划系统 | ✅ | ❌ |

## 功能

### 🔗 短链接管理
- 自定义短链、密码保护、过期时间
- 访问统计（实时日志、地图、多维度数据分析）
- 二维码生成
- API 调用支持

### 🌐 DNS 子域名管理
- 管理 Cloudflare 账户下多域名的 DNS 记录
- 支持 CNAME、A、TXT 等多种记录类型
- 支持申请审批模式

### 👑 管理员面板
- 用户管理（创建、编辑、删除）
- 域名配置
- 系统配置（开关用户注册等）
- 短链 / DNS 记录总览

## 技术栈

- **Next.js 14** + React + TypeScript
- **Prisma ORM** + **SQLite**（无需额外数据库服务）
- Tailwind CSS
- NextAuth.js（Credentials 模式）
- Cloudflare API（DNS 功能）

## Docker 快速部署

### 1. 创建 docker-compose.yml

```yaml
services:
  app:
    image: bats666/linkzen:latest
    container_name: linkzen
    ports:
      - "13000:13000"
    environment:
      NODE_ENV: production
      DATABASE_URL: file:/app/data/db.sqlite
      AUTH_URL: "http://your-domain:13000"             # 必填，改为实际访问地址
      NEXT_PUBLIC_APP_URL: "http://your-domain:13000"  # 必填，改为实际访问地址
      NEXT_PUBLIC_APP_NAME: "LinkZen"
      PORT: 13000
    volumes:
      - linkzen_data:/app/data
    restart: unless-stopped

volumes:
  linkzen_data:
    driver: local
```

### 2. 启动服务

```bash
docker compose up -d
```

### 3. 初始化管理员

服务启动后直接访问 `http://your-domain:13000`，**第一个注册的账号自动成为管理员**。

---

## 本地开发

```bash
git clone https://github.com/chenzai666/linkzen
cd linkzen
pnpm install
cp .env.example .env
# 编辑 .env 填入必要变量
pnpm db:push
pnpm dev
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | SQLite 路径，如 `file:/app/data/db.sqlite` |
| `AUTH_URL` | ✅ | 服务访问地址（含协议和端口） |
| `NEXT_PUBLIC_APP_URL` | ✅ | 同上，用于前端 |
| `AUTH_SECRET` | ❌ | JWT 密钥，不填则自动生成并持久化到数据卷 |
| `NEXT_PUBLIC_APP_NAME` | ❌ | 站点名称，默认 `LinkZen` |
| `PORT` | ❌ | 服务端口，默认 `3000` |

DNS 功能还需在管理员面板中配置 Cloudflare API Key。

## 开源协议

[MIT](/LICENSE.md) · 基于 [oiov/wr.do](https://github.com/oiov/wr.do)
