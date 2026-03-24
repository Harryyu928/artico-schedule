#!/bin/bash

# ARTiCO 教务系统维护脚本
# 使用方法: ./scripts/maintenance.sh [命令]
# 
# 这是一个简单的工具，帮助你检查和维护系统。
# 不懂技术也能用！
#
# 常用命令：
#   status   - 检查系统是否正常
#   logs     - 查看系统日志
#   restart  - 重启系统
#   help     - 显示帮助信息

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
  echo -e "${RED}[✗]${NC} $1"
}

log_tip() {
  echo -e "${BLUE}[💡]${NC} $1"
}

# 检查服务状态
check_status() {
  log_info "检查服务状态..."
  
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 | grep -q "200"; then
    log_info "服务运行正常 ✅"
  else
    log_error "服务异常 ❌"
    return 1
  fi
}

# 查看日志
view_logs() {
  local log_type=$1
  local lines=${2:-50}
  
  case $log_type in
    app)
      log_info "应用日志 (最近 $lines 行):"
      tail -n $lines /app/work/logs/bypass/app.log 2>/dev/null || log_warn "日志文件不存在"
      ;;
    console)
      log_info "控制台日志 (最近 $lines 行):"
      tail -n $lines /app/work/logs/bypass/console.log 2>/dev/null || log_warn "日志文件不存在"
      ;;
    error)
      log_info "错误日志:"
      grep -iE "error|exception|warn" /app/work/logs/bypass/app.log 2>/dev/null | tail -n $lines || log_info "无错误日志"
      ;;
    *)
      log_info "所有日志 (最近 $lines 行):"
      tail -n $lines /app/work/logs/bypass/*.log 2>/dev/null || log_warn "日志文件不存在"
      ;;
  esac
}

# 重启服务
restart_service() {
  log_info "重启服务..."
  
  # 查找并停止现有进程
  local pid=$(ss -lptn 'sport = :5000' 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1)
  
  if [ -n "$pid" ]; then
    log_info "停止进程 $pid..."
    kill $pid 2>/dev/null || true
    sleep 2
  fi
  
  # 启动服务
  log_info "启动服务..."
  cd /workspace/projects
  coze dev > /app/work/logs/bypass/dev.log 2>&1 &
  
  sleep 5
  
  if check_status; then
    log_info "服务重启成功 ✅"
  else
    log_error "服务重启失败 ❌"
    return 1
  fi
}

# 清理缓存
clear_cache() {
  log_info "清理缓存..."
  
  cd /workspace/projects
  
  if [ -d ".next" ]; then
    rm -rf .next
    log_info "已删除 .next 目录"
  fi
  
  if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    log_info "已删除 node_modules/.cache 目录"
  fi
  
  log_info "缓存清理完成 ✅"
}

# 数据库健康检查
db_health() {
  log_info "数据库健康检查..."
  
  # 这里可以添加数据库连接检查
  # 由于使用 Supabase，主要通过 API 检查
  
  if curl -s http://localhost:5000/api/dashboard > /dev/null; then
    log_info "数据库连接正常 ✅"
  else
    log_error "数据库连接异常 ❌"
  fi
}

# 查看系统信息
system_info() {
  log_info "系统信息:"
  echo ""
  echo "项目路径: ${COZE_WORKSPACE_PATH:-/workspace/projects}"
  echo "运行端口: ${DEPLOY_RUN_PORT:-5000}"
  echo "项目域名: ${COZE_PROJECT_DOMAIN_DEFAULT:-未设置}"
  echo "环境模式: ${COZE_PROJECT_ENV:-DEV}"
  echo ""
  
  log_info "进程信息:"
  ss -lptn 'sport = :5000' 2>/dev/null || echo "无进程监听 5000 端口"
  echo ""
  
  log_info "磁盘使用:"
  df -h /workspace 2>/dev/null || df -h .
  echo ""
  
  log_info "内存使用:"
  free -h 2>/dev/null || echo "无法获取内存信息"
}

# 备份数据
backup_data() {
  local backup_dir=${1:-"/tmp/artico_backup_$(date +%Y%m%d_%H%M%S)"}
  
  log_info "备份数据到 $backup_dir..."
  
  mkdir -p $backup_dir
  
  # 备份配置文件
  if [ -f ".env" ]; then
    cp .env $backup_dir/
    log_info "已备份 .env"
  fi
  
  # 备份 schema
  if [ -f "src/db/schema.ts" ]; then
    cp src/db/schema.ts $backup_dir/
    log_info "已备份 schema.ts"
  fi
  
  # 备份日志
  if [ -d "/app/work/logs/bypass" ]; then
    cp -r /app/work/logs/bypass $backup_dir/logs
    log_info "已备份日志"
  fi
  
  log_info "备份完成: $backup_dir ✅"
}

# 运行测试
run_tests() {
  log_info "运行类型检查..."
  
  cd /workspace/projects
  
  if npx tsc --noEmit; then
    log_info "类型检查通过 ✅"
  else
    log_error "类型检查失败 ❌"
    return 1
  fi
}

# 帮助信息
show_help() {
  echo "
╔═══════════════════════════════════════════════════════════════╗
║             ARTiCO 教务系统 - 维护工具                         ║
╠═══════════════════════════════════════════════════════════════╣
║  使用方法: ./scripts/maintenance.sh [命令]                     ║
╚═══════════════════════════════════════════════════════════════╝

📋 常用命令:

  status     检查系统是否正常运行 ⭐ 最常用
  logs       查看系统日志（今天发生了什么）
  error      查看错误日志（有没有出问题）
  restart    重启系统（系统卡住时使用）
  info       查看系统信息
  help       显示这个帮助信息

📖 详细命令:

  logs app      查看应用日志
  logs console  查看浏览器日志
  logs error    只看错误信息
  clear         清理缓存
  db            检查数据库连接
  backup        备份数据

💡 使用示例:

  检查系统状态:
    ./scripts/maintenance.sh status

  查看有没有错误:
    ./scripts/maintenance.sh logs error

  重启系统:
    ./scripts/maintenance.sh restart

🔗 快捷访问:

  系统网址: https://a88dfcc3-0783-40eb-9263-db92a9462f7e.dev.coze.site
  详细文档: docs/小白维护手册.md

"
}

# 主函数
main() {
  local command=$1
  shift || true
  
  case $command in
    status)
      check_status
      ;;
    logs)
      view_logs $1 $2
      ;;
    error)
      view_logs error 30
      ;;
    restart)
      restart_service
      ;;
    clear)
      clear_cache
      ;;
    db)
      db_health
      ;;
    info)
      system_info
      ;;
    backup)
      backup_data $1
      ;;
    test)
      run_tests
      ;;
    help|--help|-h)
      show_help
      ;;
    *)
      log_error "未知命令: $command"
      show_help
      exit 1
      ;;
  esac
}

main "$@"
