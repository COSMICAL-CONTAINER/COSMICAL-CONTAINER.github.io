---
title: 用 C 语言写 C++
tags:
  - C语言
  - C++
  - GCC
abbrlink: 380f72c9
date: 2024-10-29 18:07:00
---

这是个整活项目，但整得非常认真：**用 C 语言写出 C++ 的语法**。目标包括 `new Animal("Tom", 1)` 这种"像话吗"的代码，甚至还有个山寨 `iostream` 头文件。项目分两代——第一代（2023 年 3 月）老老实实用结构体内嵌实现继承多态；第二代（2024 年 4 月起）开始放飞，靠 GCC 的两个扩展和几个胆大包天的宏，让 C 长出了 C++ 的样子。

## 第一步：抹平关键字

C 和 C++ 最表面的区别是一堆关键字。那就 `#define` 掉——项目里躺着一个名叫 `iostream` 的文件（对，没有扩展名），内容如下：

```c iostream
#ifndef __iostream_h__
#define __iostream_h__

#include <stdio.h>
#include <string.h>
#include <Print.h>

#define using
#define namespace
#define std

#define class struct
#define public
#define private
#define protected

#define template

#define new
#define delete

#endif
```

`class` 变 `struct`，`public`/`private`/`protected` 变空气，`template` 消失，`new`/`delete` 变空——于是 `delete animal_01;` 展开之后就是一句无害的表达式语句 `animal_01;`。最妙的是里面那个 `#include <Print.h>`：我自己写的 [Print.h](/posts/21fb8eaf/) 库会在这里派上大用场，伏笔先埋着。

## 第二代：new 一个"对象"

有了空 `new`，这句代码：

```c
Animal animal_01 = new Animal("Tom", 1);
```

宏展开后其实是：

```c
Animal animal_01 = Animal("Tom", 1);
```

`Animal(...)` 是什么？一个**函数式宏**，展开成一整个 GCC 语句表达式 `({ ... })`——花括号包起来的代码块，最后一个表达式的值就是整个表达式的值。里面干的事：造一个 `Animal` 变量、填名字和年龄、**现场定义三个嵌套函数当方法**、把它们挂到函数指针成员上、最后返回这个结构体：

```c
typedef struct Animal
{
	char *name;
	int age;
	int (*getAge)(void);
	char *(*getName)(void);
	void (*setAge)(int);
} Animal;

#define Animal(nam, num) ({   \
	Animal animal;            \
	animal.name = nam;        \
	animal.age = num;         \
	int getAge()              \
	{                         \
		return animal.age;    \
	}                         \
	char *getName()           \
	{                         \
		return animal.name;   \
	}                         \
	void setAge(int age)      \
	{                         \
		animal.age = age;     \
	}                         \
	animal.getAge = getAge;   \
	animal.setAge = setAge;   \
	animal.getName = getName; \
	animal;                   \
})
```

两个 GCC 扩展撑起了整场戏。**语句表达式** `({ ... })`：GNU C 允许把一串语句包成表达式，值取自最后一行——`animal;` 单独占一行就是干这个的。**嵌套函数**：函数里定义函数，而且能像闭包一样直接访问外层作用域的变量——`getAge` 的函数体里那个 `animal`，不是它自己的参数，是宏里定义的那个局部变量的引用。

所以"方法"的工作原理是：`animal.getAge` 存的函数指针指向一个闭包，闭包记住的是**这一次宏展开时**的那个 `animal`。`new` 两只动物，就得到两套各自独立的方法——`animal_01.getName()` 返回 Tom，`animal_02.getName()` 返回 Jerry，互不串台。

## cout：伏笔回收

第一代还玩了个更有意思的：`#define cout print`——用 Print.h 的多参数 print 冒充流式输出：

```c
cout(animal_01->getName(), " age is ", animal_01->getAge(), "\n");
```

`cout` 展开成 `print`，而 print 早就支持最多十个混合类型参数（[Print.h 开发记（四）V1.4](/posts/4c8a91b3/)里实现的按参数个数分发），`<<` 链式输出的神韵一下就出来了。这就是假 iostream 里 `#include <Print.h>` 的真正目的——整个山寨 C++ 标准库，实际依赖只有我自己的 print 库。

## 第一代：正路的多态

放飞之前，第一代走的是教科书正路——结构体内嵌"基类"实现继承，函数指针表就是虚表：

```c
typedef struct {
    void (*eat)();
    void (*sleep)();
} Animal;

typedef struct {
    Animal base;
    char* name;
} Dog;

typedef struct {
    Animal base;
    char* name;
} Cat;
```

Dog 和 Cat 的第一个成员都是完整的 Animal，所以 `Dog*` 可以安全地强转回 `Animal*` 用——C 标准保证首成员地址就是结构体地址。各自的"方法"在 create 函数里挂上去：

```c
Dog* dog_create(char* name) {
    Dog* dog = malloc(sizeof(Dog));
    dog->base.eat = dog_eat;
    dog->base.sleep = dog_sleep;
    dog->name = name;
    return dog;
}

void perform(Animal* animal) {
    animal->eat();
    animal->sleep();
}
```

`perform` 只认 `Animal*`，不知道也不需要知道背后是狗是猫——**多态的本质就是"通过函数指针表调用，调用者不查表"**。C++ 编译器帮你生成的那张虚表，拆开看就这么大点地方。

## 运行效果

三个程序全部真实编译运行（GCC，`-std=gnu99`）。第二代成品：

```text
Tom age is 1
Jerry age is 2
Tom age is 100
Jerry age is 200
```

第一代（cout 版）：

```text
Tom age is 1
Jerry age is 2
_TOM_ age is 10
_JERRY_ age is 20
```

多态版：

```text
The dog is eating
The dog is sleeping
The cat is eating
The cat is sleeping
```

## 复盘：这场魔术的两个破绽

**第一，闭包指着一块"退役"的内存。** 语句表达式并没有真的开新栈帧——`({...})` 是内联在 main 的栈帧里的一块作用域。嵌套函数靠静态链访问的 `animal`，就是 main 栈帧里那个内层槽位。宏返回之后，这块槽位在逻辑上已经"退役"，但只要没人去踩，读它照样是对的——demo 里恰好没人踩。严格说这是未定义行为，真要给对象续命，`animal` 应该 malloc 出来、返回指针。第一代返回的就是指针，道理它懂，只是也没真的 malloc。

**第二，整套魔术只在 GCC 上活。** 语句表达式和嵌套函数都是 GNU 扩展，MSVC 直接拒绝编译。想跨平台，就得退回第一代的正路：手写"构造函数"，手工挂函数指针。所以这个项目一统天下的结论是——**第二代是新语法糖，第一代才是可移植的写法**。另外多态版里还有个当时没发现的小笔误：`cat_create` 里 `malloc(sizeof(Dog))`，抄狗的尺寸给猫开内存——碰巧两个结构体布局完全相同所以无事发生，但布局一旦分叉就是越界。

## 那这玩意儿有什么用

没有生产力上的用——真要写 C++ 直接开 `.cpp` 就好。但把"对象"亲手拆开重装一遍之后，有几个东西会变得特别清楚：**成员函数就是多了一个隐藏参数的普通函数；虚表就是一张函数指针表；构造函数就是一个初始化结构体的语句块；this 指针就是那个被闭包记住的外层变量。** C++ 把这些全部自动化了，而用 C 整活的这个下午，等于亲手当了一回编译器。

## 完整代码

```c c-plusplus.c
#include <stdio.h>
#include <string.h>

#define new
#define delete

typedef struct Animal
{
	char *name;
	int age;
	int (*getAge)(void);
	char *(*getName)(void);
	void (*setAge)(int);
} Animal;

#define Animal(nam, num) ({   \
	Animal animal;            \
	animal.name = nam;        \
	animal.age = num;         \
	int getAge()              \
	{                         \
		return animal.age;    \
	}                         \
	char *getName()           \
	{                         \
		return animal.name;   \
	}                         \
	void setAge(int age)      \
	{                         \
		animal.age = age;     \
	}                         \
	animal.getAge = getAge;   \
	animal.setAge = setAge;   \
	animal.getName = getName; \
	animal;                   \
})



int main(int argc, char *argv[])
{
	Animal animal_01 = new Animal("Tom", 1);
	Animal animal_02 = new Animal("Jerry", 2);

	printf("%s age is %d\n", animal_01.getName(), animal_01.getAge());
	printf("%s age is %d\n", animal_02.getName(), animal_02.getAge());

	animal_01.setAge(100);
	animal_02.setAge(200);

	printf("%s age is %d\n", animal_01.getName(), animal_01.getAge());
	printf("%s age is %d\n", animal_02.getName(), animal_02.getAge());

	// delete animal_01;
	// delete animal_02;

	return 0;
}
```

```c 多态调用.c
#include<stdio.h>
#include<stdlib.h>


typedef struct {
    void (*eat)();
    void (*sleep)();
} Animal;


typedef struct {
    Animal base;
    char* name;
} Dog;

typedef struct {
    Animal base;
    char* name;
} Cat;


void dog_eat() {
    printf("The dog is eating\n");
}

void dog_sleep() {
    printf("The dog is sleeping\n");
}

void cat_eat() {
    printf("The cat is eating\n");
}

void cat_sleep() {
    printf("The cat is sleeping\n");
}

Dog* dog_create(char* name) {
    Dog* dog = malloc(sizeof(Dog));
    dog->base.eat = dog_eat;
    dog->base.sleep = dog_sleep;
    dog->name = name;
    return dog;
}

Cat* cat_create(char* name) {
    Cat* cat = malloc(sizeof(Dog));
    cat->base.eat = cat_eat;
    cat->base.sleep = cat_sleep;
    cat->name = name;
    return cat;
}

void perform(Animal* animal) {
    animal->eat();
    animal->sleep();
}

int main() {
    Dog* dog = dog_create("Fido");
    Cat* cat = cat_create("maomao");
    perform((Animal*)dog);
    perform((Animal*)cat);
    free(dog);
    return 0;
}
```
