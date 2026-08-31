---
title: AutoWrite 自动打字机开发记：从模拟按键到发送消息
tags:
  - C语言
  - C++
  - Win32
abbrlink: 5dde1648
date: 2024-08-19 21:30:00
---

总有些场合，文字得靠键盘一个字一个字"敲"进去——目标输入框不吃复制粘贴，或者你只是想让朋友亲眼看着一段话"自己"出现在聊天框里。AutoWrite 就是干这个的：你把文本交给它，它替你把每个键按下去。项目做了两版，正好是 Windows 下模拟输入的两条技术路线——**第一版把自己变成键盘，第二版直接给窗口发消息**。第一版整理后传上了 GitHub：[AutoWrite](https://github.com/COSMICAL-CONTAINER/AutoWrite)（MIT 协议）。

## 第一版思路：把自己变成键盘

最早的版本（V0.0.1，2023 年 4 月）核心只有一个念头：程序不碰目标窗口，只负责**假装自己是键盘**。Windows 提供的 `keybd_event` 就是干这个的——给它一个虚拟键码（VK code），系统就当作这个键被按了一下：

```cpp
void write_word(int vk)//输入数字、字母
{
	keybd_event(vk,0,0,0);	// 按下
	keybd_event(vk,0,KEYEVENTF_KEYUP,0);	// 弹起
}
```

按下、弹起，两个事件，一个键就"敲"完了。字母数字都好办，麻烦的是符号——它们和主键区不是一对一的关系。比如 `*` `+` 这类键，键盘上根本没有独立的"*键"，它们住在数字小键盘上，虚拟键码是另一套：

```cpp
void WriteCharacter(int vk)//输入符号
{
	switch(vk)
	{
		case 42:
			keybd_event(106,0,0,0);		// '*' → 小键盘 VK_MULTIPLY
			keybd_event(106,0,KEYEVENTF_KEYUP,0);
			break;
		case 43:
			keybd_event(107,0,0,0);		// '+' → 小键盘 VK_ADD
			keybd_event(107,0,KEYEVENTF_KEYUP,0);
			break;
		case 44:
			keybd_event(108,0,0,0);		// ',' → 小键盘 VK_SEPARATOR
			keybd_event(108,0,KEYEVENTF_KEYUP,0);
			break;
		case '-':
			keybd_event(VK_OEM_MINUS,0,0,0);
			keybd_event(VK_OEM_MINUS,0,KEYEVENTF_KEYUP,0);
			break;
		case '.':
			keybd_event(VK_OEM_PERIOD,0,0,0);
			keybd_event(VK_OEM_PERIOD,0,KEYEVENTF_KEYUP,0);
			break;
		case 47:
			keybd_event(111,0,0,0);		// '/' → 小键盘 VK_DIVIDE
			keybd_event(111,0,KEYEVENTF_KEYUP,0);
			break;
        case ' ':
			keybd_event(0x20,0,0,0);
			keybd_event(0x20,0,KEYEVENTF_KEYUP,0);
			break;
	}
}
```

ASCII 码 42（`*`）要翻译成小键盘的 106（`VK_MULTIPLY`），45（`-`）对应的是 `VK_OEM_MINUS`——这张"ASCII 到虚拟键码"的对照表，就是自动打字机的第一块地基。

大小写是另一课。键盘上字母键只有一把，大小写靠的是 **Shift 这个修饰键**：

```cpp
void ShiftDown()//按下shift
{
	keybd_event(16,0,0,0);
}

void ShiftUp()//弹起shift
{
	keybd_event(16,0,KEYEVENTF_KEYUP,0);
}
```

`AutoWrite` 主循环把整套逻辑串起来：遍历字符串，按字符类别分发到上面三套机制：

```cpp
void AutoWrite(std::string word)//输入一串句子
{
	for(int i=0;i<word.length();i++)
	{
		int zm=word.at(i);
		if((zm >= 'a' && zm <= 'z'))
		{
			write_word(zm - 32);	// 'a' 发 'A' 的键码，不带 Shift，出来的就是小写
		}
		else if( zm >= 'A' && zm <= 'Z' )
		{
			ShiftDown();
			write_word(zm);
			ShiftUp();
		}
		else if(zm>41 && zm<48 || zm == ' ' || zm == '.')
		{
			WriteCharacter(zm);
		}
		Sleep(10);
	}
}
```

这里藏着自动打字机的第一课：`write_word(zm - 32)` 把 `'a'` 换成 `'A'` 的键码发出去——**不带 Shift 按字母键，出来的就是小写**。键盘事件的世界里没有"小写键码"，只有"字母键码 + Shift 状态"的组合；真正需要 Shift 陪跑的反而是大写字母。符号分支的守卫条件 `zm>41 && zm<48` 用的还是 ASCII 码区间——42 到 47 正是 `* + , - . /` 一族。

每敲一个键 `Sleep(10)`——太快了有些程序的消息循环跟不上，会丢字。这个"每个键之间留一口气"的节奏问题，后面还会回来找两次麻烦。当时的 main 也特别直白：两秒倒计时之后，打 10 遍 `nihao`，每遍跟一个回车，纯粹的开机自检。

```cpp
int main()
{
	std::cout<<"程序开始!"<<std::endl;
	Sleep(2000);
	for(int i=0;i<10;i++)
	{
		AutoWrite("nihao");
		Enter();
	}
	return 0;
}
```

## 升级成正经程序：GUI 版

命令行版能用，但每次都得先点开目标窗口再切回终端回车，手忙脚乱。于是到了 V0.0.x 的后期，它长成了一个大方的 Win32 程序：**窗口里一个多行文本框，把想打的字粘进去，点一下"点我开始"，然后你有两秒钟把光标移到真正的目标输入框里**，剩下的事交给程序。

```cpp
case WM_COMMAND:
	if (LOWORD(wParam) == 1)	// "点我开始"按钮
	{
		int n = GetWindowTextLength(hEditName);		// 获取文本框中的文本长度
		if (n > 0)
		{
			TCHAR *szBuffer = (TCHAR *)malloc(sizeof(char) * (n + 1));	// 缓冲区
			GetWindowText(hEditName, szBuffer, n + 1);	// 获取文本

			// 校验字符是否都在支持范围内，然后：
			MessageBox(NULL, "请在关闭我之后2s内将输入指针移动到想要输入文字的框中", "提示", MB_OK | MB_ICONINFORMATION);
			Sleep(2000);
			AutoWrite(szBuffer);
			free(szBuffer);
		}
	}
	break;
```

这里有个容易忽略的细节：拿文本框内容不能直接读，得**先问长度、再按长度开缓冲区**——`GetWindowTextLength` + `malloc(n+1)` + `GetWindowText` 三连。早期的版本这里是个写死的 2048 字节数组（更新记录 V0.0.1 里"增加 buffer 区设置为 2048"就是它），超长文本直接爆，V0.0.2 改成了动态申请，才有了这段标准三连。

按键的核心也从 `keybd_event` 换成了新一代的 `SendInput`：

```cpp
void write_word(unsigned char vk)
{
	// keybd_event(vk,0,0,0);
	// keybd_event(vk,0,KEYEVENTF_KEYUP,0);
	INPUT inputs = {0};

	inputs.type = INPUT_KEYBOARD;
	inputs.ki.wVk = vk;

	UINT uSent = SendInput(1, &inputs, sizeof(INPUT));
	if (uSent != 1)
	{
		cout << L"SendInput failed: " << HRESULT_FROM_WIN32(GetLastError()) << endl;
	}
}
```

注意注释里保留的老写法——`keybd_event` 和 `SendInput` 干的是同一件事，但 `SendInput` 把一批按键事件**打包成原子操作**一次性注入，中间不会被真实的键鼠输入插队；`keybd_event` 是一次一个事件，两个调用之间你的手如果真的碰了键盘，序列就被污染了。对自动打字机来说这个区别是实质性的，所以换代，老代码留着当注释当纪念。

这一版的完整代码在仓库里：

```cpp AutoWrite.cpp
#include <windows.h>
#include <string>
#include <iostream>
using namespace std;

#define VERSION "0.0.5"
#define IDI_MYICON 101

// 微软虚拟键代码
// https://learn.microsoft.com/zh-cn/windows/win32/inputdev/virtual-key-codes
// 输入数字、字母
void write_word(unsigned char vk)
{
    // keybd_event(vk,0,0,0);
    // keybd_event(vk,0,KEYEVENTF_KEYUP,0);
    INPUT inputs = {0};

    inputs.type = INPUT_KEYBOARD;
    inputs.ki.wVk = vk;

    UINT uSent = SendInput(1, &inputs, sizeof(INPUT));
    if (uSent != 1)
    {
        cout << L"SendInput failed: " << HRESULT_FROM_WIN32(GetLastError()) << endl;
    }
}

// 输入符号
void WriteCharacter(unsigned char vk)
{
    switch (vk)
    {
    case '-':
        keybd_event(VK_OEM_MINUS, 0, 0, 0);
        keybd_event(VK_OEM_MINUS, 0, KEYEVENTF_KEYUP, 0);
        break;
    case '.':
        keybd_event(VK_OEM_PERIOD, 0, 0, 0);
        keybd_event(VK_OEM_PERIOD, 0, KEYEVENTF_KEYUP, 0);
        break;
    case ' ':
        keybd_event(0x20, 0, 0, 0);
        keybd_event(0x20, 0, KEYEVENTF_KEYUP, 0);
        break;
    case '\'':
        keybd_event(VK_OEM_7, 0, 0, 0);
        keybd_event(VK_OEM_7, 0, KEYEVENTF_KEYUP, 0);
        break;
    }
}

void Enter()
{
    keybd_event(13, 0, 0, 0);
    keybd_event(13, 0, KEYEVENTF_KEYUP, 0);
}

void ShiftDown() // 按下shift
{
    keybd_event(16, 0, 0, 0);
}

void ShiftUp() // 弹起shift
{
    keybd_event(16, 0, KEYEVENTF_KEYUP, 0);
}

void CtrlV() // 粘贴
{
    keybd_event(162, 0, 0, 0);
    write_word('V');
    keybd_event(162, 0, KEYEVENTF_KEYUP, 0);
}

void AutoWrite(string word) // 输入一串句子
{
    size_t n = word.length();

    for (size_t i = 0; i < n; i++)
    {
        unsigned char zm = word.at(i);
        if ((zm >= 'a' && zm <= 'z'))
        {
            write_word(zm - 32);
        }
        else if (zm >= 'A' && zm <= 'Z')
        {
            ShiftDown();
            write_word(zm);
            ShiftUp();
        }
        else if ((zm >= '0' && zm <= '9'))
        {
            write_word(zm);
        }
        else if (zm == ' ' || zm == '.' || zm == '-' || zm == '\'')
        {
            WriteCharacter(zm);
        }
        Sleep(10);
    }
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam)
{
    static HWND hEditName;
    switch (msg)
    {
    case WM_CREATE:
    {
        // 创建文本框
        hEditName = CreateWindow(
            TEXT("Edit"),
            TEXT(""),
            WS_CHILD | WS_VISIBLE | WS_BORDER /*边框*/ | WS_TABSTOP /*允许使用TAB选中*/ | ES_MULTILINE,
            10, 10, 765, 500,
            hwnd,
            (HMENU)2,
            (HINSTANCE)(LONG_PTR)GetWindowLong(hwnd, GWLP_HINSTANCE),
            NULL);
        break;
    }
    case WM_DESTROY:
        PostQuitMessage(0);
        break;
    case WM_COMMAND:
        if (LOWORD(wParam) == 1)
        {
            bool isrightstr = true;

            int n = GetWindowTextLength(hEditName); // 获取文本框中的文本长度 描述：获取文本框中的文本长度;
            if (n > 0)
            {
                TCHAR *szBuffer = (TCHAR *)malloc(sizeof(char) * (n + 1)); // 缓冲区
                GetWindowText(hEditName, szBuffer, n + 1);                 // 获取文本
                szBuffer[n + 1] = '\0';

                for (char c = szBuffer[0]; c != '\0'; c = szBuffer[++n])
                {
                    // 检查字符串是否符合要求
                    if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == ' ' || c == '.' || c == '\''))
                    {
                        isrightstr = false;
                        break;
                    }
                }

                if (isrightstr)
                {
                    MessageBox(NULL, "请在关闭我之后2s内将输入指针移动到想要输入文字的框中", "提示", MB_OK | MB_ICONINFORMATION);
                    Sleep(2000);
                    AutoWrite(szBuffer);
                }
                else
                {
                    MessageBox(NULL, "不是有效的字符串", "提示", MB_OK | MB_ICONINFORMATION);
                }
                free(szBuffer);
            }
            else
            {
                MessageBox(NULL, "你TM倒是输入啊", "提示", MB_OK | MB_ICONWARNING);
            }
        }
        break;
    default:
        return DefWindowProc(hwnd, msg, wParam, lParam);
    }
    return 0;
}
int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
    ShowWindow(GetConsoleWindow(), SW_HIDE);

    const char CLASS_NAME[] = "Hello, World!";

    WNDCLASS wc = {0};

    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = CLASS_NAME;

    // HICON hIcon = (HICON)LoadImage(NULL, "MYICON.ico", IMAGE_ICON, 0, 0, LR_LOADFROMFILE);
    HICON hIcon = LoadIcon(GetModuleHandle(NULL), MAKEINTRESOURCE(IDI_MYICON));

    wc.hIcon = hIcon;

    // 其他窗口类成员的初始化
    RegisterClass(&wc);

    HWND hwnd = CreateWindowEx(
        0,                                                                   // Optional window styles.
        CLASS_NAME,                                                          // Window class
        ("AutoWrite - 自动打字机 作者：寰宇体 V" + string(VERSION)).c_str(), // Window text
        WS_OVERLAPPEDWINDOW,                                                 // Window style

        // Size and position
        100, 100, 800, 600,

        NULL,      // Parent window
        NULL,      // Menu
        hInstance, // Instance handle
        NULL       // Additional application data
    );

    if (hwnd == NULL)
    {
        return 0;
    }

    SendMessage(hwnd, WM_SETICON, ICON_SMALL, (LPARAM)hIcon);

    // Add button
    CreateWindow(
        "BUTTON",                                              // Predefined class; Unicode assumed
        "点我开始",                                            // Button text
        WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON, // Styles
        350,                                                   // x position
        525,                                                   // y position
        100,                                                   // Button width
        30,                                                    // Button height
        hwnd,                                                  // Parent window
        (HMENU)1,                                              // Button identifier.
        (HINSTANCE)(LONG_PTR)GetWindowLong(hwnd, GWLP_HINSTANCE),
        NULL); // Pointer not needed.

    ShowWindow(hwnd, nCmdShow);

    MessageBox(hwnd, ("本代码由寰宇体制作 建议不要输入太多字符 版本" + string(VERSION)).c_str(), "提示", MB_OK);

    MSG msg = {};
    while (GetMessage(&msg, NULL, 0, 0))
    {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    return 0;
}
```

这一版还有两个工程化的小升级值得记一笔。**图标不再从文件加载**：早期注释里的写法是运行时 `LoadImage` 去 读 `MYICON.ico`，图标文件和 exe 分家，发给别人就丢图标；后来改成 `.rc` 资源脚本把 ico 编进 exe，`LoadIcon(MAKEINTRESOURCE(IDI_MYICON))` 直接从模块里取。**控制台窗口被藏起来**：`ShowWindow(GetConsoleWindow(), SW_HIDE)`，编译出的程序是个纯粹的窗口应用，背后不带一个黑框。

## 更新记录：五个版本号，五个 bug

这个项目的文件夹里一直躺着一份手写的更新记录，是最朴素但也最真实的开发日志：

```text 更新记录.txt
AutoWrite V0.0.1
0.建立新工程
1.完成基本功能的书写
2.在增加buffer区设置为2048

AutoWrite V0.0.2
0.修复个别电脑缺少dll文件的bug，使用静态编译dll办法
1.移除buffer大小限制，使用动态申请内存建立buffer区
2.增加打字前的提示窗口，可以将窗口拖拽到对应的文本控件上

AutoWrite V0.0.3
0.修复不能输入数字的bug

AutoWrite V0.0.4
0.修复最后一个字母不会打印的bug

AutoWrite V0.0.5
0.修复不能输入'\''字符的bug
```

五条记录里有三条是"某类字符打不出来"：数字、最后一个字母、单引号。这正是模拟键盘路线的宿命——**每一种字符都得有人替它安排好按哪个键**。数字忘了接、循环边界少走一步、引号这种藏在 `VK_OEM_7` 里的冷门键，谁没安排谁就打不出来。V0.0.5 把单引号补进 `WriteCharacter` 的 switch 之后，这个字符集就冻结了：字母、数字、空格、`-`、`.`、`'`，GUI 里的合法性校验也是按这张表来的。

V0.0.2 的"静态编译 dll 办法"值得单独说：程序在自己电脑上跑得好好的，发到别人电脑上弹"缺少 xxx.dll"——动态链接的运行库别人机器上没有。`-static-libgcc -static-libstdc++` 把运行库直接打进 exe，体积大一点，换来双击就能跑。

## 第二版：换掉整个输入模型

键盘模拟用了一年多，2024 年年中重写时我决定换掉整个模型。模拟键盘的本质是**往系统级输入队列里插键**，字打给"当前焦点"——它快不了（每键之间要 Sleep），也精准不了（焦点飘了就打错地方）。更优雅的思路是：**拿到目标窗口的句柄，直接把字符消息塞进它的消息队列**，绕过键盘状态，定点投递。

定点投递的第一步是拿到"真正有输入焦点"的那个控件句柄。直接 `GetForegroundWindow` 拿到的是主窗口，而光标闪动的往往是里面的子控件（比如聊天输入框）。这需要一个不太出名的 API 三连：

```c
// 获得当前激活的窗口句柄
wnd = GetForegroundWindow();
// 获取本身的线程ID
DWORD SelfThreadId = GetCurrentThreadId();
// 根据窗口句柄获取线程ID
DWORD ForeThreadId = GetWindowThreadProcessId(wnd, NULL);
// 附加线程
AttachThreadInput(ForeThreadId, SelfThreadId, 1);
// 获取具有输入焦点的窗口句柄
wnd = GetFocus();
// 取消附加的线程
AttachThreadInput(ForeThreadId, SelfThreadId, 0);
```

`GetFocus` 只能拿到**自己线程内**的焦点窗口，对别的线程无能为力。`AttachThreadInput` 把自己的线程暂时"挂"到目标窗口的输入线程上，共享同一份输入状态——这时 `GetFocus` 就能拿到对方线程里真正闪着光标的控件了。用完立刻解除附加。这是 Win32 时代留下的老技巧，MSDN 对它的警告一大堆，但"拿别家程序的焦点控件句柄"这一件事，至今没有更体面的办法。

拿到句柄之后，字符就不用"按键"了，直接 `PostMessage` 投递：

```c
for(int j = 0; j < strlen(s); )
{
    if((s[j] & 0x80) >> 7)
    {
        PostMessageA(wnd, WM_IME_CHAR, (WPARAM)transmit(&s[j]), 0);
        j += 2;
    }
    else
    {
        PostMessageA(wnd, WM_CHAR, (WPARAM)s[j], 0);
        j += 1;
    }
    Sleep(1);
}
```

ASCII 字符走 `WM_CHAR`，一个字节一步；`(s[j] & 0x80) >> 7` 判断最高位是不是 1——GBK 编码下中文每个字节的最高位都是 1，这是区分中英文最朴素也最好用的办法。是中文就走 `WM_IME_CHAR`，一次投递**两个字节**。

而这两个字节的组装方式，是整个重写版里最有趣的一段：

```c
unsigned long long int transmit(char* s)
{
    return (((*(int *)s) & 0x0000FF00) >> 8) + (((*(int *)s) & 0x000000FF) << 8);
}
```

一行看着像乱码的位运算，干的事是**字节对调**。拆开看：GBK 编码的"测"是 `0xB2 0xE2`，在内存里按顺序躺在 `s[0]`、`s[1]`。小端机器把这两个字节读进 int，低地址在低位——`& 0xFF` 取出来的是 `s[0]`，`& 0xFF00 >> 8` 取出来的是 `s[1]`。`WM_IME_CHAR` 的约定是 **wParam 高 8 位放首字节（lead byte），低 8 位放次字节**，而内存顺序恰好相反，所以要把两个字节换个位置再拼起来：`s[1]` 原地取高八位腾地方，`s[0]` 左移八位坐进去，`0xB2E2` 完成对调。没有这步对调，目标窗口收到的每个"中文"都是乱码。

这个模型的字符串节奏也和键盘版完全不同：`Sleep(1)` 甚至可以更激进，因为消息投递没有键盘缓冲区排队的压力；回车单独用 `SendInput` 模拟——字符走定点投递，而"回车"往往要触发的是对话框层面的默认按钮（比如聊天窗口的"发送"），那是主窗口的消息循环在处理，模拟一个真实的回车键最保险。

## 字库：把要打的字和打字机分开

重写版还有个工程上的小进步：**要打的文本不再写死在 main 里，而是集中放到一个"字库"头文件** `AutoWriteFont.h` 里，用字符串数组组织，一行一句，空字符串结尾：

```c
char *guisuishou[] = {
                      "龟虽寿",
                "东汉末年/三国·曹操" ,
                "神龟虽寿,犹有竟时；",
                "腾蛇乘雾,终为土灰。",
                "老骥伏枥,志在千里；",
                "烈士暮年,壮心不已。",
                "",
            };
```

诗、段子、长文本各占一个数组，`main` 里想打哪段就传哪段。字库和打字机分离之后，加新内容不用碰任何逻辑代码。

长文本还有个实际问题：一次性灌进去，中间的标点不该停顿吗？重写版自己写了一个 `my_strtok`——标准库 `strtok` 只认单字节分隔符，全角的"，！。？"在 GBK 里是两个字节，硬切会把汉字腰斩。自研版在比较时多加一条：**两边都是全角标点区间（`0xFF01`~`0xFF5E`）的字符也算匹配**，然后把长文按"，！。？"切成句子，一句一句投递。这个函数是先单独扔进 `test.c` 里测通了，才搬回主程序的——先写测试再集成，对这种字符串切片函数来说性价比极高。

## 两条路线，各自的位置

| | 第一版：模拟键盘 | 第二版：消息投递 |
|---|---|---|
| 原理 | `SendInput` 往系统输入队列插键 | `PostMessage` 直达控件消息队列 |
| 打给谁 | 当前焦点窗口（谁有焦点打谁） | 指定句柄（指哪打哪） |
| 中文 | 要先切输入法，靠 IME 逐字上屏 | `WM_IME_CHAR` 直接投双字节 |
| 速度 | 每键 `Sleep(10)` 起步 | `Sleep(1)` 都算奢侈 |
| 盲区 | 无——任何程序都当真键盘 | 只对标准 Edit 类控件生效 |

模拟键盘是"万能的笨办法"：慢，但所有程序都把它当真键盘，自绘输入框、游戏、甚至 BIOS 级别的界面都吃这一套。消息投递是"聪明的小路"：快、准、能打中文，但离开标准控件就失灵。AutoWrite 两版都留着——工具箱里多一把枪，永远不亏。

第二版的完整代码和字库目前躺在本地工程里，仓库里的是第一版的定稿。如果这个从"假装键盘"进化到"直接写信"的小东西对你有启发，源码在 [AutoWrite](https://github.com/COSMICAL-CONTAINER/AutoWrite)（MIT），随便玩。
