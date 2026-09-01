---
title: 变量能 malloc，函数呢？——手写机器码动态创建函数
tags:
  - C语言
  - 汇编
  - 指针
abbrlink: e654c96
date: 2025-06-26 18:20:00
---

变量的世界有一把万能钥匙：`malloc`。想要多少字节，按一下就有了。那函数呢？函数无非也是一段字节、带一个入口地址——**既然变量能动态创建，函数为什么不能？**

2025 年 6 月的某个下午，我决定把这个问题做穿：不借助任何汇编器语法，亲手把 x86-64 的机器码一个字节一个字节写进 C 数组，让 CPU 把它当函数调用；再进一步，在程序运行的过程中"凭空"造出一个函数来。这篇文章记录整条路径。

> 📌 更新（2026-08-31）：重新验证了全部流程与输出，`c2shellcode.py` 抽取字节码的对照结果见"别手抄了"一节。

## 第零步：先搞清楚自己的函数长什么样

动手之前得有个对照组。写一个最朴素的 max：

```c
int my_max(int a, int b)
{
	return a > b ? a : b;
}
```

它编译成机器码之后长什么样？早年我在 VC6 里干过一件蠢事——直接把 `MessageBoxA` 的运行时地址硬编码进内联汇编，然后 `call eax`：

```c
LoadLibrary("user32.dll");
_asm
{
	push        0
	push        0
	push        0
	push        0
	mov         eax,0x763305B0   // 当年抓到的 MessageBoxA 地址
	call        eax
}
```

这个实验教会我的第一课是：**地址是靠不住的**。今天抓到 `0x763305B0`，明天 ASLR 一开，这个地址就指到天边去了。所以后来正确的姿势不是抄地址，而是抄**字节**——用工具把函数反汇编，把它对应的机器码字节完整搬下来。地址会漂，字节不会。

## 手写 max：八个字节，逐个拆解

Windows x64 的调用约定：前两个参数放在 `ECX` 和 `EDX`。于是 `max(a, b)` 的机器码可以手写出来：

```text
39 CA       cmp  ecx, edx      ; 比较 a 和 b
89 C8       mov  eax, ecx      ; 先假设结果是 a
0F 4D C2    cmovnl eax, edx    ; 如果 a 不小于 b，保持；否则换成 b
C3          ret                ; 返回 eax
```

四个指令、八个字节：`39 CA 89 C8 0F 4D C2 C3`。后面再补上若干 `90`（NOP，无操作）做对齐填充。**注意中间那个 `CMOVNL`**——条件搬移动作，"a 不小于 b 就用 a，否则用 b"，正是三目运算符 `a > b ? a : b` 的机器形态。这个指令马上会变成主角。

## 执行方式一：把字节塞进 .text 段

代码段 `.text` 天生可执行。GCC 允许用段属性把自定义数组**直接放进代码段**：

```c 加密函数.c
#include <stdio.h>

const unsigned char my_max_shellcode[] __attribute__((section(".text"))) = {
    0x39, 0xca, 0x89, 0xc8, 0x0f, 0x4d, 0xc2, 0xc3, 0x90, 0x90, 0x90, 0x90,
    0x90, 0x90, 0x90, 0x90,
};

const unsigned char my_min_shellcode[] __attribute__((section(".text")))= {
    0x39, 0xca, 0x89, 0xc8, 0x0f, 0x4e, 0xc2, 0xc3, 0x90, 0x90, 0x90, 0x90,
    0x90, 0x90, 0x90, 0x90,
};

typedef unsigned long long (*my_max_func_t)(unsigned long long, unsigned long long);
typedef unsigned long long (*my_min_func_t)(unsigned long long, unsigned long long);

int main()
{
    int a = 5;
    int b = 9;
    my_max_func_t my_max_func = (my_max_func_t)my_max_shellcode;
    my_min_func_t my_min_func = (my_min_func_t)my_min_shellcode;
    printf("my_max(%llu, %llu) = %llu\n", a, b, my_max_func(a, b));
    printf("my_max(%llu, %llu) = %llu\n", a, b, ((unsigned long long(*)(unsigned long long, unsigned long long))&my_max_shellcode)(a, b));
    printf("my_min(%llu, %llu) = %llu\n", a, b, my_min_func(a, b));
    printf("my_min(%llu, %llu) = %llu\n", a, b, ((unsigned long long(*)(unsigned long long, unsigned long long))&my_min_shellcode)(a, b));

    printf("%d",((unsigned long long(*)(unsigned long long, unsigned long long))&my_fun_shellcode)(a, b));

    getchar();
    return 0;
}
```

数组的起始地址，强转成函数指针——`(my_max_func_t)my_max_shellcode`——然后像调普通函数一样调用它。`CPU` 不区分"这是编译器生成的代码"还是"这是你手写的字节"，它只认入口地址。main 里两种写法（直接转数组名、取地址再转）都在演示同一件事。

## 执行方式二：VirtualAlloc——给函数的 malloc

塞进 `.text` 是"编译期入场"。运行时能不能凭空造？可以——把 `malloc` 的思路搬到可执行世界：

```c shellcode运行.c
#include <windows.h>
#include <stdio.h>

int main() {
    unsigned char shellcode[] = {
        0x48, 0x39, 0xD1,       // cmp rcx, rdx
        0x7C, 0x05,             // jl +5
        0x48, 0x89, 0xC8,       // mov rax, rcx
        0xC3,                   // ret
        0x48, 0x89, 0xD0,       // mov rax, rdx
        0xC3                    // ret
    };

    void* exec = VirtualAlloc(NULL, sizeof(shellcode),
                              MEM_COMMIT | MEM_RESERVE,
                              PAGE_EXECUTE_READWRITE);
    if (!exec) {
        printf("VirtualAlloc failed\n");
        return -1;
    }
    memcpy(exec, shellcode, sizeof(shellcode));

    printf("Shellcode allocated at %p\n", exec);
    fflush(stdout);

    unsigned long long (*my_max)(unsigned long long, unsigned long long) = (void*)exec;

    unsigned long long a = 5, b = 10;
    unsigned long long result = my_max(a, b);

    printf("my_max(%llu, %llu) = %llu\n", a, b, result);
    fflush(stdout);

    VirtualFree(exec, 0, MEM_RELEASE);

    return 0;
}
```

和 malloc 的流程一模一样：申请、填内容、使用、释放——只是申请参数从"多少字节"变成了"多少字节 + **页保护属性**"。`PAGE_EXECUTE_READWRITE` 意思是这块内存可读可写**可执行**——最后那个可执行，就是函数世界和数据世界的分界线。这版的手写代码也换了个风格：不用 `cmov`，改用 `jl` 跳过另一条 `mov`（`7C 05` 是向前跳 5 字节），殊途同归。

## 点睛：max 和 min 只差一个字节

把两个版本的 max/min 摆在一起看，会看到一个惊人的事实：

```text
my_max:  39 CA  89 C8  0F 4D C2  C3
my_min:  39 CA  89 C8  0F 4E C2  C3
                           ↑
                  只有第 6 个字节不同
```

`0F 4D` 是 `cmovnl`（不小于则搬移），`0F 4E` 是 `cmovl`（小于则搬移）——**一个字节的差别，隔开了 max 和 min 两个函数**。那么在程序运行的时候，把这第五个字节从 `4E` 改成 `4D`，min 函数就当场变成了 max 函数。我后来专门写了一篇文章验证这个玩法：运行时修改机器码数组的第五个元素，重新调用，函数的行为真的切换了。

代码即数据，数据即代码——这句冯·诺依曼结构的老话，在这里不再是课本上的概念，而是一个可以动手摸的字节。

## 别手抄了：让字节码自己产自己

手写字节码的问题不是难，是**抄错一个数都不知道错哪**。所以我又写了个 Python 脚本 `c2shellcode.py` 把整个流程自动化：用 gcc 把 C 文件编译成目标文件，`objdump -d` 反汇编，按函数名截取字节，格式化成 C 数组输出：

```python
def extract_function_shellcode(objfile, function_name):
    result = subprocess.run(["objdump", "-d", objfile], stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, text=True)
    ...
    for line in lines:
        # 找到函数入口
        if re.search(rf'<{re.escape(function_name)}>:$', line.strip()):
            in_func = True
            continue
        # 到了下一个函数或者空行就结束
        if in_func and (line.strip() == "" or re.match(r'^\s*[0-9a-f]+ <.*>:', line)):
            break
        if in_func:
            # 提取机器码字节
            match = re.match(r'^\s*[0-9a-f]+:\s+((?:[0-9a-f]{2} )+)', line)
            if match:
                shellcode += match.group(1).strip().split()
```

用法就是一条命令：`python c2shellcode.py my_max.c my_max`。2026 年更新这篇文章时我重新跑了一遍它，它抽出的 `my_max` 是这样的：

```text
unsigned char shellcode[] = {
    0x39, 0xca, 0x89, 0xc8, 0x0f, 0x4d, 0xc2, 0xc3, 0x0f, 0x1f, 0x84, 0x00,
    0x00, 0x00, 0x00, 0x00,
};
// Length: 16 bytes
```

前八个字节和当年手抄的**一字不差**；多出来的 `0F 1F 84 00 00 00 00 00` 是编译器补的对齐 NOP——同一个函数，人抄的和机器抽的殊途同归。

## 运行效果

两种方式在 2026 年更新时重新编译运行，输出如下。`.text` 段直插版（a=5, b=9，最后那个无换行的 `9` 是第三个变体函数 `my_fun` 的输出）：

```text
my_max(5, 9) = 9
my_max(5, 9) = 9
my_min(5, 9) = 5
my_min(5, 9) = 5
9
```

VirtualAlloc 动态创建版（a=5, b=10，地址每次运行都不同——这正是当年硬编码地址路线的死穴）：

```text
Shellcode allocated at 0000021286E40000
my_max(5, 10) = 10
```

## 几句正经话

**严格说，这一切在 C 标准里都是未定义行为**：函数指针和数据指针互转、往数据段写代码、执行"不是函数的东西"——标准一个都不保证。它今天能跑，靠的是 x86-64 架构、Windows 加载器和 GCC 三家共同的默契。

**可执行内存是把双刃剑**。`PAGE_EXECUTE_READWRITE` 这块内存，我用来造 max 函数，漏洞攻击者用来造更危险的东西——这也是为什么现代系统都在推 W^X（要么可写、要么可执行，别两者兼得），为什么杀软会对这类程序多看两眼。这篇里的所有实验都只在自己机器上跑着玩，理解原理和动手作恶之间隔着一条不可逾越的线。

那为什么还要写它？因为这八行字节把一个最基本的事实拆开摆在了桌面上：**函数 = 一段字节 + 一个入口地址**。虚拟函数表、回调、闭包、JIT 编译器，乃至整个"程序能在运行时改变自己"的世界，地基都是这八个字节。变量能 malloc，函数其实也能——只是这一课，教材不肯教。

## 延伸阅读

- 这套玩法的进阶版（运行时改一个字节切换 max/min）我单独写过一篇：[CSDN：关于我直接在代码里面写机器码，还能实现动态修改函数的代码并成功调用？](https://blog.csdn.net/qq_28406527/article/details/153848323)
- 函数指针的阅读障碍症可以看：[C-返回值为函数指针的函数](/posts/a049fc87/) 与 [C语言100级函数指针挑战](/posts/bd6fe775/)
