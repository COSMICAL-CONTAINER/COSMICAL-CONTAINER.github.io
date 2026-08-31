---
title: Print.h 开发记（三）V1.3
tags:
  - C语言
series: C_Program-Print.h 开发记
abbrlink: 9d3e7f20
date: 2024-04-28 10:00:00
---

> 系列导航：[上一篇：Print.h 开发记（二）V1.2](/posts/78a2c4e1/)

V1.3 的更新只有一个主题，但很关键：**颜色打印宏的输入格式拓展**——现在既可以直接传字符串字面量，也可以传变量了。

## V1.2 的限制

V1.2 的颜色宏内部是字符串拼接：

```c
#define RED(str) "\033[0;32;31m"NONE(str)
```

`NONE(str)` 是 `str "\033[m"`——相邻字符串字面量的编译期拼接。这意味着 `RED("hello")` 没问题，但 `RED(some_var)` 直接编译报错：变量不是字符串字面量，没法参与拼接。

## V1.3 的解决

新版本把"上色"和"打印"拆开：宏只负责生成转义序列与内容的组合，内容由 printf 的 `%s` 输出——变量自然也就支持了。同时引入 `MAXSTRLEN 100` 限制单段彩色文本的最大长度，内部用缓冲区拼接，避免溢出。

## 顺带的修正

这一版还规范了头文件：加入了 `MAXSTRLEN` 的定义、整理了颜色宏的排版。版本日志里那句"拓展颜色打印宏，现在可以支持输入字符串或变量了"说的就是这个。


## V1.3 完整代码

```c Print.h
/**
 * @file Print.h
 * @author Cosmical Containter
 * @brief Print anything you want!
 * @version 1.3
 * @date 2024-04-06
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
 */

#ifndef __Print_H__
#define __Print_H__

#include <stdio.h>
#include <string.h>

#define MAXSTRLEN 100

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
    println(RED(obj));\
    println(LIGHT_RED(obj));\
    println(GREEN(obj));\
    println(LIGHT_GREEN(obj));\
    println(BLUE(obj));\
    println(LIGHT_BLUE(obj));\
    println(CYAN(obj));\
    println(LIGHT_CYAN(obj));\
    println(PURPLE(obj));\
    println(LIGHT_PURPLE(obj));\
    println(YELLOW(obj));\
    println(LIGHT_YELLOW(obj));\
    println(DARY_GRAY(obj));\
    println(LIGHT_GRAY(obj));\
    println(WHITE(obj));\
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

#endif // !__Print_H__
```


## 测试程序 main.c（V1.3）

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

    return 0;
}
```

## 系列导航

- 上一篇：[Print.h 开发记（二）V1.2](/posts/78a2c4e1/)
- 下一篇：[V1.4 print 与 println 支持多参数](/posts/4c8a91b3/)
