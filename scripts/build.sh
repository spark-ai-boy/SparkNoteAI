#!/bin/bash

# SparkNoteAI Docker 镜像构建与推送脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_DIR="$PROJECT_DIR/docker"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 获取版本号（优先环境变量，其次 Git tag）
get_version() {
    if [ -n "$APP_VERSION" ]; then
        echo "$APP_VERSION"
    else
        local tag=$(git describe --tags --abbrev=0 2>/dev/null || true)
        if [ -n "$tag" ]; then
            echo "${tag#v}"
        else
            echo "dev-$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
        fi
    fi
}

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
}

# 构建镜像
build_images() {
    local version="${1:-latest}"
    log_info "构建后端镜像 sparknoteai/backend:$version"
    docker build --build-arg APP_VERSION="$version" \
        -t "sparknoteai/backend:$version" "$PROJECT_DIR/apps/backend/"

    log_info "构建前端镜像 sparknoteai/frontend:$version"
    docker build -f "$PROJECT_DIR/apps/frontend/Dockerfile" \
        --build-arg APP_VERSION="$version" \
        -t "sparknoteai/frontend:$version" "$PROJECT_DIR"

    log_info "镜像构建完成"
}

# 推送镜像
push_images() {
    local version="${1:-latest}"
    log_info "推送 sparknoteai/backend:$version"
    docker push "sparknoteai/backend:$version"

    log_info "推送 sparknoteai/frontend:$version"
    docker push "sparknoteai/frontend:$version"

    log_info "镜像推送完成"
}

# 登录 Docker Hub
login() {
    log_info "登录 Docker Hub..."
    docker login
}

# 显示帮助
show_help() {
    cat << EOF
SparkNoteAI 镜像构建与推送脚本

用法：$0 <命令> [版本]

命令:
    build [版本]     构建前后端镜像
    push [版本]      推送前后端镜像到 Docker Hub
    deploy [版本]    构建 + 推送 + 重启生产服务
    login            登录 Docker Hub
    help             显示此帮助

示例:
    $0 build 1.1.0         # 构建 v1.1.0 版本
    $0 push 1.1.0          # 推送 v1.1.0 版本
    $0 deploy 1.1.0        # 构建、推送、部署 v1.1.0
    $0 build               # 构建 latest 版本
EOF
}

# 重启生产服务
restart_services() {
    local version="${1:-latest}"
    log_info "重启生产服务..."
    cd "$PROJECT_DIR"
    APP_VERSION="$version" docker-compose -f "$DOCKER_DIR/docker-compose.prod.yml" up -d
    log_info "生产服务已重启"
}

# 主函数
main() {
    check_docker
    local version
    version=$(get_version)

    case "$1" in
        build)
            build_images "${2:-$version}"
            ;;
        push)
            push_images "${2:-$version}"
            ;;
        deploy)
            build_images "${2:-$version}"
            push_images "${2:-$version}"
            restart_services "${2:-$version}"
            ;;
        login)
            login
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

main "$@"
