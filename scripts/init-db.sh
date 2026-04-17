#!/bin/bash

# 数据库初始化脚本

echo "🗄️ 初始化数据库..."

# 等待 PostgreSQL 就绪
until docker-compose exec -T db pg_isready -U sparknoteai; do
    echo "⏳ 等待 PostgreSQL 就绪..."
    sleep 2
done

# 运行数据库迁移
echo "📦 运行数据库迁移..."
cd apps/backend
source .venv/bin/activate
alembic upgrade head
cd ../..

echo "✅ 数据库初始化完成！"
