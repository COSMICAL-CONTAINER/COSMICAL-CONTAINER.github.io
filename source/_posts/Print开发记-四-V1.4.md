---
title: Print.h 开发记（四）V1.4
tags:
  - C语言
series: C_Program-Print.h 开发记
abbrlink: 4c8a91b3
date: 2024-04-28 20:00:00
---

> 系列导航：[上一篇：Print.h 开发记（三）V1.3](/posts/9d3e7f20/)

V1.4 是 print 库里程碑式的一版：`print` 和 `println` 从"一次只能打印一个"升级为**最多支持 10 个参数**——这就是 C 语言版的"重载"。

## 用法

```c
print(1, 2.5, "hello");          // 一次打印三个不同类型
println(num, str, 3.14);         // 多参数 + 自动换行
```

## 核心机制：参数计数宏

之前单独写过一篇[统计可变宏参数个数](/posts/4fdba115/)，讲的就是"占位符平移"技巧——先数出参数个数：

```c
#define PrintMacroArgCount(...) _PrintMacroArgCount(__VA_ARGS__, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1)
#define _PrintMacroArgCount(_0, _1, _2, _3, _4, _5, _6, _7, _8, _9, COUNT, ...) COUNT
```

真实参数会把后面的 10,9,8...往右挤，`COUNT` 落在几就代表有几个参数。

## 拼接：按个数生成函数链

拿到个数后，用拼接宏生成对应的"多参数版本"函数（`_print2`、`_print3`……`_print10`），每个版本内部逐个调用 `_print` 打印并处理间隔：

```c
#define PrintConcat(A, B) _PrintConcat(A, B)
#define _PrintConcat(A, B) A##B
```

这样 `print(1, 2.5, "hi")` 会展开成对 `_print3(1, 2.5, "hi")` 的调用，三个类型各走各的 `_Generic` 分支。

## 一个重命名

原 `print` 宏改名为 `_print`（单参数基础版），把 `print` 这个名字留给新的多参数入口——对外接口不变，内部分层清晰。


## V1.4 完整代码

```c Print.h
/**
 * @file Print.h
 * @author Cosmical Containter
 * @brief Print anything you want!
 * @version 1.4
 * @date 2024-04-25
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
 * 
 * V1.3
 * 增加颜色打印宏的输入格式，现在可以输入字符串或变量了
 * 
 * V1.4
 * 拓展print与println宏，以前只能输出1个参数，现在可以输入最多10个参数了
 */

#ifndef __Print_H__
#define __Print_H__

#include <stdio.h>
#include <string.h>

#define MAXSTRLEN 100

#define _print(obj) (_Generic((obj),\
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

#define _println(obj) _print(obj), _print("\n")


#define PrintMacroArgCount(...) _PrintMacroArgCount(__VA_ARGS__, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1)
#define _PrintMacroArgCount(_0, _1, _2, _3, _4, _5, _6, _7, _8, _9, COUNT, ...) COUNT

#define PrintConcat(A, B) _PrintConcat(A, B)
#define _PrintConcat(A, B) A##B

#define print(...) _print_(__VA_ARGS__)
#define _print_(...) PrintConcat(_print_, PrintMacroArgCount(__VA_ARGS__))(__VA_ARGS__)
#define _print_1(_0)                                           _print(_0)
#define _print_2(_0, _1)                                       _print_1(_0), _print(_1)
#define _print_3(_0, _1, _2)                                   _print_2(_0, _1), _print(_2)
#define _print_4(_0, _1, _2, _3)                               _print_3(_0, _1, _2), _print(_3)
#define _print_5(_0, _1, _2, _3, _4)                           _print_4(_0, _1, _2, _3), _print(_4)
#define _print_6(_0, _1, _2, _3, _4, _5)                       _print_5(_0, _1, _2, _3, _4), _print(_5)
#define _print_7(_0, _1, _2, _3, _4, _5, _6)                   _print_6(_0, _1, _2, _3, _4, _5), _print(_6)
#define _print_8(_0, _1, _2, _3, _4, _5, _6, _7)               _print_7(_0, _1, _2, _3, _4, _5, _6), _print(_7)
#define _print_9(_0, _1, _2, _3, _4, _5, _6, _7, _8)           _print_8(_0, _1, _2, _3, _4, _5, _6, _7), _print(_8)
#define _print_10(_0, _1, _2, _3, _4, _5, _6, _7, _8, _9)      _print_9(_0, _1, _2, _3, _4, _5, _6, _7, _8), _print(_9)


#define println(...) _println_(__VA_ARGS__)
#define _println_(...) PrintConcat(_println_, PrintMacroArgCount(__VA_ARGS__))(__VA_ARGS__)
#define _println_1(_0)                                           _println(_0)
#define _println_2(_0, _1)                                       _println_1(_0), _println(_1)
#define _println_3(_0, _1, _2)                                   _println_2(_0, _1), _println(_2)
#define _println_4(_0, _1, _2, _3)                               _println_3(_0, _1, _2), _println(_3)
#define _println_5(_0, _1, _2, _3, _4)                           _println_4(_0, _1, _2, _3), _println(_4)
#define _println_6(_0, _1, _2, _3, _4, _5)                       _println_5(_0, _1, _2, _3, _4), _println(_5)
#define _println_7(_0, _1, _2, _3, _4, _5, _6)                   _println_6(_0, _1, _2, _3, _4, _5), _println(_6)
#define _println_8(_0, _1, _2, _3, _4, _5, _6, _7)               _println_7(_0, _1, _2, _3, _4, _5, _6), _println(_7)
#define _println_9(_0, _1, _2, _3, _4, _5, _6, _7, _8)           _println_8(_0, _1, _2, _3, _4, _5, _6, _7), _println(_8)
#define _println_10(_0, _1, _2, _3, _4, _5, _6, _7, _8, _9)      _println_9(_0, _1, _2, _3, _4, _5, _6, _7, _8), _println(_9)

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

// 下面是处理各种类型转字符串
const char* str_comb(const char *str1, const char *str2)
{
    static char str[MAXSTRLEN];
    strcpy(str, str1);
    strcat(str, str2);
    return str;
}

const char* char2str(char ch)
{
    static char str[2];
    str[0] = ch;
    str[1] = '\0';
    return str;
}

const char* short2str(short num)
{
    static char str[6];
    sprintf(str, "%hd", num);
    return str;
}

const char* int2str(int num)
{
    static char str[11];
    sprintf(str, "%d", num);
    return str;
}

const char* float2str(float num)
{
    static char str[11];
    sprintf(str, "%f", num);
    return str;
}

const char* double2str(double num)
{
    static char str[21];
    sprintf(str, "%lf", num);
    return str;
}

const char* ulonglong2str(unsigned long long num)
{
    static char str[21];
    sprintf(str, "%llu", num);
    return str;
}

const char* str2str(const char* str)
{
    return str;
}

// #define NONE(str)          str"\033[m"
// #define RED(str)           "\033[0;32;31m"NONE(str)
// #define LIGHT_RED(str)     "\033[1;31m"NONE(str)
// #define GREEN(str)         "\033[0;32;32m"NONE(str)
// #define LIGHT_GREEN(str)   "\033[1;32m"NONE(str)
// #define BLUE(str)          "\033[0;32;34m"NONE(str)
// #define LIGHT_BLUE(str)    "\033[1;34m"NONE(str)
// #define DARY_GRAY(str)     "\033[1;30m"NONE(str)
// #define CYAN(str)          "\033[0;36m"NONE(str)
// #define LIGHT_CYAN(str)    "\033[1;36m"NONE(str)
// #define PURPLE(str)        "\033[0;35m"NONE(str)
// #define LIGHT_PURPLE(str)  "\033[1;35m"NONE(str)
// #define YELLOW(str)        "\033[0;33m"NONE(str)
// #define LIGHT_YELLOW(str)  "\033[1;33m"NONE(str)
// #define LIGHT_GRAY(str)    "\033[0;37m"NONE(str)
// #define WHITE(str)         "\033[1;37m"NONE(str)

#define TOSTR(obj) (_Generic((obj),\
    char:		        char2str,\
    short int:	        short2str,\
    int:		        int2str,\
    float:		        float2str,\
    double:		        double2str,\
    const char*:        str2str,\
	char *:		        str2str,\
    unsigned long long: ulonglong2str,\
    default:            print_error\
    )(obj))

#define RED(obj)           (str_comb(str_comb("\033[0;32;31m",TOSTR(obj)),"\033[m"))
#define LIGHT_RED(obj)     (str_comb(str_comb("\033[1;31m"   ,TOSTR(obj)),"\033[m"))
#define GREEN(obj)         (str_comb(str_comb("\033[0;32;32m",TOSTR(obj)),"\033[m"))
#define LIGHT_GREEN(obj)   (str_comb(str_comb("\033[1;32m"   ,TOSTR(obj)),"\033[m"))
#define BLUE(obj)          (str_comb(str_comb("\033[0;32;34m",TOSTR(obj)),"\033[m"))
#define LIGHT_BLUE(obj)    (str_comb(str_comb("\033[1;34m"   ,TOSTR(obj)),"\033[m"))
#define DARY_GRAY(obj)     (str_comb(str_comb("\033[1;30m"   ,TOSTR(obj)),"\033[m"))
#define CYAN(obj)          (str_comb(str_comb("\033[0;36m"   ,TOSTR(obj)),"\033[m"))
#define LIGHT_CYAN(obj)    (str_comb(str_comb("\033[1;36m"   ,TOSTR(obj)),"\033[m"))
#define PURPLE(obj)        (str_comb(str_comb("\033[0;35m"   ,TOSTR(obj)),"\033[m"))
#define LIGHT_PURPLE(obj)  (str_comb(str_comb("\033[1;35m"   ,TOSTR(obj)),"\033[m"))
#define YELLOW(obj)        (str_comb(str_comb("\033[0;33m"   ,TOSTR(obj)),"\033[m"))
#define LIGHT_YELLOW(obj)  (str_comb(str_comb("\033[1;33m"   ,TOSTR(obj)),"\033[m"))
#define LIGHT_GRAY(obj)    (str_comb(str_comb("\033[0;37m"   ,TOSTR(obj)),"\033[m"))
#define WHITE(obj)         (str_comb(str_comb("\033[1;37m"   ,TOSTR(obj)),"\033[m"))

#define TestColor(obj)\
{\
    _println(RED(obj));\
    _println(LIGHT_RED(obj));\
    _println(GREEN(obj));\
    _println(LIGHT_GREEN(obj));\
    _println(BLUE(obj));\
    _println(LIGHT_BLUE(obj));\
    _println(CYAN(obj));\
    _println(LIGHT_CYAN(obj));\
    _println(PURPLE(obj));\
    _println(LIGHT_PURPLE(obj));\
    _println(YELLOW(obj));\
    _println(LIGHT_YELLOW(obj));\
    _println(DARY_GRAY(obj));\
    _println(LIGHT_GRAY(obj));\
    _println(WHITE(obj));\
}
#define TestColur TestColor

void print_error(void *data)
{
    _println(RED( "print error!" ));
    _println(RED( "don't have this type to print!" ));
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

#endif // !__Print_H__
```


## 测试程序 main.c（V1.4）

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

    TestColor(num5);

    print(num1, num2, num3, num4, num5, "123", 'y');
    println(str1, str2, RED("c"));

    return 0;
}
```

## 系列导航

- 上一篇：[Print.h 开发记（三）V1.3](/posts/9d3e7f20/)
- 下一篇：[V1.5 覆盖基础类型](/posts/5b7d3e60/)
