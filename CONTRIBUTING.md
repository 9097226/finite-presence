# Contributing

此仓库当前处于概念验证阶段。任何功能建议必须先回答：

1. 它强化了哪个核心价值？
2. 是否制造新的日活压力或 FOMO？
3. 是否增加玩家权限管理负担？
4. 是否破坏“行动优先于言语”？
5. 是否可以通过更小、更低成本的方式验证？

建议以 Issue → Experiment → Evidence → Decision 的方式推进，而不是直接堆功能。

## 修改后验证

在仓库根目录执行：

```bash
python scripts/validate_config.py
python -m unittest discover -s tests -v
node --check prototype/app.js
node --check prototype/home-model.js
node tests/test_home_model.cjs
node tests/test_home_asset_recovery.cjs
```

配置或自动测试通过不能替代浏览器实际操作和游戏体验验收。涉及图片、热区、计时或存档的修改，需按试玩说明复核对应操作链。
