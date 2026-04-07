# create-java-springboot

Interactive CLI to scaffold Spring Boot projects — like `create-next-app` but for Spring.

## Usage

```bash
npx create-java-springboot
```

Or install globally:

```bash
npm i -g create-java-springboot
create-java-springboot
```

## Features

- Fetch live dependency list from `start.spring.io`
- Preset templates (REST API, Full Stack, Microservice, Minimal)
- Interactive multiselect with descriptions
- Choose Java version, Spring Boot version, build tool
- Auto-install Java via SDKMAN or Homebrew if version mismatch is detected

---

## Manual Installation

If you prefer not to use `npx`, you can clone and run locally.

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | >= 18 | `node --version` |
| pnpm | any | `pnpm --version` |
| unzip | system | `which unzip` |

> `unzip` is used to extract the generated project. On macOS it is pre-installed. On Linux: `sudo apt install unzip` / `sudo yum install unzip`.

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-username/create-java-springboot.git
cd create-java-springboot

# 2. Install dependencies
pnpm install

# 3. Build
pnpm build

# 4. Run
node dist/index.js
```

Or run without building (dev mode):

```bash
pnpm dev
```

---

## Java Installation

The CLI will detect whether the Java version you selected is installed on your machine. If not, it will prompt you to install it automatically.

### Option 1 — SDKMAN (recommended, manages multiple versions)

```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install a specific Java version (e.g. Java 21 via Eclipse Temurin)
sdk install java 21-tem

# List available versions
sdk list java
```

### Option 2 — Homebrew (macOS)

```bash
# Install a specific version
brew install openjdk@21

# Create symlink so the system can find it
sudo ln -sfn "$(brew --prefix)/opt/openjdk@21/libexec/openjdk.jdk" \
  /Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

### Option 3 — Manual download

Download from [Adoptium (Eclipse Temurin)](https://adoptium.net) and follow the installer for your OS.

### Verify installation

```bash
java -version
# openjdk version "21.x.x" ...
```

---

## Running the Generated Project

After the project is created:

```bash
cd my-app

# Gradle
./gradlew bootRun

# Maven
./mvnw spring-boot:run
```

---

## Dev

```bash
pnpm install
pnpm dev     # run with tsx (no build needed)
pnpm build   # compile TypeScript → dist/
```

## Publish

```bash
pnpm build
npm publish
```
