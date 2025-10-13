#!/bin/bash
set -e

echo "🌸 开始执行 FuyuBot 环境自动配置脚本..."

echo "🔧 更新软件包..."
pkg update -y && pkg upgrade -y || { echo "更新失败"; exit 1; }

# 安装基础工具
echo "📦 安装 curl、unzip、git..."
pkg install -y curl unzip git openssl-tool || { echo "安装失败"; exit 1; }

# 安装 X11 和 Termux 用户存储库
echo "📚 安装 X11 和 Termux 用户存储库..."
pkg install -y x11-repo tur-repo || { echo "安装失败"; exit 1; }

# 安装 Node.js 与 pnpm
echo "🧩 安装 Node.js..."
pkg install -y nodejs || { echo "安装失败"; exit 1; }
npm install -g pnpm || { echo "安装 pnpm 失败"; exit 1; }

# 下载并安装 Android NDK
echo "📥 正在下载 Android NDK..."
NDK_URL="https://github.com/lzhiyong/termux-ndk/releases/download/android-ndk/android-ndk-r27b-aarch64.zip"
NDK_ZIP="$HOME/android-ndk-r27b-aarch64.zip"
NDK_DIR="$HOME/android-ndk"

curl -L "$NDK_URL" -o "$NDK_ZIP" || { echo "下载失败"; exit 1; }
echo "📦 解压 Android NDK..."
unzip -o "$NDK_ZIP" -d "$NDK_DIR" || { echo "解压失败"; exit 1; }
rm "$NDK_ZIP"

mv "$NDK_DIR/android-ndk-r27b"/* "$NDK_DIR"/ || { echo "移动文件失败"; exit 1; }
rm -rf "$NDK_DIR/android-ndk-r27b"

# 设置环境变量
export ANDROID_NDK_HOME="$NDK_DIR"
export NDK_HOME="$NDK_DIR"
export ANDROID_NDK_ROOT="$NDK_DIR"
export PATH="$PATH:$NDK_DIR"
export GYP_DEFINES="android_ndk_path=$NDK_DIR"

echo "✅ NDK 环境变量已设置："
echo "ANDROID_NDK_HOME=$ANDROID_NDK_HOME"

# 验证 ndk-build
if [ -f "$NDK_DIR/ndk-build" ]; then
    echo "NDK 配置成功！"
    "$NDK_DIR/ndk-build" --version || true
else
    echo "⚠️ 未找到 ndk-build，请检查目录结构"
    ls -la "$NDK_DIR"
fi

# 安装构建工具
echo "🛠️ 安装编译工具链..."
pkg install -y clang make cmake || { echo "安装失败"; exit 1; }

# 安装 LLVM 版本 binutils，避免冲突
echo "🧱 安装 binutils-is-llvm..."
pkg uninstall -y binutils 2>/dev/null || true
pkg install -y binutils-is-llvm || { echo "安装失败"; exit 1; }

# 设置交叉编译环境变量
export AR=/data/data/com.termux/files/usr/bin/aarch64-linux-android-ar
export CC=/data/data/com.termux/files/usr/bin/aarch64-linux-android-clang
export CXX=/data/data/com.termux/files/usr/bin/aarch64-linux-android-clang++

# 安装 Python 与构建环境
echo "🐍 安装 Python 与构建依赖..."
pkg install -y python build-essential || { echo "安装失败"; exit 1; }
pip install --upgrade pip setuptools || { echo "安装 setuptools 失败"; exit 1; }

# 安装 MongoDB
set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE} 🚀 MongoDB Installer for Termux ${NC}"
echo -e "${BLUE}=========================================${NC}"

# Step 1: Update & install dependencies
echo -e "${YELLOW}[1/6] Updating package list...${NC}"
pkg update -y && pkg upgrade -y

echo -e "${YELLOW}[2/6] Installing dependencies...${NC}"
pkg install -y tur-repo termux-services git wget curl build-essential

# Step 2: Install MongoDB
echo -e "${YELLOW}[3/6] Installing MongoDB from tur-repo...${NC}"
pkg install -y mongodb

# Step 3: Create data & log folders
echo -e "${YELLOW}[4/6] Creating data and log folders...${NC}"
mkdir -p ~/mongodb/data/cluster0
mkdir -p ~/mongodb/data/log

# Step 4: Create mongod.conf
echo -e "${YELLOW}[5/6] Creating mongod.conf file...${NC}"
cat > ~/mongodb/mongod.conf << 'EOF'
systemLog:
  destination: file
  path: /data/data/com.termux/files/home/mongodb/data/log/mongod.log
net:
  bindIp: 0.0.0.0
  port: 27017
processManagement:
  fork: false
EOF

# Step 5: Setup termux-services
echo -e "${YELLOW}[6/6] Setting up termux service for MongoDB...${NC}"
mkdir -p /data/data/com.termux/files/usr/var/service/mongod
cat > /data/data/com.termux/files/usr/var/service/mongod/run << 'EOF'
#!/data/data/com.termux/files/usr/bin/sh
exec mongod --dbpath ~/mongodb/data/cluster0 \
  -f ~/mongodb/mongod.conf \ 
  2>&1
EOF

chmod +x /data/data/com.termux/files/usr/var/service/mongod/run

# Create log/run symlink
mkdir -p /data/data/com.termux/files/usr/var/service/mongod/log
ln -sF /data/data/com.termux/files/usr/share/termux-services/svlogger /data/data/com.termux/files/usr/var/service/mongod/log/run

echo -e "${GREEN}✅ MongoDB installation & service setup completed!${NC}"

echo "✅ 基础环境配置完成！"
echo "📂 开始配置数据库..."

# 提示用户启动 MongoDB
echo "🚀 请在新终端中启动 MongoDB 服务："
echo "1. 打开一个新的 Termux 终端"
echo "2. 输入以下命令启动 MongoDB："
echo "   mongod"
echo "3. 确认 MongoDB 启动后返回此终端"

# 等待用户确认
while true; do
    read -p "MongoDB 服务是否已启动？(y/n): " response
    case $response in
        [Yy]* ) break;;
        [Nn]* ) echo "请在新终端启动 MongoDB 服务后再试。";;
        * ) echo "请输入 y 或 n";;
    esac
done

# 等待 MongoDB 启动
echo "⏳ 等待 MongoDB 连接..."
for i in {1..10}; do
    if mongo admin --eval "db.runCommand({ ping: 1 })" &>/dev/null; then
        echo "✅ MongoDB 启动成功！"
        break
    else
        echo "等待中...($i/10)"
        sleep 1
    fi
done

if ! mongo admin --eval "db.runCommand({ ping: 1 })" &>/dev/null; then
    echo "❌ MongoDB 启动失败，请检查日志"
    exit 1
fi

# 创建管理员账号
echo "👑 创建默认管理员账号..."
echo "🔐 生成随机密码哈希..."
RANDOM_HASH=$(openssl rand -hex 32)
mongo admin --eval "db.createUser({user:'admin', pwd:'$RANDOM_HASH', roles:[{role:'root', db:'admin'}]})"

# 修改配置启用认证
echo "🔐 启用 MongoDB 授权登录..."
MONGO_DIR="$HOME/mongodb"
MONGO_CONF="$MONGO_DIR/mongod.conf"

# 检查配置文件是否存在
if [ ! -f "$MONGO_CONF" ]; then
    echo "❌ MongoDB 配置文件 $MONGO_CONF 不存在，请检查 MongoDB 安装"
    exit 1
fi

# 备份现有配置文件
cp "$MONGO_CONF" "$MONGO_CONF.bak" || { echo "备份配置文件失败"; exit 1; }

# 检查是否已存在 security 段，如果不存在则添加
if ! grep -q "security:" "$MONGO_CONF"; then
    echo -e "\nsecurity:\n  authorization: enabled" >> "$MONGO_CONF"
else
    # 如果 security 段存在，检查 authorization 是否启用
    if ! grep -q "authorization: enabled" "$MONGO_CONF"; then
        # 使用 sed 在 security 段下添加或更新 authorization
        sed -i '/security:/a\  authorization: enabled' "$MONGO_CONF" || { echo "修改配置文件失败"; exit 1; }
    fi
fi

# 确保 processManagement.fork 设置为 true
if ! grep -q "fork: true" "$MONGO_CONF"; then
    if grep -q "processManagement:" "$MONGO_CONF"; then
        sed -i '/processManagement:/a\  fork: true' "$MONGO_CONF" || { echo "修改配置文件失败"; exit 1; }
    else
        echo -e "\nprocessManagement:\n  fork: true" >> "$MONGO_CONF"
    fi
fi

echo "🔄 请在新终端中重启 MongoDB 服务以启用认证："
echo "1. 在新终端中终止当前 MongoDB 进程（Ctrl+C 或 kill）"
echo "2. 输入以下命令重启 MongoDB："
echo "   mongod"
echo "3. 确认 MongoDB 重启后返回此终端"

# 再次等待用户确认
while true; do
    read -p "MongoDB 服务是否已重启？(y/n): " response
    case $response in
        [Yy]* ) break;;
        [Nn]* ) echo "请在新终端重启 MongoDB 服务后再试。";;
        * ) echo "请输入 y 或 n";;
    esac
done

# 验证 MongoDB 连接
echo "⏳ 验证 MongoDB 连接..."
for i in {1..10}; do
    if mongo admin -u admin -p "$RANDOM_HASH" --eval "db.runCommand({ ping: 1 })" &>/dev/null; then
        echo "✅ MongoDB 连接成功！"
        break
    else
        echo "等待中...($i/10)"
        sleep 1
    fi
done

if ! mongo admin -u admin -p "$RANDOM_HASH" --eval "db.runCommand({ ping: 1 })" &>/dev/null; then
    echo "❌ MongoDB 连接失败，请检查日志"
    exit 1
fi

echo "✅ MongoDB 初始化完成"
echo "🔗 数据库连接地址: mongodb://admin:$RANDOM_HASH@127.0.0.1:27017/?authSource=admin"

# 克隆并安装 FuyuBot
echo "🐾 正在克隆 Fuyu_TDBot..."
git clone https://github.com/CatMoeCircle/Fuyu_TDBot.git || { echo "克隆失败"; exit 1; }
cd Fuyu_TDBot

echo "📦 安装依赖..."
pnpm install || { echo "安装依赖失败"; exit 1; }

echo "🎉 环境配置完成！"
echo "🧠 启动 Bot 命令: pnpm start"
echo "🔗 数据库连接地址: mongodb://admin:$RANDOM_HASH@127.0.0.1:27017/?authSource=admin"
cd Fuyu_TDBot
echo "💤 MongoDB 已后台运行！"