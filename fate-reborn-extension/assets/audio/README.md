# 宿命语音文件接口

每个英雄技能预留两条语音，文件名为：

- `skill/<技能 ID>1.mp3`
- `skill/<技能 ID>2.mp3`

例如“闪烁”对应 `skill/fate_antimage_blink1.mp3` 和
`skill/fate_antimage_blink2.mp3`。引擎会在两条语音中随机播放一条。

每名英雄预留一条阵亡语音，文件名为：

- `die/<英雄 ID>.mp3`

例如敌法师对应 `die/fate_anti_mage.mp3`。直接把音频放入这些目录即可，
不需要修改技能代码或英雄定义。
