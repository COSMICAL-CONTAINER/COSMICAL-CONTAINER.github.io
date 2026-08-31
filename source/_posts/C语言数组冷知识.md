---
title: C语言数组冷知识
tags:
  - C语言
abbrlink: 3623a4d9
date: 2024-08-22 20:12:00
---

这次分享几个数组的冷门玩法：柔性数组、负数下标和复合字面量。

## 一、柔性数组：通信数据包神器

```c
struct package
{
    int version;
    int size;
    char data[0];       // 柔性数组（C99 标准写法是 char data[]）
};
```

`data[0]` 不占任何空间，`sizeof(struct package)` 只有 8 字节（两个 int）。用法是一次性 malloc 出"结构体 + 数据"的连续内存：

```c
my_package = malloc(sizeof(struct package) + data_len);
my_package->version = 1;
my_package->size = data_len;
for (int i = 0; i < data_len; i++)
    my_package->data[i] = 'a' + i;
```

这样包头和数据在一块内存里，一次 free 就能释放，序列化网络包时直接整块发送——网络协议和内核代码里到处都是这种写法。

## 二、数组下标可以是负数

```c
int array[] = {1, 2, 3, 4, 5};
int *p = &array[-1];

printf("%d\n", p[1]);       // 输出 array[0]，也就是 1
```

`p[1]` 等价于 `*(p + 1)`，而 `p` 指向 `array[-1]` 的位置，所以 `p[1]` 就是 `array[0]`。下标本质只是指针偏移，正负都合法——只要别越界访问到没分配的内存。

## 三、复合字面量玩数组

```c
(int[][1][1][1]){1, 2}      // 临时构造一个数组
(int[]){1}                  // 一维临时数组
(void* []){a}               // 临时指针数组
```

复合字面量（C99）可以在表达式里直接造数组，配合下标能玩出很多花样，比如 `(int* []){a}[0][0]` 就是 `a[0]`。调试指针和数组关系的时候挺好用。

## 写在最后

柔性数组是这几个里面唯一"正经推荐用于生产"的写法，负下标和复合字面量属于了解即可——知道有这么回事，读别人代码不慌。

## 完整代码

```c C语言数组冷知识.c
#include <stdio.h>
#include <stdlib.h>

// 柔性数组，用于通信数据包处理
struct package
{
    int version;
    int size;
    char data[0];
};
struct package* my_package;

int main()
{
    int data_len = 26;

    // 实际上就占用8个字节(2个int)
    printf("sizeof(struct package) = %I64d\n", sizeof(struct package));
    my_package = malloc(sizeof(struct package) + data_len * sizeof(char));

    my_package->version = 1;
    my_package->size = data_len;
    
    for (int i = 0; i <= data_len; i++)
    {
        my_package->data[i] = (i == data_len ? '\0' : 'a' + i);
    }

    printf("%s\n", my_package->data);

    // 数组引用可以使用-1
    int array[] = {1, 2, 3, 4, 5};
    int *p = &array[-1];

    printf("%d\n", p[1]);

    // 强转数组类型
    // int a[2] = {123, 234};
    // printf("%p\n", (int[][1][1][1]){1,2}[0][0][0]);
    // printf("%p\n", (int[][1][1][1]){1}[0][0]);
    // printf("%p\n", (int[][1][1][1]){1}[0]);
    // printf("%p\n", (int[][1][1][1]){1});
    // printf("%p\n", (int[]){1});

    // printf("%p\n", a);

    // printf("%p\n", (void* []){a}[0]);
    // printf("%p\n", (void* []){a}[1]);
    // printf("%p\n", (void* []){a}[2]);

    // printf("%d\n", (int* []){a}[0][0]);
    // printf("%d\n", (int* []){a}[0][1] - (int* []){a}[0][0]);
    // printf("%d\n", *(int *)(void* []){a}[0] - ((int* []){a, a}[1])[1]);


    return 0;
}
```



