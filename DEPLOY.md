# ARTiCO 自动排课系统 - 部署指南

## 一、服务器要求

- **操作系统**: Ubuntu 22.04 LTS
- **CPU**: 2核及以上
- **内存**: 4GB及以上
- **存储**: 50GB及以上

## 二、安装依赖

### 1. 更新系统
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip
```

### 2. 安装 Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm
```

### 3. 安装 PostgreSQL 14
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql -c "CREATE USER artico WITH PASSWORD '你的密码';"
sudo -u postgres psql -c "CREATE DATABASE artico OWNER artico;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE artico TO artico;"
```

### 4. 安装 PM2
```bash
sudo npm install -g pm2
```

### 5. 安装 Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 三、部署应用

### 1. 上传部署包
```bash
# 在你的本地机器上执行（替换IP）
scp artico-deploy.tar.gz user@你的服务器IP:/home/user/
```

### 2. 解压并安装依赖
```bash
cd /home/user
mkdir -p artico
tar -xzvf artico-deploy.tar.gz -C artico
cd artico
pnpm install --prod
```

### 3. 配置环境变量
```bash
nano .env.local
```

写入以下内容：
```env
# 数据库配置
DATABASE_URL="postgresql://artico:你的密码@localhost:5432/artico"

# 飞书配置
FEISHU_APP_ID="cli_xxx"
FEISHU_APP_SECRET="xxx"
FEISHU_APP_TOKEN="xxx"
FEISHU_TABLE_ID="xxx"

# 应用配置
NODE_ENV="production"
PORT="3000"
```

### 4. 初始化数据库
```bash
cd /home/user/artico
npx drizzle-kit push
```

### 5. 启动应用
```bash
pm2 start pnpm --name "artico" -- start
pm2 startup
pm2 save
```

## 四、配置 Nginx

### 1. 创建配置文件
```bash
sudo nano /etc/nginx/sites-available/artico
```

写入：
```nginx
server {
    listen 80;
    server_name 你的域名或IP;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. 启用配置
```bash
sudo ln -s /etc/nginx/sites-available/artico /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 五、防火墙配置

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 六、常用命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs artico

# 重启应用
pm2 restart artico

# 更新部署
cd /home/user/artico
git pull  # 或重新上传文件
pnpm install --prod
pm2 restart artico
```

## 七、默认账号

系统内置测试账号，首次登录后请修改：

| 角色 | 用户名 | 说明 |
|------|--------|------|
| 管理员 | 张主管 | 最高权限 |
| 规划顾问 | 李顾问 | 学生管理权限 |
| 全职导师 | 李坤安 | 上课记录权限 |
| 兼职导师 | 胡家辉 | 有限权限 |

---

**部署完成后访问**: `http://你的服务器IP`
