---
title: C-返回值为函数指针的函数
tags:
  - C语言
abbrlink: a049fc87
date: 2022-11-25 15:27:52
---

返回值为函数指针的函数  
本质上是一个函数，返回值为函数指针

```c
#include<stdio.h>

int (*drink(void)) (void)
{
    static int i;
    i++;
    printf("(%d)\n", i);
    return (int(*)(void))drink;
}

int main()
{
    drink()();
    return 0;
}
```

运行结果如下：

![运行结果](aa8460cf456441bf837d5e35a681593b.png)

那能否实现一直调用下去呢？  
求大佬写一个能运行 drink()()()()()()()()()()() 的代码
