---
title: const 也能被修改
tags:
  - C语言
  - 指针
abbrlink: aaae083d
date: 2025-02-26 14:48:00
---

`const` 修饰的变量真的不能改吗？用指针强转试试就知道——答案是：**至少局部变量可以**。

## 实验

```c
const unsigned char const_int = 0;
printf("before :%d\n", const_int);
*(int *)(&const_int) = 10;              // 强转掉 const 再写入
printf("after  :%d\n", const_int);      // 输出 10！

const unsigned char const_array[] = {0x01, 0x02, 0x03, 0x04, 0x05};
*((int *)(&const_array[0] + i)) = 10;   // 数组同理，逐个元素改掉
```

运行结果 `before` 是 0，`after` 变成了 10——const 声明被绕过去了。

## 原理

`const` 只是**编译期的约束**，告诉编译器"不允许通过这个名字赋值"，它并不是内存的写保护。局部 const 变量放在栈上，和普通变量没有本质区别，所以把它的地址强转成普通指针后照改不误。

但注意：**这个玩法有边界**：

- 全局/静态 const 变量通常放在只读数据段（.rodata），强转写入会直接段错误
- 编译器可能对 const 做优化（比如把值内联到使用处），这时通过指针改内存，`printf` 读到的可能还是旧值——这就是未定义行为的"乐趣"

## 正经的用途

这种写法正经场合只有一个：**调用不接受 const 的老接口**时临时去掉限定（如 `free((void *)ptr)` 的历史遗留），改数据千万别这么干。真正的写保护要靠 MMU 的页权限，那才是硬件级别的 const。
