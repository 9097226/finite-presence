# 06 — Domain Model

## 主要实体

### Player
```text
Player
- id
- display_name
- presence_wallet
- home_id
- relationship_ids[]
- privacy_preset
```

### PresenceWallet
```text
PresenceWallet
- daily_grant_minutes
- available_minutes
- cap_minutes
- active_session_minutes
- mode: ACTIVE | REST
```

### Home
```text
Home
- id
- owner_id
- zones[]
- adjacent_commons_id
- traces[]
```

### Zone
```text
Zone
- id
- home_id
- name
- level: L1..L5
- default_access
- allow_list[]
- deny_list[]
```

### Commons
```text
Commons
- id
- adjacent_home_ids[]
- permitted_actions[]
- temporary_traces[]
- moderation_state
```

### Relationship
```text
Relationship
- player_a
- player_b
- status
- shared_events[]
- explicit_access_grants[]
```

### Trace
```text
Trace
- id
- actor_id
- location_id
- type
- persistence: TEMPORARY | SOFT | PERMANENT
- created_at
- expires_at?
```

### Visit
```text
Visit
- visitor_id
- target_home_id
- requested_zone_id
- access_result
- duration_minutes
- actions[]
```

## 权限判定顺序

1. Commons 永远可进入；
2. Zone deny_list 显式拒绝优先；
3. allow_list 显式授权；
4. 默认模板；
5. 不确定时 Fail Closed；
6. 所有访问决策写入本地审计事件。
