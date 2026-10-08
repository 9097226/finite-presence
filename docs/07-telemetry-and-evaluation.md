# 07 — Telemetry & Evaluation

## 原则

Telemetry 用于验证体验假设，不用于制造玩家压力。

## 建议事件

- `session_started`
- `presence_spent`
- `presence_depleted`
- `rest_mode_entered`
- `home_zone_opened`
- `home_zone_access_granted`
- `home_zone_access_denied`
- `commons_entered`
- `visit_started`
- `visit_completed`
- `message_left`
- `gift_left`
- `silent_co_presence`
- `world_trace_created`
- `player_returned_after_gap`
- `session_choice_abandoned`

## 核心指标

### 体验指标
- Meaningful Choice Rate：玩家是否明确感到“我做了取舍”；
- Voluntary Social Action Rate：无奖励社交行为占比；
- Quiet Co-presence Rate：无文本交流但共同停留行为；
- Return Desire Score：主观回归意愿；
- Boundary Comfort Score：空间边界舒适度；
- Time Pressure Score：时间焦虑程度。

### 反指标
以下上升不应被自动视为成功：

- 单日时长；
- 连续登录天数；
- 消息数量；
- 好友数量；
- 公共区域停留时长。

它们只有在不破坏核心体验时才有解释价值。

## Golden Set（定性测试场景）

1. 玩家只剩 8 分钟时，朋友上线；
2. 玩家住宅完全私人，但门外公共区域有人停留；
3. 玩家给某人开放书房，但没有发送任何解释；
4. 玩家三天未上线后返回；
5. 玩家看到短暂世界事件，但选择去见朋友；
6. 存在时间耗尽时，玩家正在和别人安静共处。

每个场景都应验证：系统是否尊重玩家选择、是否避免强制、是否产生自然故事。
