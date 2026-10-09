# 上传到 GitHub

## 方法 A：GitHub Desktop（最适合不熟命令行）

1. 解压本项目。
2. 打开 GitHub Desktop。
3. `File → Add local repository`，选择 `finite-presence-game` 文件夹。
4. 如果提示不是 Git 仓库，选择 `create a repository`。
5. Repository name 建议：`finite-presence-game`。
6. 首次提交信息：`chore: initialize finite presence concept and MVP prototype`。
7. 点击 `Publish repository`。
8. 如果暂时不希望公开，勾选 `Keep this code private`。

## 方法 B：命令行

```bash
cd finite-presence-game
git init
git add .
git commit -m "chore: initialize finite presence concept and MVP prototype"
git branch -M main
git remote add origin https://github.com/<YOUR_NAME>/finite-presence-game.git
git push -u origin main
```

## 本地运行

```bash
cd prototype
python -m http.server 18451 --bind 127.0.0.1
```

访问 `http://127.0.0.1:18451/`。

## 当前公开仓库

项目已公开在 https://github.com/9097226/finite-presence 。整个仓库采用 CC0 1.0 Universal，条款见 LICENSE。

后续变更通过正常 Git 提交与推送同步；不包含浏览器个人存档、日志或本机运行状态。试玩方式与验证命令以 README 为准。
