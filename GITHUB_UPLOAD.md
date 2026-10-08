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
python -m http.server 8000
```

访问 `http://localhost:8000`。

## 公开前建议

1. 先决定是否公开仓库；概念尚处于早期，公开会暴露完整设计思路。
2. 明确 LICENSE。当前仓库故意没有开源许可证。
3. 首轮原型测试建议先用 Private Repository。
4. 不要先扩充大量功能；优先用 GitHub Issues 记录实验和证据。
