# 宿命 Reborn

基于 [无名杀](https://github.com/libnoname/noname) 制作的多人身份卡牌游戏扩展。此仓库保存可维护的开发源码与规则资料；本地试玩程序、Node 依赖、构建产物和收集中的美术资源不纳入版本库。

## 内容

- `fate-reborn-extension/`：宿命模式的扩展源码、规则测试、构建配置与图片放置说明。
- `engine-patches/noname-engine-customizations.patch`：对无名杀引擎和桌面启动外观的本地改动补丁。
- `game-docs/`：英雄表、规则书、卡牌效果与技能核查记录。
- `tools/`：macOS 打包辅助脚本。

## 在无名杀源码中构建扩展

1. 克隆无名杀源码，并安装其开发依赖。
2. 将 `fate-reborn-extension` 复制到 `packages/extension/fate-reborn`。
3. 在该目录执行 `pnpm test && pnpm build`。
4. 产物会生成到无名杀客户端的扩展目录；将 `engine-patches/noname-engine-customizations.patch` 应用于对应版本的引擎源码后，再进行桌面端打包。

当前试玩程序位于开发机的 `试玩输出/宿命Reborn试玩版.app`，不随 GitHub 提交。
