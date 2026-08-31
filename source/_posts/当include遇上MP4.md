---
title: 当 include 遇上 MP4
tags:
  - C语言
abbrlink: 5c100c97
date: 2023-09-30 18:03:00
---

一个大胆的实验：把写好的头文件 **GenShin.h 改名成 GenShin.mp4**，然后照常 `#include` 它，编译器会买账吗？

## 实验材料：这个"mp4"其实是纯文本

先用 `file` 命令验一下它的真身——`GenShin.mp4: C source, ASCII text`。它就是一个普普通通的头文件，只是后缀被改了：

```c GenShin.mp4
#ifndef __GenShin_H__
#define __GenShin_H__

#define NUM 114514 

#endif // !__GenShin_H__
```

## 实验代码

```c main.c
#include <stdio.h>
#include "GenShin.mp4"

int main()
{
    printf("%d\n", NUM);        // NUM 就来自上面这个"mp4"
    int num = 0;
    for(int* i = &num; ; i++)
    {
        printf("%p : %d\n", i, *i);
    }
    return 0;
}
```

编译通过，`printf` 打印出 **114514**——头文件里的宏在"mp4"里定义，在 main 里生效。

## 原理：include 只是文本复制

预处理器处理 `#include` 时只做一件事：**把目标文件的内容原样粘贴进来**，它从头到尾没有检查过扩展名。扩展名（.h/.hpp/.mp4）是给人看的标识，对预处理器来说一律是文本。

粘贴完成后，这段"mp4"的内容就变成了 main.c 的一部分：`#define NUM 114514` 正常生效，编译器看到的和 include 一个普通头文件没有任何区别。如果 GenShin.mp4 里是一段二进制数据，预处理器才会真的报错——因为它粘贴出来的内容里出现了非法 token。

## 附赠：顺着内存往上爬

后面的无限循环是顺带的实验——把 `num` 的地址取出来，让指针不断 `i++` 往高地址走，逐个打印每个地址上的值：

```c
for(int* i = &num; ; i++)
    printf("%p : %d\n", i, *i);
```

这相当于一个只读的"内存查看器"：栈帧、返回地址、上层函数的局部变量，都会一条条滚过屏幕。配合 CE 练习那篇，正好直观感受"变量就是内存里的一格"。

## 写在最后

这个实验的结论就一句话：**#include 不看文件名，只复制文本**。头文件不是什么特殊格式，任何文本文件都能被 include——当然，正式项目里还是老老实实用 .h 后缀，毕竟扩展名是给人看的导航。
