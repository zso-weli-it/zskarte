# 🗺️ Zivilschutz-Karte

![GitHub license](https://img.shields.io/github/license/zskarte/zskarte)
![GitHub release](https://img.shields.io/github/v/release/zskarte/zskarte)
![GitHub last commit](https://img.shields.io/github/last-commit/zskarte/zskarte)
![GitHub contributors](https://img.shields.io/github/contributors/zskarte/zskarte)
![GitHub pull requests](https://img.shields.io/github/issues-pr/zskarte/zskarte)
![GitHub forks](https://img.shields.io/github/forks/zskarte/zskarte)
![GitHub stars](https://img.shields.io/github/stars/zskarte/zskarte)
![GitHub watchers](https://img.shields.io/github/watchers/zskarte/zskarte)
![GitHub followers](https://img.shields.io/github/followers/zskarte)
![GitHub repo size](https://img.shields.io/github/repo-size/zskarte/zskarte)
![GitHub code size](https://img.shields.io/github/languages/code-size/zskarte/zskarte)
![GitHub language count](https://img.shields.io/github/languages/count/zskarte/zskarte)
![GitHub top language](https://img.shields.io/github/languages/top/zskarte/zskarte)
![GitHub issues](https://img.shields.io/github/issues/zskarte/zskarte)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![ZSKarte.ch](https://img.shields.io/website?url=https%3A%2F%2Fwww.zskarte.ch)](https://www.zskarte.ch)

## ℹ️ About

Zivilschutz-Karte is a powerful JavaScript application (based on Angular) designed for creating detailed situation maps for disaster management. Developed specifically for Swiss civil defense organisations, it works seamlessly on both standard computers and interactive whiteboards. 🖥️ 📱

## 🔍 Key Features

- 🎨 Intuitive drawing interface
- 🌍 Multiple map provider integration
- 💾 Local storage support
- 🔄 Real-time collaboration
- 📱 Responsive design
- 🔒 Secure authentication

## 👀 Demo

You can run Zivilschutz-Karte without installation from [https://zskarte.ch](https://zskarte.ch). This is the production application. Please request access from your civil defence organisation or use the guest mode to try out.

<img alt="Screenshot of ZS-Karte" src="https://github.com/user-attachments/assets/c06261e2-7505-4d57-9834-1cee7aa5b8a4" />

## 🚀 Getting Started

### 🛠️ Prerequisites

- 📦 Node.js 22.x
- 🔧 npm 10.x
- 🐳 docker 27.x or higher

### 📋 Installation Steps

### 1. Install packages

```bash
npm install
```

### 2. For Server copy .env.example file and rename it to .env (you can keep the values as they are for local development)
```bash
cp packages/server/.env.example packages/server/.env
```

### 3. Start the application (database, backend, frontend)

```bash
npm run start
```

### 4. Access the Strapi admin panel (Backend)

1. http://localhost:1337/admin
2. Login with credentials: User -> info@zskarte.ch, Password -> Supersecret123

### 5. Access the Zivilschutz-Karte application (Frontend)

Zivilschutz-Karte is optimized and tested for use with Google Chrome - nevertheless other browsers might work as well and are supported in a best effort manner.

1. http://localhost:4300
2. Login with credentials: User -> zso_development, Password -> Supersecret123

## 💡 Help & Feedback

Need assistance or want to share your thoughts? We'd love to hear from you!

- 🐛 Create an issue on GitHub
- 📧 Send feedback to [feedback@zskarte.ch](mailto:feedback@zskarte.ch)
- 💬 Join our community discussions

## ⚖️ Terms of Use

Please note, that this application integrates several different map provider services. Since the terms of use of the different services usually restrict the extent of use (limited quotas, restricted access to data layers), it's the liability of the user to make sure that the corresponding limitations and/or preconditions are fulfilled.

## 🛠️ Development Tools

### 🐳 Docker-Compose

This will startup a local postgresDB with a RDMS system (pgadmin).

#### Start

```bash
docker compose up -d
```

> 💡 If you have trouble with the creation of the containers use: `docker compose up -d --force-recreate` or check Linux/WSL prerequisites.

#### Stop

```bash
docker compose down
```

### PGAdmin

A postgresql database management tool
[pgadmin](http://localhost:7050/)

- PostgreSQL:
  - User: postgres
  - Password: supersecret123

### Linux/WSL prerequisites

```bash
# Create the data/postgresql folder
mkdir -p data/postgresql
# Add the UID 1001 (non-root user of postgresql) as the folder owner
sudo chown -R 1001:1001 data/postgresql
# Create the data/pgadmin folder
mkdir -p data/pgadmin
# Add the UID 5050 (non-root user of pgadmin) as the folder owner
sudo chown -R 5050:5050 data/pgadmin
```
### Informations for developer

More informations for developers for internal logic / tasks can be found in [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).

## 🤝 Contributing

We welcome contributions! Here's how you can help:

- 🐛 Report bugs
- 💡 Suggest new features
- 🔧 Submit pull requests
- 📚 Improve documentation

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🌟 Star Us!

If you find this project useful, please consider giving it a star on GitHub! ⭐
