#!/bin/bash

# Bio-Appointment 智能预约调度系统启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}"
    echo "██╗███████╗███╗   ███╗██████╗ ██████╗ ██╗   ██╗███████╗████████╗"
    echo "██║██╔════╝████╗ ████║██╔══██╗██╔══██╗╚██╗ ██╔╝██╔════╝╚══██╔══╝"
    echo "██║█████╗  ██╔████╔██║██████╔╝██║  ██║ ╚████╔╝ █████╗     ██║   "
    echo "██║██╔══╝  ██║╚██╔╝██║██╔══██╗██║  ██║  ╚██╔╝ ██╔══╝     ██║   "
    echo "██║███████╗██║ ╚═╝ ██║██████╔╝██████╔╝   ██║  ███████╗   ██║   "
    echo "╚═╝╚══════╝╚═╝     ╚═╝╚═════╝╚═════╝    ╚═╝  ╚══════╝   ╚═╝   "
    echo -e "${NC}"
    echo -e "${BLUE}Bio-Appointment 智能预约调度系统${NC}"
    echo -e "${BLUE}基于 React + TypeScript + PostgreSQL 的医疗预约管理平台${NC}"
    echo ""
}

check_requirements() {
    print_status "检查环境要求..."

    # 检查Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi

    # 检查Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js 20+"
        exit 1
    fi

    # 检查npm
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装，请先安装 npm"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2)
    if [[ "$NODE_VERSION" < "20" ]]; then
        print_error "Node.js 版本过低，需要 20+，当前版本: $NODE_VERSION"
        exit 1
    fi

    print_success "环境要求检查通过"
}

start_database() {
    print_status "启动数据库服务..."

    # 检查容器是否已运行
    if docker ps | grep -q "bio-appointment-postgres"; then
        print_warning "数据库服务已在运行"
    else
        docker-compose up -d postgres redis

        # 等待数据库启动
        print_status "等待数据库启动..."
        sleep 5

        # 检查数据库连接
        if docker exec bio-appointment-postgres pg_isready -U app_user -d bio_appointment; then
            print_success "数据库服务启动成功"
        else
            print_error "数据库连接失败"
            exit 1
        fi
    fi
}

init_database() {
    print_status "初始化数据库..."

    # 运行数据库初始化脚本
    if ./database/migrate.sh init; then
        print_success "数据库初始化完成"
    else
        print_error "数据库初始化失败"
        exit 1
    fi
}

install_dependencies() {
    print_status "安装依赖包..."

    if npm install; then
        print_success "依赖包安装完成"
    else
        print_error "依赖包安装失败"
        exit 1
    fi
}

setup_environment() {
    print_status "设置环境配置..."

    # 创建环境变量文件
    if [ ! -f ".env.local" ]; then
        print_status "创建 .env.local 文件..."
        cp .env.example .env.local
        print_success "已创建 .env.local 文件，请根据需要修改配置"
    else
        print_warning ".env.local 文件已存在"
    fi
}

start_development_server() {
    print_status "启动开发服务器..."
    print_status "访问地址: http://127.0.0.1:5173"
    print_status ""
    print_status "默认用户账户:"
    echo "┌─────────────────┬──────────┬─────────────┐"
    echo "│ 用户名          │ 密码     │ 角色        │"
    echo "├─────────────────┼──────────┼─────────────┤"
    echo "│ admin           │ admin123 │ 超级管理员 │"
    echo "│ sales1          │ password123 │ 销售人员   │"
    echo "│ head_nurse1     │ password123 │ 护士长     │"
    echo "│ nurse1          │ password123 │ 护士       │"
    echo "│ doctor1         │ password123 │ 医生       │"
    echo "└─────────────────┴──────────┴─────────────┘"
    echo ""

    # 启动开发服务器
    if npm run dev; then
        print_success "开发服务器启动成功"
    else
        print_error "开发服务器启动失败"
        exit 1
    fi
}

show_usage() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  start           完整启动（默认）"
    echo "  database-only   仅启动数据库"
    echo "  init-only       仅初始化数据库"
    echo "  install-only    仅安装依赖"
    echo "  status          查看系统状态"
    echo "  stop            停止所有服务"
    echo "  clean           清理所有数据和容器"
    echo "  help            显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0              # 完整启动"
    echo "  $0 start         # 完整启动"
    echo "  $0 database-only # 仅启动数据库"
    echo "  $0 status        # 查看状态"
}

show_status() {
    print_header
    print_status "系统状态检查:"
    echo ""

    # Docker 容器状态
    echo "🐳 Docker 容器:"
    if docker-compose ps 2>/dev/null | grep -q "Up"; then
        docker-compose ps
    else
        echo "  未运行任何容器"
    fi
    echo ""

    # 数据库连接测试
    echo "🗄️ 数据库连接:"
    if docker exec bio-appointment-postgres pg_isready -U app_user -d bio_appointment 2>/dev/null; then
        echo "  ✅ PostgreSQL 连接正常"
    else
        echo "  ❌ PostgreSQL 连接失败"
    fi
    echo ""

    # Redis 连接测试
    echo "🔴 Redis 连接:"
    if docker exec bio-appointment-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo "  ✅ Redis 连接正常"
    else
        echo "  ❌ Redis 连接失败"
    fi
    echo ""

    # Node.js 版本
    echo "📦 Node.js:"
    echo "  版本: $(node -v)"
    echo "  npm: $(npm -v)"
    echo ""

    # 端口占用
    echo "🌐 端口占用:"
    if lsof -i :5173 2>/dev/null | grep -q LISTEN; then
        echo "  ✅ 5173 (开发服务器) - 已占用"
    else
        echo "  ❌ 5173 (开发服务器) - 未占用"
    fi

    if lsof -i :5437 2>/dev/null | grep -q LISTEN; then
        echo "  ✅ 5437 (PostgreSQL) - 已占用"
    else
        echo "  ❌ 5437 (PostgreSQL) - 未占用"
    fi

    if lsof -i :6379 2>/dev/null | grep -q LISTEN; then
        echo "  ✅ 6379 (Redis) - 已占用"
    else
        echo "  ❌ 6379 (Redis) - 未占用"
    fi
    echo ""
}

stop_services() {
    print_status "停止所有服务..."

    docker-compose down
    print_success "所有服务已停止"
}

clean_all() {
    print_warning "这将删除所有数据、容器和镜像"
    read -p "确定要继续吗？(y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "清理所有数据..."

        # 停止并删除容器
        docker-compose down -v --remove-orphans

        # 删除镜像
        docker rmi app-7u4xlrye46ip_postgres 2>/dev/null || true
        docker rmi app-7u4xlrye46ip_redis 2>/dev/null || true

        # 清理未使用的资源
        docker system prune -f

        print_success "清理完成"
    else
        print_status "清理已取消"
    fi
}

# 主函数
main() {
    case "${1:-start}" in
        start| "")
            print_header
            check_requirements
            setup_environment
            install_dependencies
            start_database
            init_database
            start_development_server
            ;;
        database-only)
            print_header
            check_requirements
            start_database
            ;;
        init-only)
            print_header
            init_database
            ;;
        install-only)
            print_header
            install_dependencies
            ;;
        status)
            show_status
            ;;
        stop)
            print_header
            stop_services
            ;;
        clean)
            print_header
            clean_all
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "未知选项: $1"
            show_usage
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"