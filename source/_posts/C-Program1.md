---
title: C-Program1
tags:
  - C语言
abbrlink: '107649e7'
date: 2022-05-08 14:28:04
---

## \[C语言\]printf和scanf函数的返回值

[CSDN原文链接](https://blog.csdn.net/qq_28406527/article/details/121908090)

先来看一道题

```c
#include<stdio.h>
int main()
{
   int a=43;
   printf("%d\n",a);
   return 0;
}
```

看完嘴角疯狂上扬，这题我会，  
输出**43**，贼简单。

结果突然看到一题

```c
#include<stdio.h>
int main()
{
   int a=43;
   printf("%d\n",printf("%d",printf("%d",a)));
   return 0;
}
```

![](e1ff5c7c7cac4cc5a05d802dadaf839f.jpg)

就是说着一大堆printf难道不会报错？

运行了一下，好像没问题，关键是怎么来的  
![](1259e7c96746459392a2b54cd4130a8c.png)

说着我就去**stdio.h**头文件里寻找printf的定义去了  
![](426a11a7dbba4282afb7f2891158c45f.png)

好像看不懂

![](59d03c57cc574b1cbe809942ba3e0965.jpg)

不过我们知道了printf函数有返回值，而且还是int类型，所以，我们来试试。

![](7a27ad841dfd4e879f310a24c04815e5.png)

欸？这样子救输出了01，那如果我改一下a的值呢

![](5eacf7a6e6d4451ab0c842e338197d0f.png)  
变成11了，好像是我修改a的值就会变一个  
![](7246ad5ced3643b8a921679eed3faae3.png)  
![](af6b6da621094789b6c2769eba40c11c.png)

等等，好像有点不对劲，怎么后面那一位变成4了，之前一直是1来着

![](d4a5a5f1f3c44dd48c9fa025362a06aa.png)  
**好像发现规律了，就是一开始先输出一个a的值，然后在输出a的长度，验证了好多遍，发现是对的！**

## printf函数的返回值是输出字符的个数

我们再回到开头的代码

```c
#include<stdio.h>
int main()
{
   int a=43;
   printf("%d\n",printf("%d",printf("%d",a)));
   return 0;
}
```

我们一步步拆开  
最里面那层

```c
b = printf("%d",a)
```

输出43  
返回2  
也就是上面这个代码屏幕上输出43但是b的值变成2了

```c
c = printf("%d",printf("%d",a))
```

输出432，其中那个2是最里面的printf的返回值  
返回1，也就是c的值是1，这个1就是输出2这个的字符产生的返回值  
传递给最外面的printf，也就成了printf(“%d”,2);所以会输出一个2出来  
接下来就是全部套进来了

```c
printf("%d\n",printf("%d",printf("%d",a)));
```

输出4321  
这样就懂了吧。  
ㅤ

![](286b0bbeef574d76806aa153332bb92b.jpg)

那看到这里，我就想scanf的返回值是不是也有，又重新回到stdio.h里面查询  
![](f1f3bcd893824a8488bdf5edc432985d.png)

好家伙，它也有返回值，而且也是int类型。

![](6eee7252ba7140e6a1732f82c1b95d18.jpg)

为了保证能输出，我们定义一个int型的变量储存并输出。

![](35beb16469b54ff3b5fe9dbf89102603.png)  
输入两个东西进去，返回值是2  
![](4dc17120a61141c1bdef98806543b4b1.png)  
输入三个东西进去返回值是3，好家伙，猜出来了

**scanf函数返回值是按指定格式输入变量的个数？**  
好像没毛病，  
但我就是喜欢玩 ，我测试的时候输入了1,2进去  
(注意这里b的类型也是int了)

![](0f87d32e1eda4694ab3ea0e622395210.png)

好家伙，返回1了，这里我们都知道，只有a变量读取到了用户输入的1，b变量没有读取到

## scanf函数返回值是正确按指定格式输入变量的个数

这就解释的通了  
就先写到这里吧。。。。👻  
接下来还要讲一下fgetc函数fputc函数fclose函数等函数的返回值
