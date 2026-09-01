---
title: BigInterge 开发记：当 long long 装不下的时候
tags:
  - C语言
  - 算法
  - 字符串
abbrlink: 4d6809c9
date: 2023-08-31 16:00:00
---

`long long` 最大能存 9223372036854775807，十九位。想算 29 位数除以 26 位数？没有现成的类型能装。2023 年 3 月 8 日我开了这个项目：用字符串存数字，把小学竖式翻译成 C 代码，实现大整数的加减乘除。完整源码在 GitHub 的 [Mathematics-System](https://github.com/COSMICAL-CONTAINER/Mathematics-System) 仓库里，和矩阵库 Matrix 住在一个屋檐下。文件夹里的更新记录原话是这么写的：

> 📌 更新（2026-08-31）：为写这篇重新编译复现了全部输出（含那段 `gets` 输入），运行效果一节均为 2026 年的真实运行记录。

```text
2023.3.8
完成基础加减乘除运算，并进行基本的封装，实现了对象池，方便最后统一销毁对象
2023.8.31
重新捡起烂摊子，装备可以多文件英文路径调试的g++调试器，修复几个小bug
```

半年后捡起来继续打磨，就有了这篇文章里的最终形态。

## 数据结构：一个字符串加一个符号

大整数本体是一个朴素的结构体——数字的绝对值用字符串存，符号单独一位：

```c
typedef enum __Positive_negative
{
    BIS_Positive,
    BIS_Negative
}BigIntergeSign;

typedef struct __BigInterge
{
    BigIntergeSign      sign_member;
    String              num_member;
    unsigned long long  digit_capacity_member;
}BigInterge;
```

这里的 `String` 是自己起的别名——`typedef char* String`，配了三个小工具函数（初始化、追加字符、追加 n 个字符）。别小看"追加 n 个字符"这个函数，它在除法里要负责造 10 的幂。

`BigIntergeInit` 负责解析输入：开头可以有 `+`/`-`，其余必须是数字，符号剥下来存进 `sign_member`，剩下的纯数字串就是 `num_member`。**符号和数值分开存**是整个设计里最重要的决定——后面所有四则运算都建立在"先算绝对值，再管符号"之上。

## 加法：把小学竖式翻译成代码

字符串存数字有个天然的不方便：竖式是从低位往高位算的，而字符串的高位在前面。所以 add 的第一步是**把两个数整个反转**，再在尾部补一个 '0'（预留最高位进位）：

```c
char num1str[len1 + 1 + 1];//一个1是最前面加多一个0 还有一个1是储存最后的'\0'
char num2str[len2 + 1 + 1];
for(int i = len1 - 1; i >= 0; i--)
{
    num1str[len1 - i - 1] = num1[i];
}
num1str[len1] = '0';
num1str[len1 + 1] = '\0';
```

反转之后，竖式的每一列就是数组的一个下标。逐位相加，大于等于 10 就减 10 记进位：

```c
int tempnum = 0, carry_bit = 0;
for(int ix = 0; ix < min_size; ix++)
{
    tempnum = (num1str[ix] - '0') + (num2str[ix] - '0') + carry_bit;
    if(tempnum >= 10)
    {
        tempnum = tempnum - 10;
        carry_bit = 1;
    }
    else
    {
        carry_bit = 0;
    }
    result[ix] = tempnum + '0';
}
```

共同长度算完后，长的那个数剩下的高位还要继续吸收进位（`9 + carry_bit > '9'` 就说明又进位了），最后如果 `carry_bit` 还是 1，最高位补上——然后把整个结果**再反转回来**。一个加法，反转、补零、进位、回正，全是小学竖式里那些"藏在心里"的动作。

库里每个运算都有两个版本：`add` 返回新串，`add_change` 把结果写回第一个参数（原地修改）。`_change` 后缀从此成了这个库的命名约定，除法里会大量用到它。

## 减法：只做一半，另一半交给调用方

sub 只处理"大数减小数"这一种情况——相等直接返回 `"0"`，小的减大的直接返回空串。听起来是偷工减料，其实是个清晰的契约：**把复杂性推给调用方**。谁负责保证大减小？BigInterge 层。这一层管符号，它知道怎么换序（下一节），字符串层就只管老实做竖式。

借位的实现和加法对偶：`carry_bit` 变成 -1，不够减就 +10 向高位借：

```c
tempnum = (num1str[ix] - '0') - (num2str[ix] - '0') + carry_bit;
if(tempnum < 0)
{
    tempnum = tempnum + 10;
    carry_bit = -1;
}
```

结尾还有个加法没有的步骤：**去前导零**——`1000 - 999 = 0001`，结果的最高位可能是 0，得剪掉再反转。

## 符号系统：四种组合，全部化归

字符串层只会算正数的加减，那 `-5 + 3` 怎么办？BigIntergeAdd 用三段化归把四种符号组合全部变成正数运算——代码里的注释就是化归公式本身：

```c
if(num1->sign_member == BIS_Negative && num2->sign_member == BIS_Negative)
{
    // -a + -b  =>  -(a + b)
    return BigIntergeOpposite(BigIntergeAdd(BigIntergeOppositeTemp(num1),BigIntergeOppositeTemp(num2)));
}
else if(num1->sign_member == BIS_Negative && num2->sign_member == BIS_Positive)
{
    // -a + b  =>  b - a
    return BigIntergeSub(num2, BigIntergeOppositeTemp(num1));
}
else if(num1->sign_member == BIS_Positive && num2->sign_member == BIS_Negative)
{
    // a + -b  =>  a - b
    return BigIntergeSub(num1, BigIntergeOppositeTemp(num2));
}
```

函数调用自己——化归到只剩"正数加正数"这种最朴素的情况再落地。减法同理（`-a - b => -(a + b)`、`a - -b => a + b`，外加"小减大换序取反"）。乘法简单些，符号异或就行：同号得正、异号得负，零和一提前特判掉。

`BigIntergeOppositeTemp` 和 `BigIntergeOpposite` 是一对：前者造一个符号相反的**副本**（不动原数），后者原地翻转。化归时用副本，免得把调用方的操作数改了。

## 除法：从死减到竖式

除法是这个项目里唯一"换过算法"的运算。最早的版本写在注释里——被除数不停减除数，数减了多少次：

```c
// int i;
// for(i = 0; i < 100000000; ++i)
// {
//     if(strlen(num1str) <= strlen(num2str))
//     {
//         break;
//     }
//     sub_change(num1str, num2str);
// }
```

纯暴力，29 位数除以 1 位数要减上百亿次，注释旁边还留着一段计时的测试代码，当年就是被它慢到重写的。

现版本是**移位竖式**：除数最多能左移（后面补零）`len1 - len2` 位。从最大移位开始，每一档先数清楚"对齐后的除数能从被除数里减掉几次"，把 `次数 × 10^移位数` 累进商，再用 `add_change` 拼起来：

```c
for(; max_move>=0; max_move--)
{
    if(String_Cmp(num1str, num2str) >= 0)
    {
        //除数num2左移counts位时,num1最多能减去num2的次数times
        String now_num2str = String_Addxchar_temp(num2str, max_move, '0');
        for(times = 0; times < 1000 && ( String_Cmp(num1str, now_num2str) >= 0 ); times++)
        {
            sub_change(num1str, now_num2str);
        }
        for(int i = 1; i <= max_move; i++)
        {
            String_AddChar(temp, '0');
        }
        strcpy(temp, mul(Int_to_String(times), temp));
        add_change(result_, temp);
        ...
    }
}
```

减完剩下的 `num1str` 就是余数。那个 `times < 1000` 是护栏——数学上每一位的商不会超过 9，护栏只防逻辑错误导致的死循环。哦对，`String_Addxchar_temp(num2str, max_move, '0')` 就是前面 my_string 里那个"追加 n 个字符"——给除数尾巴上补零造 10^k，伏笔在这里收回。

## 运行效果

main 里先硬编码跑了一个 29 位除以 26 位：

```text
114514121857865745231233456789 / 12345123125654564231236798 = 09276 ...... 0759744294007422280918541
```

然后交互输入两个数，四则运算一把梭（`-12345678901234567890` 和 `98765432109876543210`）：

```text
-12345678901234567890 + 98765432109876543210 = 86419753208641975320
-12345678901234567890 - 98765432109876543210 = -111111111011111111100
-12345678901234567890 * 98765432109876543210 = -1219326311370217952237463801111263526900
-12345678901234567890 / 98765432109876543210 = 12345678901234567890 / 98765432109876543210 = 0 ...... 12345678901234567890
-0
12345678901234567890
```

这 20 位的乘法结果可以直接验证：`12345678901234567890 × 98765432109876543210` 正是那个著名的 40 位回文积 `1219326311370217952237463801111263526900`，一个数位都没错。

## 复盘：输出里藏着的三个不完美

这次的运行输出本身就是最好的复盘材料，三个"不完美"肉眼可见。

**第一，前导零。** 硬编码除法的商是 `09276` 而不是 `9276`，余数也带着开头那个 0。原因写在被注释掉的一行里——"判断能不能第一位就对齐，不行的话 max_move 就要 -1"：当被除数的首位比除数首位小时，最高一档移位其实用不到，但代码还是给商的第一位留了个空位，于是打印出 0。修法就是把那段注释启用，或者输出前统一去前导零（乘法里已经有现成的同款逻辑）。

**第二，库函数自己在 printf。** `BigIntergeDiv` 内部打了一行 `"%s / %s = "`，main 又打了一遍算式，于是输出里出现两句连在一起的除式。计算和输出搅在一个函数里，是当年没分层的后遗症——库应该只算，打印是调用方的事。

**第三，负零。** 交互除法那一行，商是 0，但因为是负数除法，结果被 `BigIntergeOpposite` 翻成了负的——输出里赫然一个 `-0`。取反函数没检查"零没有符号"。顺带一提，被除数小于除数时商 0 余本身，这个数学上是**对的**，只是表达方式太朴素。

三个毛病都不致命，但每一个都精确指向一个该补的测试用例。

## 配套实验：用变量名记账的内存管理器

更新记录里那句"实现了对象池，方便最后统一销毁对象"，对应一个配套的小实验 memmanager。对象池这套思路我后来在[数电帮你算](/posts/30b0ee7b/)里又用过一版——那边是每个对象自带销毁函数、进程退出时统一析构，这边则是另一种形态。想法是：malloc 来 malloc 去，忘了 free 就是泄漏——那就**用变量名当 key，把每一次分配都记在账上**，最后统一释放。

记账的关键是把变量名变成字符串，这一步交给 `#` 拼接符：

```c
#define GetValueName(value) #value

void *Mem_New(char* ValueName, size_t _NumOfElements, size_t _SizeOfElements, Memmanager_enum Method)
{
    ...
    Mem.MemPooLUsedSize++;
    Insert(ValueName, H);   //自动分配一个位置
    Mem.MemSpace[Find( ValueName, H )] = result;
    return result;
}
```

调用时写 `Mem_New(GetValueName(p), ...)`，变量名 `"p"` 就成了这笔分配的账户名，存进一个二次探测哈希表里（哈希表用的是《数据结构与算法分析》课本上的实现，我在上面只加了记账逻辑）。销毁时 `Mem_Manager_Free` 对着账本从头 free 到尾，一个不漏。

后来 BigInterge 里的 memmanager 是它的简化骨架——对象节点带 `mem_free` 函数指针的思路保留了，但主流程其实没往账本里插几个对象，主要还是靠 `BigIntergeDestroy` 手工释放。实验的意义在于想清楚了一件事：**C 里想自动化资源管理，要么每个对象自带销毁函数（[数电帮你算](/posts/30b0ee7b/)里的对象池），要么入池记账统一销毁（这里的哈希账本），没有第三条不用写代码的路。**

## 完整代码

主程序 BigInterge.c 里一部分中文注释在多次转码中损坏了，所以它只以前文片段的形式出现；数学库是干净的，完整贴出。其余文件都很短，一并列出。

```c string_math.h
#ifndef _String_Math_H
#define _String_Math_H

typedef enum __BigInterge_Cmp
{
    small = -1,
    equ,
    big
}BI_CmpResult;

typedef enum _bool
{
    False,
    True
} __Bool;


String Int_to_String(long long num);
BI_CmpResult String_Cmp(String num1, String num2);

__Bool String_IsZero(String num);
__Bool String_IsOne(String num);

String add(String num1, String num2);
String add_change(String num1, String num2);

String sub(String num1, String num2);
String sub_change(String num1, String num2);


String mul(String num1, String num2);
String mul_change(String num1, String num2);

__Bool String_Math_div(String num1, String num2, String result, String remainder); //余数
#endif // _String_Math_H
```

```c my_string.h
#ifndef _My_String_H
#define _My_String_H

typedef char* String;

String String_Init(const char* str);
String String_AddChar(String str, char c);
String String_Addxchar_temp(String str, size_t times, char c);

#endif //_My_String_H
```

```c my_string.c
#include <string.h>
#include <stdlib.h>
#include "my_string.h"

String String_Init(const char* str)
{
    String result = (String)malloc(sizeof(char) * (strlen(str) + 1) );
    strcpy(result, str);
    return result;
}

String String_AddChar(String str, char c)
{
    size_t len = strlen(str);
    str[len] = c;
    str[len + 1] = '\0';
    return str;
}

String String_Addxchar_temp(String str, size_t times, char c)
{
    size_t len = strlen(str);
    if(times > 0)
    {
        String result = (String)calloc(len + times, sizeof(char));
        strcpy(result, str);
        for(int i = 0; i < times; ++i)
        {
            result[len + i] = c;
        }
        result[len + times] = '\0';
        return result;
    }
    else
    {
        return str;
    }
}
```

```c string_math.c
#include <string.h>
#include <stdlib.h>
#include "my_string.h"
#include "string_math.h"

String Int_to_String(long long num)
{
    int temp = num;
	int count = 1;
	while(temp)
	{
		temp /= 10;
		count++;
	}
    String str = (String)malloc(sizeof(char) * count);
    itoa(num,str,10);
	return str;
}

BI_CmpResult String_Cmp(String num1, String num2)
{
    long long len1 = strlen(num1);
    long long len2 = strlen(num2);
    if(len1 > len2)
    {
        return big;
    }
    else if(len2 > len1)
    {
        return small;
    }
    else
    {
        return (BI_CmpResult)strcmp(num1, num2);
    }
}

__Bool String_IsZero(String num)
{
    if(num[0] == '0' && strlen(num) == 1)
    {
        return True;
    }
    return False;
}

__Bool String_IsOne(String num)
{
    if(num[0] == '1' && strlen(num) == 1)
    {
        return True;
    }
    return False;
}

String add(String num1, String num2)
{
    long long len1 = strlen(num1);
    long long len2 = strlen(num2);
    char num1str[len1 + 1 + 1];//一个1是最前面加多一个0 还有一个1是储存最后的'\0'
    char num2str[len2 + 1 + 1];
    for(int i = len1 - 1; i >= 0; i--)
    {
        num1str[len1 - i - 1] = num1[i];
    }
    num1str[len1] = '0';
    num1str[len1 + 1] = '\0';

    for(int i = len2 - 1; i >= 0; i--)
    {
        num2str[len2 - i - 1] = num2[i];
    }
    num2str[len2] = '0';
    num2str[len2 + 1] = '\0';

    //printf("%s-%s\n",num1str, num2str);
    int min_size = len1 > len2 ? len2 : len1;
    int max_size = len1 > len2 ? len1 : len2;
    String result = (String)malloc(sizeof(char) * (max_size + 1 + 1));
    int tempnum = 0, carry_bit = 0;
    for(int ix = 0; ix < min_size; ix++)
    {
        tempnum = (num1str[ix] - '0') + (num2str[ix] - '0') + carry_bit;
        if(tempnum >= 10)
        {
            tempnum = tempnum - 10;
            carry_bit = 1;
        }
        else
        {
            carry_bit = 0;
        }
        
        result[ix] = tempnum + '0';
    }
    if(len1 >= len2)
    {
        for(int ix = min_size; ix < max_size; ix++)
        {
            if(num1str[ix] + carry_bit <= '9')
            {
                result[ix] = num1str[ix] + carry_bit;
                carry_bit = 0;
            }
            else
            {
                result[ix] = num1str[ix] + carry_bit - 10;
                carry_bit = 1;
            }
        }
    }
    else
    {
        for(int ix = min_size; ix < max_size; ix++)
        {
            // result[ix] = num2str[ix] + carry_bit;
            // carry_bit = 0;
            if(num2str[ix] + carry_bit <= '9')
            {
                result[ix] = num2str[ix] + carry_bit;
                carry_bit = 0;
            }
            else
            {
                result[ix] = num2str[ix] + carry_bit - 10;
                carry_bit = 1;
            }
        }
    }

    if(carry_bit == 1)
    {
        result[max_size] = carry_bit + '0';
        result[max_size + 1] = '\0';
        //翻转数组
        for(int i = 0; i <= max_size / 2; ++i)
        {
            tempnum = result[i];
            result[i] = result[max_size - i];
            result[max_size - i] = tempnum;
        }
    }
    else
    {
        result[max_size] = '\0';
        //翻转数组
        for(int i = 0; i < max_size / 2; ++i)
        {
            tempnum = result[i];
            result[i] = result[max_size - i - 1];
            result[max_size - i - 1] = tempnum;
        }
    }

    return result;
}

String add_change(String num1, String num2)
{
    long long len1 = strlen(num1);
    long long len2 = strlen(num2);
    char num1str[len1 + 1 + 1];//一个1是最前面加多一个0 还有一个1是储存最后的'\0'
    char num2str[len2 + 1 + 1];
    for(int i = len1 - 1; i >= 0; i--)
    {
        num1str[len1 - i - 1] = num1[i];
    }
    num1str[len1] = '0';
    num1str[len1 + 1] = '\0';

    for(int i = len2 - 1; i >= 0; i--)
    {
        num2str[len2 - i - 1] = num2[i];
    }
    num2str[len2] = '0';
    num2str[len2 + 1] = '\0';

    //printf("%s-%s\n",num1str, num2str);
    int min_size = len1 > len2 ? len2 : len1;
    int max_size = len1 > len2 ? len1 : len2;
    char result[max_size + 1 + 1];
    int tempnum = 0, carry_bit = 0;
    for(int ix = 0; ix < min_size; ix++)
    {
        tempnum = (num1str[ix] - '0') + (num2str[ix] - '0') + carry_bit;
        if(tempnum >= 10)
        {
            tempnum = tempnum - 10;
            carry_bit = 1;
        }
        else
        {
            carry_bit = 0;
        }
        
        result[ix] = tempnum + '0';
    }
    if(len1 >= len2)
    {
        for(int ix = min_size; ix < max_size; ix++)
        {
            if(num1str[ix] + carry_bit <= '9')
            {
                result[ix] = num1str[ix] + carry_bit;
                carry_bit = 0;
            }
            else
            {
                result[ix] = num1str[ix] + carry_bit - 10;
                carry_bit = 1;
            }
        }
    }
    else
    {
        for(int ix = min_size; ix < max_size; ix++)
        {
            // result[ix] = num2str[ix] + carry_bit;
            // carry_bit = 0;
            if(num2str[ix] + carry_bit <= '9')
            {
                result[ix] = num2str[ix] + carry_bit;
                carry_bit = 0;
            }
            else
            {
                result[ix] = num2str[ix] + carry_bit - 10;
                carry_bit = 1;
            }
        }
    }

    if(carry_bit == 1)
    {
        result[max_size] = carry_bit + '0';
        result[max_size + 1] = '\0';
        //翻转数组
        for(int i = 0; i <= max_size / 2; ++i)
        {
            tempnum = result[i];
            result[i] = result[max_size - i];
            result[max_size - i] = tempnum;
        }
    }
    else
    {
        result[max_size] = '\0';
        //翻转数组
        for(int i = 0; i < max_size / 2; ++i)
        {
            tempnum = result[i];
            result[i] = result[max_size - i - 1];
            result[max_size - i - 1] = tempnum;
        }
    }
    strcpy(num1, result);
    return num1;
}

String sub(String num1, String num2)
{
    long long len1 = strlen(num1);
    long long len2 = strlen(num2);
    if(len1 == len2)
    {
        if(strcmp(num1, num2) == 0)
        {
            String result = (String)malloc(2 * sizeof(char));
            strcpy(result, "0");
            return result;
        }
    }    
    if( len1 >= len2)
    {
        char num1str[len1 + 1];
        char num2str[len2 + 1];
        for(int i = len1 - 1; i >= 0; i--)
        {
            num1str[len1 - i - 1] = num1[i];
        }
        num1str[len1] = '\0';

        for(int i = len2 - 1; i >= 0; i--)
        {
            num2str[len2 - i - 1] = num2[i];
        }
        num2str[len2] = '\0';

        int min_size = len1 > len2 ? len2 : len1;
        int max_size = len1 > len2 ? len1 : len2;
        String result = (String)malloc(sizeof(char) * (max_size + 1));
        int tempnum = 0, carry_bit = 0;
        for(int ix = 0; ix < min_size; ix++)
        {
            tempnum = (num1str[ix] - '0') - (num2str[ix] - '0') + carry_bit;
            if(tempnum < 0)
            {
                tempnum = tempnum + 10;
                carry_bit = -1;
            }
            else
            {
                carry_bit = 0;
            }
            
            result[ix] = tempnum + '0';
        }

        for(int ix = min_size; ix <= max_size; ix++)
        {
            result[ix] = num1str[ix] + carry_bit;
            if(result[ix] < '0')
            {
                carry_bit = -1;
                result[ix] += 10;
            }
            else
            {
                carry_bit = 0;
            }
        }
        
        //判断最后一位是0
        if(result[max_size - 1] == '0')
        {
            result[max_size - 1] = '\0';
            max_size--;
        }

        //翻转数组
        for(int i = 0; i < max_size / 2; ++i)
        {
            tempnum = result[i];
            result[i] = result[max_size - i - 1];
            result[max_size - i - 1] = tempnum;
        }
        result[max_size] = '\0';
        return result;
    }
    return "";
}

String sub_change(String num1, String num2)
{
    long long len1 = strlen(num1);
    long long len2 = strlen(num2);
    if(len1 == len2)
    {
        if(strcmp(num1, num2) == 0)
        {
            strcpy(num1, "0");
            return num1;
        }
    }    
    if( len1 >= len2)
    {
        char num1str[len1 + 1];
        char num2str[len2 + 1];
        for(int i = len1 - 1; i >= 0; i--)
        {
            num1str[len1 - i - 1] = num1[i];
        }
        num1str[len1] = '\0';

        for(int i = len2 - 1; i >= 0; i--)
        {
            num2str[len2 - i - 1] = num2[i];
        }
        num2str[len2] = '\0';

        int min_size = len1 > len2 ? len2 : len1;
        int max_size = len1 > len2 ? len1 : len2;
        char result[max_size + 1];
        int tempnum = 0, carry_bit = 0;
        for(int ix = 0; ix < min_size; ix++)
        {
            tempnum = (num1str[ix] - '0') - (num2str[ix] - '0') + carry_bit;
            if(tempnum < 0)
            {
                tempnum = tempnum + 10;
                carry_bit = -1;
            }
            else
            {
                carry_bit = 0;
            }
            
            result[ix] = tempnum + '0';
        }

        for(int ix = min_size; ix <= max_size; ix++)
        {
            result[ix] = num1str[ix] + carry_bit;
            if(result[ix] < '0')
            {
                carry_bit = -1;
                result[ix] += 10;
            }
            else
            {
                carry_bit = 0;
            }
        }
        
        //判断最后一位是0
        if(result[max_size - 1] == '0')
        {
            result[max_size - 1] = '\0';
            max_size--;
        }

        //翻转数组
        for(int i = 0; i < max_size / 2; ++i)
        {
            tempnum = result[i];
            result[i] = result[max_size - i - 1];
            result[max_size - i - 1] = tempnum;
        }
        result[max_size] = '\0';
        return strcpy(num1, result);
    }
    return "";
}

String mul(String num1, String num2)
{
    long long len1 = strlen(num1);
    long long len2 = strlen(num2);
    int temp[len1 + len2];
    String result = (String)calloc(len1 + len2 + 1, sizeof(char));
    for(int i = 0; i < len1 + len2; ++i)
    {
        temp[i] = 0;
    }

    for(int i = 0; i < len1; i++)
    {
        for(int j = 0; j < len2; j++)
        {
            temp[i + j + 1] += (num1[i] - '0') * (num2[j] - '0');
        }
    }
    
    for (int i = len1 + len2 - 1; i >= 0; --i)
    {
        //printf("%d ", temp[i]);
        if((temp[i]) >= 10)
        {
            temp[i - 1] += (temp[i]) / 10;
            temp[i] %= 10;
        }
        result[i] = temp[i] + '0';
    }

    //如果最前面还有0的话得去掉
    if(result[0] == '0')
    {
        for(int i = 0; i < len1 + len2; ++i)
        {
            result[i] = result[i + 1];
        }
    }
    //最后结尾加上结束符
    result[len1 + len2] = '\0';
    return result;
}

String mul_change(String num1, String num2)
{
    if(String_IsZero(num1) == True || String_IsZero(num2) == True)
    {
        strcpy(num1, "0");
        return num1;
    }

    if(String_IsOne(num1) == True)
    {
        strcpy(num1, num2);
        return num2;
    }
    else if(String_IsOne(num2) == True)
    {
        return num1;
    }

    long long len1 = strlen(num1);
    long long len2 = strlen(num2);
    int temp[len1 + len2];
    char result[len1 + len2 + 1];
    for(int i = 0; i < len1 + len2; ++i)
    {
        temp[i] = 0;
    }

    for(int i = 0; i < len1; i++)
    {
        for(int j = 0; j < len2; j++)
        {
            temp[i + j + 1] += (num1[i] - '0') * (num2[j] - '0');
        }
    }
    
    for (int i = len1 + len2 - 1; i >= 0; --i)
    {
        //printf("%d ", temp[i]);
        if((temp[i]) >= 10)
        {
            temp[i - 1] += (temp[i]) / 10;
            temp[i] %= 10;
        }
        result[i] = temp[i] + '0';
    }

    //如果最前面还有0的话得去掉
    if(result[0] == '0')
    {
        for(int i = 0; i < len1 + len2; ++i)
        {
            result[i] = result[i + 1];
        }
    }
    //最后结尾加上结束符
    result[len1 + len2] = '\0';
    strcpy(num1, result);
    return num1;
}

__Bool String_Math_div(String num1, String num2, String result, String remainder) //余数
{
    size_t len1 = strlen(num1);
    size_t len2 = strlen(num2);
    long long max_move = len1 - len2;
    size_t times = 0;
    char num1str[len1];
    char num2str[len2];
    strcpy(num1str, num1);
    strcpy(num2str, num2);
    
    //printf("%s\n", num1str);
    //判断能不能第一位就对齐，不行的话max_move最大移动位数就要-1
    // if(num1str[0] < num2str[0])
    // {
    //     max_move--;
    //     putchar(' ');
    // }
    //printf("%s\n", num2str);
    //printf("max_move:%d\n", max_move);

    String result_ = (String)calloc(len1, sizeof(char));
    result_[0] = '0';
    String temp = (String)calloc(len1, sizeof(char));
    temp[0] = '1';
    for(; max_move>=0; max_move--)
    {
        if(String_Cmp(num1str, num2str) >= 0)
        {
            //除数num2左移counts位时,num1最多能减去num2的次数times
            String now_num2str = String_Addxchar_temp(num2str, max_move, '0');
            for(times = 0; times < 1000 && ( String_Cmp(num1str, now_num2str) >= 0 ); times++)
            {
                sub_change(num1str, now_num2str);
            }
            for(int i = 1; i <= max_move; i++)
            {
                String_AddChar(temp, '0');
            }
            strcpy(temp, mul(Int_to_String(times), temp));
            add_change(result_, temp);
            for(int i = 0; i < len1; ++i)
            {
                temp[i] = 0;
            }
            temp[0] = '1';
        //除数num2左移counts位时,被除数最多能减去除数t=times*(10^counts)次：
        }
    }
    strcpy(result, result_);
    strcpy(remainder, num1str);
    return True;
}
```

BigInterge 层的符号化归（`-a + b => b - a` 那些）和除法的移位竖式在前文都有代码片段了，配合这份干净的数学库，整个运算流程已经完整。当 `long long` 装不下的时候，你要的其实不是更大的类型，而是把小学数学老老实实写一遍的耐心。
