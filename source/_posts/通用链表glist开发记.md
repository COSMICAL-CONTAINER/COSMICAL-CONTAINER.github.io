---
title: 通用链表 glist 开发记：从 void* 到函数指针
tags:
  - C语言
  - 数据结构
  - 函数指针
abbrlink: 11de485d
date: 2023-05-02 23:40:00
---

教科书里的线性表长一个样：`int a[MAX]`，或者 `struct Node { int data; struct Node* next; }`——从头到尾只能装一种类型。2023 年 4 月，我决定写一个"什么都能装"的列表：同一个列表里同时放 `int`、`char`、`float`、`double`，甚至自定义结构体，不光存得进去，还得一个一个打印出来。

这个项目最后叫 glist（general list），从 V1.0 迭代到 V1.2，源码整理在 [GitHub 仓库 glist](https://github.com/COSMICAL-CONTAINER/glist) 里，三个版本各占一个标签。三个版本不多，恰好是 C 语言里实现"泛型"的三条思路的进化史：**只存地址 → 给类型发身份证 → 让数据自己带说明书**。

## V1.0：先把"存"解决——void* 数组

一切的起点是一个朴素的问题：一个格子不知道自己装的是什么类型，怎么装？

答案就是 `void*`。普通指针绑定着类型，所以它知道数据从哪开始、到哪结束；`void*` 只有起始地址，什么类型都不绑，所以**任何指针都能不加转换地赋给它**。那 list 就别存数据，存地址：

```c list.h
#ifndef __list_H__
#define __list_H__

#include <stdlib.h>

typedef void* (list_node)[1];

typedef struct
{
    list_node* list;
    size_t 	size;
}list;

list* __list__(int _Size);
void __list_del__(list* list);
void list_write(list* list, size_t _n, void * _Valaddress);
void* list_read(list* list, size_t _n);

#endif // __list_H__
```

```c list.c
#include "list.h"

list* __list__(int _Size)
{
    list* new_list = (list *)malloc( sizeof( list ) );
    list_node* new_list_node = (list_node* )malloc( sizeof( list_node ) * _Size);

    new_list->list = new_list_node;
    new_list->size = _Size;

    return new_list;
}

void __list_del__(list* list)
{
    free(list->list);
    free(list);
}

void list_write(list* list, size_t _n, void * _Valaddress)
{
    if (_n < list->size)
        *list->list[_n] = _Valaddress;
}

void* list_read(list* list, size_t _n)
{
    if (_n < list->size)
        return *list->list[_n];
    return NULL;
}
```

第一次读这段代码，视线多半会卡在这一行：

```c
typedef void* (list_node)[1];
```

它不是在声明指针，是给**"长度为 1 的 `void*` 数组"**这个类型起别名。结构体里存的是 `list_node*`——指向这种数组的指针。于是 `list_write` 里这句就绕了个弯：

```c
*list->list[_n] = _Valaddress;
```

`list->list` 指向一片"数组数组"，`list->list[_n]` 跳到第 `_n` 个数组（每个就 1 个元素），数组名退化成指针，最前面再解引用——拿到的是那个 `void*` 槽位本身。转这么大一个圈，效果等价于 `void* arr[_n] = _Valaddress;`。现在回头看，直接用 `void**` 更直白，但这个弯逼着我把"指向数组的指针"彻底练熟了，不亏。

测试程序里还玩了个对照：静态版本直接在栈上开数组，用的是同款语法不同长度——`[1]` 换成 `[5]`：

```c
typedef void* (StaticList_5)[5];

StaticList_5 p;
p[0] = &num;
p[1] = &ch;
p[2] = &f;
p[3] = &d;
p[4] = &a;
```

`int`、`char`、`float`、`double`、自定义结构体 `A`，五个不同类型的变量地址，装进了同一个数组。取出来的时候强转一下就能用：

```c
printf("int : %d\n", *(int *)list_read(l, 0));
printf("structure : %d %c\n", ((A *)list_read(l, 4))->id, ((A *)list_read(l, 4))->value);
```

但问题就藏在这两行 printf 里：**取出来的是什么类型，全靠调用的人自己记**。第 0 个是 int、第 4 个是结构体——这些信息在 `list_write` 存进去的那一刻就丢了。所以这个版本的 list 注定写不出 `list_printf`：printf 需要格式符，格式符来自类型，而类型已经没了。

存的问题解决了，打印的问题一个字没动。

## V1.1：给每个元素发一张"类型身份证"

三个月后的一个晚上，我把思路换了个方向：既然 list 不认识类型，那就**存的时候顺便把类型编号一起存进去**。每个槽位从光秃秃的 `void*` 变成一对 `{typeId, data}`：

```c
#define TYPEID_CHAR 1
#define TYPEID_UCHAR 2
#define TYPEID_INT 3
#define TYPEID_UINT 4
#define TYPEID_SORT 5
#define TYPEID_USORT 6
#define TYPEID_FLOAT 7
#define TYPEID_UFLOAT 8
#define TYPEID_DOUBLE 9
#define TYPEID_UDOUBLE 10
#define TYPEID_PCHAT 11

#define TYPEID_MYSTRUCT 51

typedef struct
{
    size_t typeId;
    void* data;
}glist_note;
```

`list_write` 多了一个参数，写入时把身份证一起钉进去：

```c
void list_write(glist* list, size_t _n, void * _Valaddress, size_t _typeId)
{
    if (_n < list->size)
    {
        list->note[_n].data = _Valaddress;
        list->note[_n].typeId = _typeId;
    }
}
```

`list_printf` 拿着编号去查表，按类型分发格式符：

```c
void list_printf(glist* list, size_t _n)
{
    void* data = list_read(list, _n);
    if(data != NULL)
    {
        switch (list->note[_n].typeId)
        {
        case TYPEID_CHAR:printf( "%c\n", *(char*)data ); break;
        case TYPEID_UCHAR:printf( "%u\n", *(unsigned char*)data ); break;
        case TYPEID_INT:printf( "%d\n", *(int*)data ); break;
        case TYPEID_UINT:printf( "%u\n", *(unsigned int*)data ); break;
        case TYPEID_SORT:printf( "%d\n", *(short*)data ); break;
        case TYPEID_USORT:printf( "%d\n", *(unsigned short*)data ); break;
        case TYPEID_FLOAT:printf( "%f\n", *(float*)data ); break;
        case TYPEID_DOUBLE:printf( "%lf\n", *(double*)data ); break;
        case TYPEID_PCHAT:printf( "%s\n", (char*)data ); break;
        case TYPEID_MYSTRUCT:printf("%d %c\n",*(int *)data, *((int *)data + 1));break;
        default:
            break;
        }
    }
}
```

这段 switch 里有几个当年的小心思，展开讲讲：

**`TYPEID_MYSTRUCT = 51` 为什么从 11 直接跳到 51？** 给自定义类型留的"手动挡"：1~11 是内置类型固定席位，51 号之后的编号随用随占。那个测试用的结构体 `A { int id; int value; }` 打印时还有个小 hack——第二成员存的是 `'a'`（int 形式的 97），所以用 `*((int *)data + 1)` 把它当 int 取出来，再按 `%c` 打成字符：

```c
case TYPEID_MYSTRUCT:printf("%d %c\n",*(int *)data, *((int *)data + 1));break;
```

**`TYPEID_SORT` 是个将错就错的拼写。** 它管的是 `short`——当年少敲了一个 H，发现的时候编号已经在测试里跑通了，懒得改，就当 "SORT" 是 "short" 的方言。

**switch 里本来还有两个 case，被注释掉了：**

```c
// case TYPEID_UFLOAT:printf( "%u", *(unsigned float*)data ); break;
// case TYPEID_UDOUBLE:printf( "%ulf", *(unsigned double*)data ); break;
```

注释原因很简单：C 语言根本没有 `unsigned float` 和 `unsigned double` 这两种类型。定义表的时候手快把"全套 unsigned 家族"都编了号，写 case 时才发现无类型可签——这两张身份证从出生起就是废的。

到这里，V1.1 能跑了：同一个列表混装五种类型，`list_printf` 逐个打印，格式符分发全自动。但这个方案的天花板也一眼可见——**类型表是一扇关着的门**。想支持新的 struct？回来加 `#define`、加 case、重编一遍。使用者没法不动库就扩展它，51 号通道说到底还是库作者本人在开。

## V1.2：让数据自己带说明书

V1.1 的死结在于**打印知识集中在库手里**。那反过来想：凭什么要 list 认识所有类型？让每个元素进门前自带一份"我该怎么被打印"的说明书，不就行了？

说明书就是一个函数指针。V1.2 的槽位结构变成了这样：

```c list.h
#ifndef __glist_H__
#define __glist_H__
#include <stdlib.h>

typedef struct
{
    char *(*data_to_str)(void * data);			/* data */
    void* data;
}glist_note;

typedef struct
{
    glist_note* note;
    size_t 	size;
}glist;

glist* __list__(int _Size);
void __list_del__(glist* list);
void list_write(glist* list, size_t _n, void * _Valaddress, char *data_to_str(void *data));
void* list_read(glist* list, size_t _n);
void list_printf(glist* list, size_t _n);

#endif // __glist_H__
```

```c list.c
#include "list.h"
#include <stdio.h>


glist* __list__(int _Size)
{
    glist* new_list = (glist *)malloc( sizeof( glist ) );
    glist_note* new_list_node = (glist_note* )malloc( sizeof( glist_note ) * _Size);

    new_list->note = new_list_node;
    new_list->size = _Size;

    return new_list;
}

void __list_del__(glist* list)
{
    size_t i;  /* loop counter */
    while (i < list->size)
    {
        free(list->note[i++].data);
    }
    
    free(list->note);

}

void list_write(glist* list, size_t _n, void * _Valaddress, char *data_to_str(void *data))
{
    if (_n < list->size)
    {
        list->note[_n].data = _Valaddress;
        list->note[_n].data_to_str = data_to_str;
    }
}

void* list_read(glist* list, size_t _n)
{
    if (_n < list->size)
        return list->note[_n].data;
    return NULL;
}

void list_printf(glist* list, size_t _n)
{
    void* data = list_read(list, _n);
    if(data != NULL)
    {
        char *str = list->note[_n].data_to_str(list->note[_n].data);
        printf("%s\n", str);
        free(str);
    }
}
```

两个地方值得停下来看。

**第一处：函数参数里写的是函数，不是函数指针。** 结构体成员是标准的函数指针 `char *(*data_to_str)(void * data)`，而 `list_write` 的参数表里却写成了 `char *data_to_str(void *data)`——像函数声明。这不是笔误：C 语言规定，函数类型的形参会自动调整成对应的函数指针，两种写法完全等价，后一种读起来更顺。函数指针声明本来就是 C 的阅读难关，我之前写的[100 级函数指针挑战](/posts/bd6fe775/)整篇都在跟这种声明搏斗。

**第二处：`list_printf` 变得极其简短**——它不再认识任何类型了。它只做一件事：调用元素自带的 `data_to_str` 拿到字符串，打印，然后 `free`。这里有一条双方默认遵守的约定：**`to_str` 返回的必须是堆上申请的字符串（`calloc` 出来的），打印方用完负责释放**。谁生产谁 malloc，谁消费谁 free，一句注释都没写，但契约就在那。

测试程序里，每种类型配一个 to_str 工匠，自定义结构体也一视同仁：

```c
char *int_to_str(void *data)
{
    char *result = (char *)calloc(100, sizeof(char));
    sprintf(result, "%d", *(int *)data);
    return result;
}

char *char_to_str(void *data)
{
    char *result = (char *)calloc(2, sizeof(char));
    sprintf(result, "%c", *(char *)data);
    return result;
}

char *mystruct_to_str(void *data)
{
    char *result = (char *)calloc(100, sizeof(char));
    sprintf(result, "%d %c", ((A *)data)->id, ((A *)data)->value);
    return result;
}
```

写入时把数据和说明书成对提交：

```c
glist* l = __list__(5);

list_write(l, 0, &num, int_to_str);
list_write(l, 1, &ch, char_to_str);
list_write(l, 2, &f, float_to_str);
list_write(l, 3, &d, double_to_str);
list_write(l, 4, &a, mystruct_to_str);
```

从此新增一种类型，**库一行都不用动**——调用方自己写一个 to_str 传进来就行。V1.1 那扇关着的门，被一个函数指针从外面推开了。

## 运行效果

V1.2 的测试程序一次跑完静态、写入、打印三段：

```text
static list:
int : 122
char : A
float : 123.449997
double : 456.780000
structure : 3 a
malloc list:
int : 122
char : A
float : 123.449997
double : 456.780000
structure : 3 a
new glist test:
122
A
123.449997
456.780000
3 a
```

两个细节。**`123.449997` 不是 bug**：123.45 在 float 里根本没有精确表示，存进去的是它的最近邻，`%f` 默认打 6 位小数，尾巴就露出来了；隔壁 double 的 `456.780000` 干干净净，精度差距一目了然——这个输出本身就是"为什么别用 float 存钱"的免费广告。

另一个细节：V1.1 和 V1.2 的这段输出**一字不差**。底下数据流完全不同（编号查表 vs 函数指针分发），用户视角却完全一致——好的抽象就该是这样，换发动机不换方向盘。

## 复盘：现在回头看，埋着两个坑

**第一个坑，`__list_del__` 里那个未初始化的 `i`：**

```c
void __list_del__(glist* list)
{
    size_t i;  /* loop counter */
    while (i < list->size)
    {
        free(list->note[i++].data);
    }
    ...
}
```

`i` 没有初值，进去是栈上残留的随机数。运气好它恰好 ≥ `size`，循环一次不进，内存全漏；运气差它是个小值，`free` 一串随机下标的数据。V1.1 和 V1.2 都是这么写的，当时 exe 跑完安然退出，纯属那块栈恰好转脸给了面子。修复只值一个字符的事：`size_t i = 0;`。

**第二个坑更隐蔽，是所有权的错配。** 测试程序往 list 里存的是全局变量的地址（`&num`、`&ch`），而 `__list_del__` 销毁时对每个槽位的 `data` 做了 `free`——`free` 一个不是 `malloc` 出来的指针，同样是未定义行为。全局变量住在数据段，根本不在堆上。这个组合当时没炸，不代表它对，只代表那个几百行的 exe 还没复杂到让问题现形。

正确的姿势得二选一：要么约定"存进来的必须是堆内存"，要么给 `glist_note` 再配一个 `data_free` 函数指针，让销毁逻辑也跟着元素走。其实 V1.2 已经给每个元素配了函数指针，顺手再配一个就能把这个坑填了——当时满脑子都是"怎么打印"，没想过"怎么销毁"。这也是这次复盘最大的收获：**设计一个容器，想清楚怎么放进去的同时，就得想清楚怎么请出来。**

## 尾声：运行期和编译期，两条泛型路

后来写 Print.h 的时候，我用 `_Generic` 做过另一版"类型分发"——[Print.h 开发记（一）V1.0](/posts/21fb8eaf/) 里，编译器在**编译期**看着表达式的类型挑函数，零运行时开销。glist 走的是另一条路：`void*` 加函数指针，在**运行期**分发，类型说明书跟着数据走，随插随用。

两条路没有高下：`_Generic` 快，但类型集合编译时就冻死了；函数指针慢一拍，换来的是库的门永远开着。C 语言没有泛型语法，但它把实现泛型的零件全都发到了你手上——glist 这三个版本，就是把这些零件一个个捡起来的过程。完整源码在 [glist](https://github.com/COSMICAL-CONTAINER/glist)（MIT），提交历史就是 V1.0 → V1.1 → V1.2 的三步进化，想对照哪个版本就翻哪个标签。
