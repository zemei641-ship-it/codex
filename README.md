# 冷宫开席 · Codex Cloud 开发项目

本项目从本地手机网页原型迁移，最新依据是 docs/GDD.md（用户上传文件名v0.1，正文版本0.4）。具体原型数值和范围见 docs/IMPLEMENTATION.md，交接见 HANDOFF.md。

## 运行和验证

无需安装依赖，Node.js运行语法与规则检查：

```sh
npm run check
npm test
```

手机竖屏网页预览：

```sh
python3 -m http.server 8765 --bind 0.0.0.0
```

使用运行环境支持的预览端口打开，不把远端容器的127.0.0.1当作用户手机地址。浏览器可用摇杆、点击场景、WASD或方向键移动；右下按钮操作就位设施。

## 文件

- engine.js：经营规则、状态、库存、预留、人物约定和磁力移动。
- game.js：Canvas场景、交互、菜单、音效、存档。
- index.html / style.css：手机界面。
- engine.test.js：15项规则验证。
- docs/GDD.md：唯一当前原稿，不用旧简化版替换。

存档为各浏览器localStorage，没有后端依赖。云端开发任务与游戏网页托管不同；已有试玩站点继续保留，不需为迁移开发而重发网站。
