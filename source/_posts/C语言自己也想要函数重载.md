---
title: C 语言自己也想要函数重载
tags:
  - C语言
abbrlink: aba8b8e8
date: 2023-03-01 18:46:00
---

> 📌 **更新（2026-09-01）**：归档这篇旧笔记，代码用 GCC 15.1.0 复测，输出与当年一致——顺带收获了几枚新编译器对老代码的唠叨，见文内。

C++ 有函数重载，`add(int,int)` 和 `add(float,float)` 可以同名共存，编译器按实参类型自动分发。C 没有这个待遇——但 C11 给了一个官方替代品：`_Generic` 选择宏。根据表达式的类型，在**编译期**挑一个分支：

```c
#define ADD(x,y) _Generic((x),\
    /*S:add_stu(x,y),*/\
    int:add_int(x,y),\
    float:add_float(x,y),\
    double:add_float((float)x,(float)y),\
    default:unsupport())
```

`_Generic` 的第一个参数是"钥匙"，后面是一串 `类型: 结果` 的锁眼。编译时看钥匙的**类型**（不是值）挑锁眼，选中的表达式才会被展开，没选中的连求值都不会发生——所以它是零运行时分发的免费午餐。实测三连：

```text
printf("%d\n", b.ID);     →  1
ADD(1.0, 2.1);            →  1.000000 + 2.100000 = 3.100000
ADD(1, 2);                →  1 + 2 = 3
```

`ADD(1.0, 2.1)` 走 double 档位，内部强转 float 复用同一个 `add_float`；`ADD(1, 2)` 走 int 档位调 `add_int`；要是传个没注册的类型，`default` 档的 `unsupport()` 接客。

这套东西和[《用 C 语言写 C++》](/posts/380f72c9/)里的思路是同一个问题的两种解法——那篇是用宏穷举模拟重载（民间土法，C99 就能用），这篇是 `_Generic`（官方发证，要 C11）。土法胜在兼容老编译器，`_Generic` 胜在类型分发是编译期原生支持的，类型写错直接编译报错而不是哑火，不用自己缝。

两处当年的留白也如实记录：

一是往结构体类型分发的 `S: add_stu(x,y)` 那一行被注释掉了，`ADD(b, c)` 的调用也是——自定义类型这条路试了一脚就收了。`_Generic` 本身是支持结构体类型的（钥匙是类型名就行），当年大概是卡在别处，留了个坑位给未来的自己。

二是文件名叫 `typeof.c`，内容却是 `_Generic`——`typeof` 是 GCC 的另一件宝贝（顺带一提，C23 终于把它收编进标准了），大概是当时计划一起学，结果只写了后者的作业。文件夹放在 `linux/` 下面也不奇怪：`_Generic` 在 Linux 内核源码的 `min/max` 宏里大放异彩，从内核源码里学来的东西，文件夹名就是个出处的纪念。

复测时 GCC 15 还点名了三个"躺平变量"：`a`、`stu1` 没用过，`c` 赋了值没用——它们当年就是给 `ADD(b, c)` 那行注释掉的调用准备的陪练，注释一走，陪练集体失业。

## 完整源码

```c typeof.c
#include <stdio.h>

int add_int(int a,int b)
{
    printf("%d + %d = %d\n",a,b,a+b);
    return a+b;
}
float add_float(float a,float b)
{
    printf("%f + %f = %f\n",a,b,a+b);
    return a+b;
}
void unsupport()
{
    printf("unsupport type\n");
}



typedef struct Stu
{
    int ID;
    char *Name;
}S;

void add_stu(S x,S y)
{
    printf("%d",x.ID+y.ID);
}

#define ADD(x,y) _Generic((x),\
    /*S:add_stu(x,y),\*/\
    int:add_int(x,y),\
    float:add_float(x,y),\
    double:add_float((float)x,(float)y),\
    default:unsupport())





int main()
{
    int a = 0;
    S stu1;
    S b;
    S c;
    b.ID = 1;
    c.ID = 2;

    printf("%d\n", b.ID);

    ADD(1.0,2.1);
    ADD(1,2);
    // ADD(b, c);

    return 0;
}
```

想要重载，C 的答案是：不给你同名函数，但给你编译期选路。土法穷举也好，`_Generic` 也好，路子不同，终点一致——让一套名字服务一族类型。
