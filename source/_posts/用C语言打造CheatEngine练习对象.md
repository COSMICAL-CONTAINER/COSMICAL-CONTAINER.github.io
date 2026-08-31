---
title: 用 C 语言打造 Cheat Engine 练习对象
tags:
  - C语言
  - 指针
abbrlink: 53a5f64f
date: 2023-10-03 22:30:00
---

玩 Cheat Engine（CE）的时候需要一个"练习对象"——写一个小程序，让它维护一个不断变化的数值，然后用 CE 去扫描和修改它。这里记录两个练习用的目标程序。

## 第一课：直接修改 malloc 出来的变量

```c
int *p_num = (int *)malloc(sizeof(int));
srand(time(NULL));
*p_num = rand() % 100 + 100;    // 初始值：100~199 的随机数
while(getchar())
{
    printf("%d", *p_num);
    (*p_num)--;
}
```

每次按回车，数值减 1。练习流程：先用 CE 的"未知的初始值"开始扫描，按几次回车让数值递减后用"减少了的数值"继续扫描，锁定地址后把它改成 999——程序打印的数字就听你的了。

## 第二课：结构体指针的偏移

```c
typedef struct
{
    char name[20];
    int hp;
    int exp;
}playerType, *p_playerType;

p_playerType p_player = (p_playerType)malloc(sizeof(playerType));
strcpy(p_player->name, "Tom");
p_player->hp = rand() % 100 + 100;
```

这次是模拟游戏角色：hp 每按一次回车随机减少，exp 增加。练习要点是理解**结构体成员的偏移**：name 占 20 字节，所以 hp 在结构体首地址 +0x14 的位置。CE 找到 hp 的地址后，往前推 0x14 就是整个结构体的基址——这也是游戏中"基址 + 偏移"定位数据的原理。

## 写在最后

这两个小实验把"内存就是一个大数组"这件事讲得明明白白。当然，对真实在线游戏使用 CE 是违规行为，拿自己写的程序练手才是正道。
