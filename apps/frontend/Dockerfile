# SparkNoteAI 前端生产环境 Dockerfile
# 多阶段构建：构建 Expo Web 应用 + Nginx 托管

# ==================== 构建阶段 ====================
FROM node:20-alpine AS builder

# 构建参数 - 版本号（可通过 --build-arg 传入）
ARG APP_VERSION=dev
ARG BUILD_NUMBER=unknown

# 设置版本环境变量
ENV APP_VERSION=${APP_VERSION} \
    BUILD_NUMBER=${BUILD_NUMBER}

WORKDIR /app

# 复制根目录 package 文件
COPY package*.json ./

# 复制 shared 包
COPY packages/shared ./packages/shared

# 复制 frontend package 文件
COPY apps/frontend/package*.json ./apps/frontend/

# 安装依赖
RUN npm install

# 复制 frontend 源代码
COPY apps/frontend ./apps/frontend

WORKDIR /app/apps/frontend

# 注入版本号（由 --build-arg APP_VERSION 传入）
RUN set -a && \
    echo "EXPO_PUBLIC_APP_VERSION=$APP_VERSION" > .env && \
    echo "BUILD_NUMBER=$BUILD_NUMBER" >> .env && \
    set +a && \
    cat .env

# 构建 Web 应用（Expo 会自动加载 .env 文件中的 EXPO_PUBLIC_* 变量）
RUN npx expo export --platform web

# ==================== 生产阶段 ====================
FROM nginx:alpine

# 构建参数 - 版本号
ARG APP_VERSION=dev
ARG BUILD_NUMBER=unknown

# 设置版本标签
LABEL version="${APP_VERSION}" \
      build="${BUILD_NUMBER}" \
      app.name="SparkNoteAI Frontend"

# 复制构建产物到 Nginx
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# 复制运行时配置脚本
COPY apps/frontend/nginx-entrypoint.sh /docker-entrypoint.d/99-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/99-runtime-config.sh

# Nginx 配置 - 支持 API 反向代理
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
