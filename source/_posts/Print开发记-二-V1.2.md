---
title: Print.h 开发记（二）V1.2
tags:
  - C语言
series: C_Program-Print.h 开发记
categories:
  - Print.h 开发记
abbrlink: 78a2c4e1
date: 2024-04-27 21:00:00
---

> 系列导航：[上一篇：Print.h 开发记（一）V1.0](/posts/21fb8eaf/)

V1.2 是第一个"补课"版本：修掉 V1.0 遗留的 bug，同时一口气加入了好几个打印能力。

## 本版更新

- 修复 V1.0 遗留的 bug
- 加入 `unsigned long long` 的打印格式
- 加入**打印数组**功能，可以自选数组中每两个元素的打印格式
- 加入不支持的格式错误处理
- 加入**颜色打印代码**

## 无符号长长整型

```c
void print_ulonglong(unsigned long long num)   { printf("%llu", num); }
```

`%llu` 对应 64 位无符号整型，配合 `_Generic` 分发表新增一个分支即可。

## 数组打印

数组打印支持**自定义元素之间的分隔方式**，一共三种：空格隔开、换行隔开、或者"下标 + 值"逐行打印，由调用方传一个模式常量决定——打印 int 数组和打印字符串数组都能得到好看的结果：

```c
#define printArrTypeSpace 0    // 元素之间用空格隔开
#define printArrTypeln    1    // 元素之间用换行符隔开
#define printArrTypeName  2    // 打印数组元素和元素下标
```

## 错误处理

传入不支持的格式时不再静默输出，而是给出错误提示，避免"看起来打印成功了其实什么都没打"的迷惑行为。

## 颜色打印

```c
#define NONE(str)          str      "\033[m"
#define RED(str)           "\033[0;32;31m"NONE(str)
#define GREEN(str)         "\033[0;32;32m"NONE(str)
#define BLUE(str)          "\033[0;32;34m"NONE(str)
#define CYAN(str)          "\033[0;36m"NONE(str)
```

原理是 ANSI 转义序列：`\033[0;32;31m` 把终端切换到红色前景，`\033[m` 复位。这让库的输出第一次有了"彩色"。


## V1.2 完整代码

```c Print.h
/**
 * @file Print.h
 * @author Cosmical Containter
 * @brief Print anything you want!
 * @version 1.2
 * @date 2024-01-05
 * 
 * @copyright Copyright (c) 2024
 * 
 * @see
 * V1.0 
 * 完成基础功能，实现对基础类型char、short int、int、float、double、const char *、char *的打印
 * 
 * V1.1
 * 尝试不调用函数直接展开-失败
 * 
 * V1.2
 * 加入unsigned long long 的打印格式
 * 加入打印函数功能，可以自选打印格式
 * 加入不支持的格式错误处理
 * 加入颜色打印代码
 */

#ifndef __Print_H__
#define __Print_H__

#include <stdio.h>
#include <string.h>

#define print(obj) (_Generic((obj),\
    char:		        print_char,\
    short int:	        print_short,\
    int:		        print_int,\
    float:		        print_float,\
    double:		        print_double,\
    const char*:        print_cstr,\
	char *:		        print_str,\
    unsigned long long: print_ulonglong,\
    default:            print_error\
    )(obj))

#define println(obj) {print(obj); printf("\n");}

void print_char(char num)
{
    printf("%c", num);
}

void print_short(short int num)
{
    printf("%hd", num);
}

void print_int(int num)
{
    printf("%d", num);
}

void print_ulonglong(unsigned long long num)
{
    printf("%llu", num);
}

void print_float(float num)
{
    printf("%f", num);
}

void print_double(double num)
{
    printf("%lf", num);
}

void print_cstr(const char *str)
{
    printf("%s", str);
}

void print_str(char *str)
{
    printf("%s", str);
}

#define NONE(str) str      "\033[m"
#define RED(str)           "\033[0;32;31m"NONE(str)
#define LIGHT_RED(str)     "\033[1;31m"NONE(str)
#define GREEN(str)         "\033[0;32;32m"NONE(str)
#define LIGHT_GREEN(str)   "\033[1;32m"NONE(str)
#define BLUE(str)          "\033[0;32;34m"NONE(str)
#define LIGHT_BLUE(str)    "\033[1;34m"NONE(str)
#define DARY_GRAY(str)     "\033[1;30m"NONE(str)
#define CYAN(str)          "\033[0;36m"NONE(str)
#define LIGHT_CYAN(str)    "\033[1;36m"NONE(str)
#define PURPLE(str)        "\033[0;35m"NONE(str)
#define LIGHT_PURPLE(str)  "\033[1;35m"NONE(str)
#define YELLOW(str)        "\033[0;33m"NONE(str)
#define LIGHT_YELLOW(str)  "\033[1;33m"NONE(str)
#define LIGHT_GRAY(str)    "\033[0;37m"NONE(str)
#define WHITE(str)         "\033[1;37m"NONE(str)

#define TestColor(str)\
{\
    println(RED         (str));\
    println(LIGHT_RED   (str));\
    println(GREEN       (str));\
    println(LIGHT_GREEN (str));\
    println(BLUE        (str));\
    println(LIGHT_BLUE  (str));\
    println(CYAN        (str));\
    println(LIGHT_CYAN  (str));\
    println(PURPLE      (str));\
    println(LIGHT_PURPLE(str));\
    println(YELLOW      (str));\
    println(LIGHT_YELLOW(str));\
    println(DARY_GRAY   (str));\
    println(LIGHT_GRAY  (str));\
    println(WHITE       (str));\
}
#define TestColur TestColor

void print_error(void *data)
{
    println(RED( "print error!" ));
    println(RED( "don't have this type to print!" ));
}

#define printArrTypeSpace 0
#define printArrTypeln    1
#define printArrTypeName  2

#define GET_ARR_LEN(arrobj) \
	(_Generic((arrobj),\
    char *:		  strlen((const char *)arrobj),\
    default:      (sizeof(arrobj) / sizeof(arrobj[0]))\
    ))

#define printArr(ArrName, type) {     \
    for (int i = 0; i < GET_ARR_LEN(ArrName); i++)    \
    {                                       \
        if(type == printArrTypeName)        \
        {                                   \
            print(#ArrName);                \
            print("[");                     \
            print(i);                       \
            print("] = ");                  \
            println(ArrName[i]);            \
        }                                   \
        else                                \
        {                                   \
            print(ArrName[i]);              \
            if(type)    print("\n");        \
            else        print(" ");         \
        }                                   \
    }                                       \
}

#define printlnArr(ArrName, type) {printArr(ArrName, type); print("\n");}

// void print_char(char num);
// void print_short(short int num);
// void print_int(int num);
// void print_float(float num);
// void print_double(double num);
// void print_cstr(const char *str);
// void print_str(char *str);

#endif // !__Print_H__
```


## 测试程序 main.c（V1.2）

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

    int num[10] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    char ccl[10] = "ccl";

    println(GET_ARR_LEN(num));
    printlnArr(num, printArrTypeSpace);

    println(GET_ARR_LEN(ccl));
    printlnArr(ccl, printArrTypeSpace);

    println(GET_ARR_LEN("987654321"));

    int *p = 0;
    print(p);

    TestColor("ccl is a boy");

    return 0;
}
```

## 系列导航

- 上一篇：[Print.h 开发记（一）V1.0](/posts/21fb8eaf/)
- 下一篇：[V1.3 颜色宏支持变量](/posts/9d3e7f20/)
