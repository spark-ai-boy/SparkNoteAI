#!/bin/bash

# SparkNoteAI 开发环境启动脚本

echo "🚀 启动 SparkNoteAI 开发环境..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 启动数据库服务
echo "📦 启动数据库服务..."
docker-compose up -d db redis neo4j

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
sleep 5

# 检查后端依赖
if [ ! -d "apps/backend/.venv" ]; then
    echo "📦 安装后端依赖..."
    cd apps/backend
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cd ../..
fi

# 检查前端依赖
if [ ! -d "apps/frontend/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd apps/frontend
    npm install
    cd ../..
fi

# 检查共享包依赖
if [ ! -d "packages/shared/node_modules" ]; then
    echo "📦 安装共享包依赖..."
    cd packages/shared
    npm install
    npm run build
    cd ../..
fi

echo "✅ 开发环境准备完成！"
echo ""
echo "📝 启动命令："
echo "  后端:  npm run dev:backend"
echo "  前端:  npm run dev:frontend"
echo "  全部:  npm run dev"
echo ""
echo "🌐 服务地址："
echo "  后端 API:  http://localhost:8000"
echo "  API 文档:  http://localhost:8000/docs"
echo "  前端:      http://localhost:19000"
echo "  Neo4j:     http://localhost:7474"
