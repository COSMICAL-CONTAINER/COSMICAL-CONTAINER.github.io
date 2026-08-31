---
title: C语言位域：把变量拆成二进制位看
tags:
  - C语言
abbrlink: 8e3c5b70
date: 2024-08-06 14:50:00
---

调试的时候经常想看一个变量**在内存里的二进制到底长什么样**——特别是学 float 的 IEEE 754 表示、研究位运算的时候。这个需求用 C 语言的**位域（bit field）+ 联合体（union）**就能优雅解决，我做成了一个测试库并开源：

> **GitHub**：<https://github.com/COSMICAL-CONTAINER/C_Program-Test.h>

## 思路：union + 位域

核心是一对搭档：

- **union**：让同一块内存既能按整体读写（`all`），又能按位读写（`decode`）
- **位域**：把一个字节拆成 8 个 1 bit 的成员

char 的拆解结构：

```c
typedef struct _data_char_structTypDef
{
    unsigned char bit0 : 1;
    unsigned char bit1 : 1;
    // ... bit2 ~ bit6
    unsigned char bit7 : 1;
} data_char_structTypeDef;

typedef union _data_char_union
{
    unsigned char all;                  // 整体读写
    data_char_structTypeDef decode;     // 按位读写
} data_char_unionTypeDef;
```

int/float 等 32 位类型则是 4 个 char 联合体的嵌套（byte0~byte3，每个 byte 再拆 8 位）。

## 解码函数

```c
void decode_char(char data_char)
{
    data_char_unionTypeDef char_union;
    char_union.all = data_char;
    printf("%d",  char_union.decode.bit7);   // 最高位先打印
    printf("%d ", char_union.decode.bit4);
    // ... bit3 ~ bit0
}
```

使用：

```c
char char_A = 'A';
decode_char(char_A);    // 'A' = 65 = 01000001
```

## 不止能看，还能改

union 的好处是**双向的**：按位置 1 之后，读 `all` 就是改好的值：

```c
int a = 0;
data_int_unionTypeDef u;
u.all = a;
u.decode.byte0.decode.bit0 = 1;    // 把第 0 位置 1
u.decode.byte1.decode.bit1 = 1;    // 第 9 位置 1
u.decode.byte2.decode.bit2 = 1;    // 第 18 位置 1
u.decode.byte3.decode.bit3 = 1;    // 第 27 位置 1
a = u.all;
printf("%d\n", a);                 // 0 + 1 + 512 + 262144 + 134217728
```

## float 的 IEEE 754 查看

float 在内存里就是 4 个字节的 IEEE 754 编码。把它按 int 的位域解读，符号位、指数、尾数一目了然：

```c
float f = 123456789.123456789;
u.all = *(int *)&f;      // 把 float 的位模式按 int 解读
decode_int(u.all);
```

## 效果图

![位域测试库运行效果](test.png)

## 说明

- 解码顺序是 bit7 → bit0（符合二进制的书写习惯）
- 只依赖标准库，GCC / MSVC 都能编译
- 已开源：<https://github.com/COSMICAL-CONTAINER/C_Program-Test.h>
