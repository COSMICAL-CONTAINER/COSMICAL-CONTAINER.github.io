---
title: C语言可变参数实战
tags:
  - C语言
  - 指针
abbrlink: 741a54db
date: 2024-04-07 13:58:00
---

printf 是怎么做到接受任意多个参数的？答案是 `stdarg.h` 里的三件套：`va_list`、`va_start`、`va_arg`。写了一个按格式符消费可变参数的实验，还能顺便理解"参数是怎么传进去的"。

## 核心机制

```c
char *handle(char* format, ...)
{
    va_list args;
    va_start(args, format);      // 从 format 之后开始读参数

    while(*format)
    {
        if(*format == '%')
        {
            switch(*(format + 1))
            {
                case 'c':
                case 'd':
                    va_arg(args, int);        // 按 int 取
                    break;
                case 'f':
                case 'l':
                    va_arg(args, double);     // 按 double 取
                    break;
                case 's':
                    va_arg(args, char *);     // 按指针取
                    break;
            }
            format++;    // 跳过格式符
        }
        format++;
    }
    va_end(args);
    return result;
}
```

## 关键认知

**`va_arg(args, type)` 的第二参数决定怎么"解读"栈上的数据**——这正是下面这个实验的伏笔：同一个 4 字节，用 int 取和用 float 取，结果天差地别。可变参数函数没有任何类型检查，格式符和实参类型不匹配就是未定义行为，printf 的 `%d` 打印浮点数之所以乱码，就是这个原理。

另外可变参数从前往后逐个消费，参数个数全靠格式符约定——`printf` 的格式串就是一份"参数说明书"。
