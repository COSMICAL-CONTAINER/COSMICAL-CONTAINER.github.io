---
title: Print.h 开发记（一）V1.0
tags:
  - C语言
series: C_Program-Print.h 开发记
abbrlink: 21fb8eaf
date: 2024-04-26 21:00:00
---

羡慕 Python 的 `print()` 吗？任意类型丢进去直接打印，不用记 `%d`、`%f`、`%s`。这个系列记录我用纯 C 实现一个万能 print 库的全过程——**项目已开源**：

> **GitHub**：<https://github.com/COSMICAL-CONTAINER/C_Program-Print.h>

这个系列会用一篇文章讲一个版本，从 V1.0 一直写到最新的 V1.8。本篇从 **V1.0** 讲起：它是怎么一步步搭起来的。

## V1.0 第一步：print.h 宏分发

C11 的 `_Generic` 是**编译期的类型选择器**：它不对表达式求值，只在编译阶段看一眼类型，然后"挑选"对应的答案——配合宏使用刚好零开销：

```c
_Generic(1, int: 10, double: 20, default: 0)     // 整个表达式的值是 10
_Generic(1.5, int: 10, double: 20, default: 0)   // 整个表达式的值是 20
```

有了它，思路就通了：对 `char` 调 `print_char`，对 `int` 调 `print_int`……把它包进宏里，就能根据传入类型自动匹配对应的打印函数：

```c
#define print(obj) (_Generic((obj),\
    char:        print_char,\
    short int:   print_short,\
    int:         print_int,\
    float:       print_float,\
    double:      print_double,\
    const char*: print_cstr,\
    char *:      print_str)(obj))

#define println(obj) (print(obj), print("\n"))
```

两个细节：

- **整个宏外面套了一层括号**：让 `_Generic(...)(obj)` 这种"先选择再调用"的结构成为一个完整的表达式，可以安全地出现在任何语句里
- 换行处的 `\` 是宏续行符，把多行内容合成一条宏定义

`println` 则用 **逗号表达式** 串起两个操作：先打印内容，再打印换行——逗号表达式从左到右依次求值，整个表达式取最后一项的值。

## V1.0 第二步：各类型的打印函数

每个类型一个薄封装，内部还是 printf，只是帮调用方记住了格式符：

```c
void print_char(char num)       { printf("%c", num); }
void print_short(short num)     { printf("%hd", num); }
void print_int(int num)         { printf("%d", num); }
void print_float(float num)     { printf("%f", num); }
void print_double(double num)   { printf("%lf", num); }
void print_cstr(const char *s)  { printf("%s", s); }
void print_str(char *s)         { printf("%s", s); }
```

## V1.0 第三步：使用

```c
#include "Print.h"

int main()
{
    int num1 = 1;
    float num4 = 4.0f;
    const char *str1 = "6";

    print(num1);    print(num4);    print(str1);
    println(num1);  println(str1);
    return 0;
}
```

编译运行，不同类型的变量一个 `print` 全搞定，不再需要记格式符。

## V1.0 埋下的伏笔

细心的朋友可能发现了：这些 `print_xxx` 函数**直接把函数体定义在了头文件里**。V1.0 阶段只有一个 main.c 引用它，相安无事；但只要两个 .c 文件同时 include 这个头文件，链接时就会报"函数重复定义"——这个坑直到 V1.7 才被正式填上，是后面故事的重要一环。

## V1.0 完整代码

```c Print.h
#ifndef __Print_H__
#define __Print_H__

#include <stdio.h>

#define print(obj) (_Generic((obj),\
    char:        print_char,\
    short int:   print_short,\
    int:         print_int,\
    float:       print_float,\
    double:      print_double,\
    const char*: print_cstr,\
    char *:      print_str)(obj))

#define println(obj) \
    (_Generic((obj),\
    char:        print_char,\
    short int:   print_short,\
    int:         print_int,\
    float:       print_float,\
    double:      print_double,\
    const char*: print_cstr,\
    char *:      print_str)(obj)    ,    print("\n"))

void print_char(char num)       { printf("%c", num); }
void print_short(short int num) { printf("%hd", num); }
void print_int(int num)         { printf("%d", num); }
void print_float(float num)     { printf("%f", num); }
void print_double(double num)   { printf("%lf", num); }
void print_cstr(const char *str){ printf("%s", str); }
void print_str(char *str)       { printf("%s", str); }

#endif // !__Print_H__
```


## 测试程序 main.c（V1.0）

```c main.c
#include "Print.h"

int main()
{
    int num1 = 1;
    short int num2 = 2;
    char num3 = '3';
    float num4 = 4.0f;
    double num5 = 5.0;
	const char *str1 = "6";
    char str2[] = "7";
    
    print(num1);
    print(num2);
    print(num3);
    print(num4);
    print(num5);
    print(str1);
    print(str2);
	print("\n");

    println(num1);
    println(num2);
    println(num3);
    println(num4);
    println(num5);
    println(str1);
    println(str2);

    return 0;
}
```

## 系列导航

- 下一篇：[Print.h 开发记（二）V1.2](/posts/78a2c4e1/)
