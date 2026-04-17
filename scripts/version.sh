#!/bin/bash

# SparkNoteAI 版本号管理脚本
# 单一事实来源：Git Tag（格式 v1.2.0）
# package.json 和 app.json 仅用于构建/发布工具读取，由脚本按需同步

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
PACKAGE_JSON="$ROOT_DIR/package.json"
APP_JSON="$ROOT_DIR/apps/frontend/app.json"

# 去除首尾空白
trim() {
    local var="$1"
    var="${var#"${var%%[![:space:]]*}"}"
    var="${var%"${var##*[![:space:]]}"}"
    echo "$var"
}

# 从 git tag 提取版本号（去掉 v 前缀）
get_version_from_tag() {
    local tag
    tag=$(git describe --tags --abbrev=0 2>/dev/null || true)
    if [ -n "$tag" ]; then
        echo "${tag#v}"
        return
    fi
    # 无 tag 时返回 dev + 短 hash
    echo "dev-$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
}

# 获取当前版本
get_version() {
    # 1. 环境变量优先（CI/Docker 构建注入）
    if [ -n "$APP_VERSION" ]; then
        echo "$(trim "$APP_VERSION")"
        return
    fi

    # 2. Git tag（单一事实来源）
    get_version_from_tag
}

# 设置新版本：更新 package.json + app.json + 创建 git tag
set_version() {
    local new_version=$1

    if [ -z "$new_version" ]; then
        echo "错误：请提供版本号"
        echo "用法：$0 set <版本号>"
        echo "示例：$0 set 1.2.0"
        exit 1
    fi

    # 验证版本号格式（语义化版本）
    if ! [[ "$new_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
        echo "错误：无效的版本号格式"
        echo "请使用语义化版本格式：MAJOR.MINOR.PATCH"
        echo "示例：1.2.0, 1.2.0-beta.1"
        exit 1
    fi

    # 1. 同步到 package.json（使用 Node.js，保证 JSON 格式正确）
    if [ -f "$PACKAGE_JSON" ]; then
        node -e "
            const fs = require('fs');
            const p = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf8'));
            p.version = '$new_version';
            fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(p, null, 2) + '\n');
        "
        echo "package.json → $new_version"
    fi

    # 2. 同步到 app.json（Expo 配置）
    if [ -f "$APP_JSON" ]; then
        node -e "
            const fs = require('fs');
            const p = JSON.parse(fs.readFileSync('$APP_JSON', 'utf8'));
            p.expo.version = '$new_version';
            fs.writeFileSync('$APP_JSON', JSON.stringify(p, null, 2) + '\n');
        "
        echo "app.json → $new_version"
    fi

    echo ""
    echo "所有文件已同步为：$new_version"
    echo ""
    echo "请提交并打 tag："
    echo "  git add package.json apps/frontend/app.json"
    echo "  git commit -m 'chore: 准备发布 v$new_version'"
    echo "  git tag -a v$new_version -m 'Release v$new_version'"
    echo "  git push origin v$new_version"
}

# 获取构建号（Git commit hash）
get_build_number() {
    git rev-parse --short HEAD 2>/dev/null || echo "unknown"
}

# 显示版本信息
show_info() {
    local version=$(get_version)
    local build=$(get_build_number)
    local branch=$(git branch --show-current 2>/dev/null || echo 'unknown')
    local last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo 'none')
    local last_commit=$(git log -1 --format=%ci 2>/dev/null || echo 'unknown')

    echo "SparkNoteAI 版本信息"
    echo "===================="
    echo "版本号：    $version"
    echo "构建号：    $build"
    echo "Git 分支：  $branch"
    echo "最新 Tag：  $last_tag"
    echo "最后提交：  $last_commit"
    echo ""

    if [ -f "$PACKAGE_JSON" ]; then
        local pkg_ver=$(node -e "console.log(require('$PACKAGE_JSON').version)")
        echo "  package.json:   $pkg_ver"
    fi

    if [ -f "$APP_JSON" ]; then
        local app_ver=$(node -e "console.log(require('$APP_JSON').expo.version)")
        echo "  app.json:       $app_ver"
    fi
}

# 主函数
main() {
    case "$1" in
        get)
            get_version
            ;;
        set)
            set_version "$2"
            ;;
        build)
            get_build_number
            ;;
        info)
            show_info
            ;;
        *)
            echo "SparkNoteAI 版本号管理脚本"
            echo ""
            echo "用法：$0 <命令> [参数]"
            echo ""
            echo "命令:"
            echo "  get              获取当前版本号（来自 Git tag）"
            echo "  set <版本>       设置新版本号（同步到 package.json + app.json）"
            echo "  build            获取构建号（Git commit hash）"
            echo "  info             显示完整版本信息"
            echo ""
            echo "示例:"
            echo "  $0 get           # 从 Git tag 获取版本号"
            echo "  $0 set 1.2.0     # 同步到 package.json + app.json"
            echo "  $0 info          # 显示版本信息"
            echo ""
            echo "环境变量:"
            echo "  APP_VERSION      覆盖 Git tag 的版本号"
            ;;
    esac
}

main "$@"
