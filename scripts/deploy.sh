#!/bin/bash

# SparkNoteAI 部署脚本

echo "🚀 部署 SparkNoteAI..."

# 构建后端镜像
echo "📦 构建后端镜像..."
docker-compose build backend

# 构建前端
echo "📦 构建前端..."
cd apps/frontend
npx expo export --platform web
cd ../..

# 启动所有服务
echo "🚀 启动服务..."
docker-compose up -d

echo "✅ 部署完成！"
echo ""
echo "🌐 服务地址："
echo "  后端 API:  http://localhost:8000"
echo "  前端:      http://localhost:19000"
