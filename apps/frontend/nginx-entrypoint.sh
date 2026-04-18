#!/bin/sh
# 容器启动时动态注入 API_BASE_URL 环境变量到前端页面
if [ -n "$API_BASE_URL" ]; then
  CONFIG_FILE="/usr/share/nginx/html/config.js"
  echo "window.__API_BASE_URL__ = '$API_BASE_URL';" > "$CONFIG_FILE"

  # 在 index.html 的 </head> 前插入 config.js 引用
  INDEX_FILE="/usr/share/nginx/html/index.html"
  if [ -f "$INDEX_FILE" ] && ! grep -q "config.js" "$INDEX_FILE"; then
    sed -i 's|</head>|<script src="/config.js"></script></head>|' "$INDEX_FILE"
  fi

  echo "Runtime config injected: $API_BASE_URL"
fi
