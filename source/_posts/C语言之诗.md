---
title: C语言之诗
tags:
  - C语言
abbrlink: f6f85ac1
date: 2025-02-26 14:54:00
---

收藏的一段著名的 C 代码，来自 **IOCCC（国际 C 语言混乱代码大赛，The International Obfuscated C Code Contest）1988 年的获奖作品**。整个程序长这样：

```c
#include <stdio.h>
main(int t,int _,char* a)
{
    return !0<t?t<3?main(-79,-13,a+main(-87,1-_,
    main(-86,0,a+1)+a)):1,t<_?main(t+1,_,a):3,main(-94,-27+t,a)&&t==2?_<13?
    main(2,_+1,"%s %d %d\n"):9:16:t<0?t<-72?main(_,t,
    "@n'+,#'/*{}w+/w#cdnr/+,{}r/*de}+,/*{*+,/w{%+,/w#q#n+,/#{l+,/n{n+,/+#n+,/#;#q#n+,/+k#;*+,/'r :'d*'3,}{w+K w'K:'+}e#';dq#'l q#'+d'K#!/+k#;q#'r}eKK#}w'r}eKK{nl]'/#;#q#n'){)#}w'){){nl]'/+#n';d}rw' i;# ){nl]!/n{n#'; r{#w'r nc{nl]'/#{l,+'K {rw' iK{;[{nl]'/w#q#n'wk nw' iwk{KK{nl]!/w{%'l##w#' i; :{nl]'/*{q#'ld;r'}{nlwb!/*de}'c ;;{nl'-{}rw]'/+,}##'*}#nc,',#nw]'/+kd'+e}+;#'rdq#w! nr'/ ') }+}{rl#'{n' ')# }'+}##(!!/")
    :t<-50?_==*a?putchar(a[31]):main(-65,_,a+1):main((*a=='/')+t,_,a+1)
    :0<t?main(2,2,"%s"):*a=='/'||main(0,main(-61,*a,
    "!ek;dc i@bK'(q)-[w]*%n+r3#l,{}:\nuwloca-O;m .vpbks,fxntdCeghiry"),a+1);
}
```

## 它能干什么

编译运行，它会**唱出《圣诞十二天》（The Twelve Days of Christmas）的全部歌词**，从 "On the first day of Christmas my true love gave to me" 一直唱到第十二天。

## 原理浅析

- `main` 自己递归调用自己，参数 `t` 当状态机用：不同的 t 区间走不同的逻辑
- 那两串乱码字符串是**加密的歌词和解码表**——第二个字符串 `"!ek;dc i@bK'..."` 其实是一张字符映射表，程序运行时逐字符查表还原出真正的歌词
- 嵌套的三目运算符 `?:` 完全取代了 if/else 和循环

## 为什么值得看

这是"代码是写给编译器看的还是写给人看的"这个问题的极端答案。它 demonstration 了三目运算符、递归、字符串查表的极限用法。自己写代码别学它，但它能把你对 C 语言表达式的理解拉高一个层次。

完整的解读文章网上有很多，感兴趣可以搜 "IOCCC 1988" 深入研究。
