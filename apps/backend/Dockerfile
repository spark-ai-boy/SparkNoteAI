# SparkNoteAI 后端生产环境 Dockerfile
# 基于 Python 3.11 + Uvicorn (带工作进程)

FROM python:3.11-slim

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# 构建参数 - 版本号（可通过 --build-arg 传入）
ARG APP_VERSION=dev
ARG BUILD_NUMBER=unknown

# 设置版本环境变量
ENV APP_VERSION=${APP_VERSION} \
    BUILD_NUMBER=${BUILD_NUMBER}

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl git \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建上传和静态文件目录
RUN mkdir -p /app/data/uploads/images && \
    chmod -R 755 /app/data/uploads

# 暴露端口
EXPOSE 8000

# 添加版本标签
LABEL version="${APP_VERSION}" \
      build="${BUILD_NUMBER}" \
      app.name="SparkNoteAI"

# 使用 Uvicorn 工作进程启动（生产环境推荐）
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
