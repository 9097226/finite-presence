# 03 — Social & Spatial Model

## 空间是关系语言

时间表达重视；空间表达信任；行动表达情感。

## 默认隐私梯度

- L0 Commons：所有人可进入；
- L1 Threshold：门廊、门前、留言处；
- L2 Guest：一般访客 / 好友；
- L3 Trusted：指定熟人；
- L4 Intimate：明确白名单；
- L5 Self：仅本人。

## 权限模型

默认模板：

1. **开放**：L1-L2 对所有人开放；
2. **友好**：L1 对所有人、L2-L3 对好友；
3. **安静**：L1 对所有人、L2 对好友、其他关闭；
4. **私人**：只有明确邀请对象能进入住宅；
5. **自定义**：按区域与具体身份授权。

## 访问控制对象

最小对象：

```text
Zone
- id
- owner_id
- privacy_level
- default_access
- allow_list
- deny_list
- interaction_policy
```

## 公共领域

每个住宅必须相邻至少一个公共区域。屋主无权将其私有化。

允许：

- 经过；
- 停留；
- 坐下；
- 轻度交流；
- 演奏；
- 公共物件协作；
- 留下受限时长的小型痕迹。

禁止：

- 永久堵门；
- 破坏私人资产；
- 未授权进入；
- 持续跟踪；
- 垃圾刷屏；
- 恶意占用公共空间。

## 社交漏斗

`Encounter → Interaction → Shared Experience → Recognition → Repeat Encounter → Relationship → Shared Memory`

不强制从“添加好友”开始。
