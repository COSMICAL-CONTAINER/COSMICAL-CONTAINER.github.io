---
title: C-复刻printf函数1
tags:
  - C语言
abbrlink: 2ed40c3a
date: 2022-11-27 15:30:20
---

其实很久之前就想问C语言里面的printf()是怎么实现的，  
主要是对printf()的参数比较感兴趣，  
你想我们随便定义一个函数，都得确定参数的个数，  
但是像printf()函数，可以根据第一个参数也就是字符串”%c %d %f %s”根据有多少个格式输入来确认参数的个数。  
于是我去了解到了一种叫变参函数的东西，在stdarg.h里面定义有，在加上简单的字符串合成，最后用putchar()函数来输出，简单实现了My\_printf();  
![在这里插入图片描述](010b5f8f8ab04586b064091507c93133.png)  
代码如下:

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>

char * int_to_str(int num);
void My_printf(char *fmt, ...);

int main(int argc,char **argv)
{
	My_printf("%s %d %c %s %f","hello",666,'A',"sadasd",123.52);
	getchar();
	return 0;
}

char * int_to_str(int num)
{
    char * str = (char *)malloc(sizeof(char) * 20);
    itoa(num,str,10);
	return str;
}

void My_printf(char *format, ...)
{
	int str_len；

	va_list valist;
	int data_integer;
	char data_character;
	char * data_String;
	double data_float;

	char str[100] = "";
	char * str_i = str;

	va_start(valist, format);   	//指针地址赋值--初始化
	while(*format) 					//遍历fmt指针指向空间的值
	{
		//printf("%c",*fmt);
		if(*format == '%')
		{
			switch(*(format + 1)) 
			{
				case 's':              /* string */
					data_String = va_arg(valist, char *);
					//printf("字符串:%s\n", data_String);
					strcat(str,data_String);
					break;
				case 'd':              /* int */
					data_integer = va_arg(valist, int);
					//printf("整型:%d\n", data_integer);
					char *temp = int_to_str(data_integer);
					strcat(str,temp);
					free(temp);
					break;
				case 'f':              /* float */
					data_float = va_arg(valist, double);
					// printf("浮点数:%lf\n", data_float);
					char temp_arr[20];
					sprintf(temp_arr,"%lf",data_float);
					strcat(str,temp_arr);
					break;
				case 'c':              /* char */
					data_character = (char) va_arg(valist, int);
					//printf("字符:%c\n", data_character);
					int str_len = strlen(str);
					str[str_len] = data_character;
					str[str_len + 1] = '\0';
					break;
				default:
					break;
			}
			*format++;
		}
		else
		{
			str_len = strlen(str);
			str[str_len] = *format;
			str[str_len + 1] = '\0';
		}
		*format++;
	}
	va_end(valist); //将ap指针置为NULL

	int i = 0;
	while(str[i] != '\0')
		putchar(str[i++]);
}
```

这个代码其实还是有很多的不足，比如说“%.2f”可以实现打印保留两位小数的浮点数，还比如“\\n”可以实现换行打印。
