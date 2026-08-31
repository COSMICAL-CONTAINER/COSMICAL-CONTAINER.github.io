---
title: C语言 __attribute__ 实用指南
tags:
  - C语言
abbrlink: d21fddb
date: 2025-03-02 20:06:00
---

`__attribute__` 是 GCC 提供的编译器扩展语法，能给函数、变量、类型附加各种"特殊指令"。整理了几个日常实用的用法。

## 一、mode：自定义精确定宽的整数

```c
typedef unsigned int my_int1Type __attribute__((mode(QI)));   // 1 字节
typedef unsigned int my_int2Type __attribute__((mode(HI)));   // 2 字节

my_int1Type a = 255;
a++;        // 溢出回绕：255 + 1 = 0
```

QI/HI/SI/DI/TI 分别对应 1/2/4/8 字节宽度，相当于造出了"确定是 1 字节的 unsigned int"。

## 二、noreturn：告诉编译器这个函数不返回

```c
__attribute__((noreturn))
void test2()
{
    exit(0);    // 合法：确实没有 return
}
```

如果标记为 noreturn 的函数实际 return 了，编译器会给出警告。它还能帮助编译器消除"控制流到达函数末尾"之类的假警告。

## 三、packed：取消结构体字节对齐

```c
struct Test2
{
    char ch;
    int id;
    char sex;
    int age;
} __attribute__((packed));      // sizeof = 10（默认对齐是 16）
```

通信协议解析、文件格式映射时必须用 packed，否则结构体成员之间的填充字节会让强转映射错位。

## 四、unused：压制未使用警告

```c
static void __attribute__((unused)) unused_function2()
{
}
```

预留但暂时没调用的函数，加上它 `-Wall` 就不会再唠叨。

## 五、constructor：在 main 之前自动执行

```c
static __attribute__((constructor(101))) void before1() { printf("before1\n"); }
static __attribute__((constructor(102))) void before2() { printf("before2\n"); }
static __attribute__((constructor(103))) void before3() { printf("before3\n"); }
```

优先级数字越小越先执行，输出 before1、before2、before3——框架初始化、注册回调的经典手段。对应的还有 `destructor`，在 main 结束后执行。
