# 宿命 Reborn

基于 [无名杀](https://github.com/libnoname/noname) 制作的多人身份卡牌游戏扩展。此仓库保存可维护的开发源码、已整理的卡牌与英雄资源和规则资料；本地试玩程序、Node 依赖和构建产物不纳入版本库。

## 内容

- `fate-reborn-extension/`：宿命模式的扩展源码、规则测试、构建配置和卡牌/英雄资源。
- `engine-patches/noname-engine-customizations.patch`：对无名杀引擎和桌面启动外观的本地改动补丁。
- `game-docs/`：英雄表、规则书、卡牌效果与技能核查记录。
- `tools/`：macOS 打包辅助脚本。

## 在无名杀源码中构建扩展

1. 克隆无名杀源码，并安装其开发依赖。
2. 将 `fate-reborn-extension` 复制到 `packages/extension/fate-reborn`。
3. 在该目录执行 `pnpm test && pnpm build`。
4. 产物会生成到无名杀客户端的扩展目录；将 `engine-patches/noname-engine-customizations.patch` 应用于对应版本的引擎源码后，再进行桌面端打包。

当前试玩程序位于开发机的 `试玩输出/宿命Reborn试玩版.app`，不随 GitHub 提交。

## Windows：无需命令行的首次使用

1. 在 Windows 安装并登录 [GitHub Desktop](https://desktop.github.com/)。
2. 在 GitHub Desktop 选择 **File → Clone repository**，选择 `chrisluck0524/fate_reborn`，下载到任意英文路径，例如 `D:\Games\fate_reborn`。
3. 在下载完成的文件夹双击 `初始化宿命.cmd`。它会自动下载 Node.js、无名杀引擎和构建依赖；第一次需要联网且可能耗时数分钟。
4. 完成后双击 `启动宿命.cmd`，浏览器会自动打开试玩版。
5. 以后在 GitHub Desktop 点击 **Fetch origin**、**Pull origin** 后，双击 `更新宿命.cmd` 或直接双击 `启动宿命.cmd` 即可使用最新版本。

`.runtime` 是 Windows 自动下载的本地运行环境，不会被 GitHub Desktop 提交或同步。若初始化失败，把窗口内容截图发给 Codex 即可。
