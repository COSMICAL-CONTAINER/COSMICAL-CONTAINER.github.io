---
title: C语言静态库实战：字符串查找运算符函数
tags:
  - C语言
  - 函数指针
abbrlink: 18180a87
date: 2024-03-31 14:39:00
---

把四则运算做成一个静态库，调用方式很优雅——**用字符串找运算符函数**：

项目共三个文件：`static.h`（库的接口声明）、`static.c`（实现）、`main.c`（调用示例）。

```c
#include "static.h"

int main()
{
    double result;
    result = getoptFunction("+")(1.9, 2);
    printf("%lf\n", result);

    result = getoptFunction("-")(1.9, 2);
    printf("%lf\n", result);

    result = getoptFunction("**")(1.9, 2);   // 自定义的幂运算
    printf("%lf\n", result);
    return 0;
}
```

`getoptFunction` 接收运算符字符串，返回对应的**函数指针**，随后立即调用——两行完成一次"解释执行"。

## static.h 里有什么

接口声明全部在 `static.h` 里，有三个值得说的细节：

```c
#define LIBRARYNAME MyMath
#define __CONCAT(a, b) a##_##b
#define __namespace(a, b) __CONCAT(a, b)

typedef __LIBRARYTYPE (*p_opertorFun)(__LIBRARYTYPE num1, __LIBRARYTYPE num2);

__LIBRARYTYPE __namespace(LIBRARYNAME, add)(__LIBRARYTYPE num1, __LIBRARYTYPE num2);
// 同理还有 MyMath_sub / MyMath_mul / MyMath_div / MyMath_pow / MyMath_errorOpt

p_opertorFun getoptFunction(const char* opertor);
```

- `__namespace(LIBRARYNAME, add)` 用拼接宏把库名和函数名拼成 `MyMath_add`，避免和其他库的函数重名
- `p_opertorFun` 统一了所有运算符函数的签名：`double f(double, double)`
- 对外只暴露 `getoptFunction` 一个入口，实现细节全部藏在 static.c

## 库的内部

```c
typedef double (*opt_fun)(double, double);

opt_fun getoptFunction(const char *op)
{
    if (strcmp(op, "+") == 0)  return opt_add;
    if (strcmp(op, "-") == 0)  return opt_sub;
    if (strcmp(op, "*") == 0)  return opt_mul;
    if (strcmp(op, "/") == 0)  return opt_div;
    if (strcmp(op, "**") == 0) return opt_pow;   // 自定义幂运算
    return NULL;
}
```

## 编译成静态库

```bash
gcc -c static.c -o static.o          # 编译成目标文件
ar rcs libmymath.a static.o          # 打包成静态库
gcc main.c -L. -lmymath -o main      # 链接静态库编译 main
```

使用方拿到的就是干干净净的一个 `libmymath.a` 加一份 `static.h`。


## 收获

- **函数指针表 + 字符串查表** 是实现"解释器""命令分发"的基础套路
- 静态库把实现和接口分离，头文件即文档
- 想扩展新运算符，只需要在库内部加一个分支，调用方代码零改动
