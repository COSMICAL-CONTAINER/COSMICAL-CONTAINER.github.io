---
title: 给 printf 添加自定义格式符
tags:
  - C语言
  - 指针
abbrlink: a46545f1
date: 2024-06-23 16:15:00
---

printf 的 `%d`、`%f` 是写死的，想直接打印自己定义的结构体怎么办？比如复数 `Imaginary`、分数 `Fraction`。实验了一个方案：**给 printf 加上自定义格式符**，注册之后就能写 `%I` 直接打印复数。

## 背景：rt_printf 是什么

实验基于 **RT-Thread（RTT，国产实时操作系统）** 的打印实现 `rt_printf` 改造——接口和标准 printf 一致，但更轻量，是嵌入式圈里常用的东西。项目的文件结构：

- `rt_printf.c / rt_printf.h`：打印核心（本次改造的对象）
- `mprintf_argc.h`：自定义格式符的注册宏（`__mprint_argc__`）
- `main.c`：使用示例

## 用法

```c
typedef struct Imaginary
{
    float real;
    float image;
} ImaginaryTypedef;

// 注册：'I' 这个格式符由 Imaginary2str 函数负责打印
__mprint_argc__('I', Imaginary2str);

int main()
{
    ImaginaryTypedef ia;
    ia.real = 3.3;
    ia.image = 2.2;

    rt_printf("123%d %.2f %I %I %d\n", 2355, 1.253, &ia, &ia, 000);
    return 0;
}
```

输出：`1232355 1.25 3.30+2.20i 3.30+2.20i 0`——内置格式符和自定义格式符混用无碍。

## 实现思路

- 每个自定义格式符对应一个**注册项**：字符 + 打印函数（约定接口 `char* xxx(void* data)`，接收结构体指针，返回格式化好的字符串）
- `rt_printf` 内部遍历格式串时，遇到未注册的内置符走 `vsnprintf` 的常规路径，遇到**自定义符就查注册表**，用函数指针把结构体转成字符串
- 参数按约定全部以指针传入（`&ia`），函数内部再强转回具体结构体类型

## 价值

这个模式本质是**运行时的多态分发**：打印逻辑和类型解耦。给"不支持的类型扩展打印能力"这个需求，在 C 里的标准答案就是"注册回调 + 分发"，比硬改 printf 源码优雅得多。
