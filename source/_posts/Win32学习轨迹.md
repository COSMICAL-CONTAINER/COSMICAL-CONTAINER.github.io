---
title: 从黑窗口到窗口：我的 Win32 学习轨迹
tags:
  - C语言
  - Win32
  - Windows
abbrlink: 91c3b2d7
date: 2023-07-06 11:05:00
---

学 C 语言的前半年，我的程序全都活在一个黑窗口里——`printf` 进，`scanf` 出。2023 年 2 月，我决定去摸一摸 Windows 真正的样子：窗口、消息、控件、对话框。到 7 月，我已经能在内存里徒手拼出一个对话框、写出一个带菜单和列表视图的课程设计。这篇文章按时间顺序复盘这条轨迹的四个站点：**鼠标热身 → 第一个窗口 → 内存里手搓对话框 → 学生考勤管理系统**。

## 热身：做一个鼠标监听器

进 Win32 的世界之前，先在控制台里热身。目标很简单：实时显示鼠标坐标、统计左右键点击次数。核心是两个 API——`GetAsyncKeyState` 查按键状态、`GetCursorPos` 拿坐标：

```cpp 鼠标检测.cpp
#include <windows.h>                			//GetAsyncKeyState所需头文件
#include <iostream>
#define KEY_DOWN(VK_NONAME) ((GetAsyncKeyState(VK_NONAME) & 0x8000) ? 1:0)  //用来检测按键的点击事件
using namespace std;

int main() {
	int a=1,b=1; //计数器
	//----------移除快速编辑模式(对于Win10用户)----------//
	HANDLE hStdin = GetStdHandle(STD_INPUT_HANDLE);
	DWORD mode;
	GetConsoleMode(hStdin, &mode);
	mode &= ~ENABLE_QUICK_EDIT_MODE;
	SetConsoleMode(hStdin, mode);

	POINT point;
	//----------循环检测----------//
	while(true) {                      			//循环检测
		if(KEY_DOWN(VK_LBUTTON)) {  			//鼠标左键按下
			cout<<"鼠标左键被按下"<<a<<"次"<<endl<<endl;
			a++;
		}
		if(KEY_DOWN(VK_RBUTTON)) {             //鼠标右键按下
			cout<<"鼠标右键被按下"<<b<<"次"<<endl<<endl;
			b++;
		}

		GetCursorPos(&point);            		//获取鼠标位置
		cout << point.x << "," << point.y << endl;

		Sleep(100);                  			//等待100毫秒，减少CPU占用
	}

	return 0;
}
```

这段小代码里藏着一个 Win10 用户才会懂的坑：**控制台的"快速编辑模式"**。你在控制台里点一下鼠标选中文本，整个程序就暂停了——对交互程序是致命的。所以开头那几行 `GetConsoleMode`/`SetConsoleMode` 不是废话，是把快速编辑模式摘掉。另一个习惯也在这里养成：循环里的 `Sleep(100)`，不睡觉的轮询会把 CPU 吃满。

## 第一个窗口：四件套

真正的起点是窗口。Win32 的窗口程序有一套固定仪式，四件套缺一不可：**注册窗口类 → 创建窗口 → 消息循环 → 窗口过程**。我的第一个窗口（wind.c）在这套骨架上多玩了两个控件——一个按钮和一个列表框，按钮按下就往列表框里塞一条消息：

```c wind.c
#include <windows.h>

int DisplayConfirmSaveAsMessageBox()
{
    int msgboxID = MessageBox(
        NULL,
        "temp.txt already exists.\nDo you want to replace it?",
        "Confirm Save As",
        MB_ICONEXCLAMATION | MB_YESNO
    );

    if (msgboxID == IDYES)
    {
        // TODO: add code
    }

    return msgboxID;
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam)
{
    switch (msg)
    {
        case WM_DESTROY:
            PostQuitMessage(0);
            break;
        case WM_COMMAND:
            if (LOWORD(wParam) == 1)
            {
                DisplayConfirmSaveAsMessageBox();
                HWND hListBox = GetDlgItem(hwnd, 2);
                if(hListBox == NULL)
                    MessageBox(NULL, "NULL!", "Button", MB_OK);
                SendMessage(hListBox, LB_ADDSTRING, 0, (LPARAM)"Button clicked!");
                InvalidateRect(hListBox, NULL, TRUE);
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

    WNDCLASS wc = { };

    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = CLASS_NAME;

    RegisterClass(&wc);

    HWND hwnd = CreateWindowEx(
        0,
        CLASS_NAME,
        "Hello, World!",
        WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT,
        NULL,
        NULL,
        hInstance,
        NULL
    );

    if (hwnd == NULL)
    {
        return 0;
    }
    CreateWindow(
        "BUTTON", "Click me",
        WS_TABSTOP | WS_VISIBLE | WS_CHILD | BS_DEFPUSHBUTTON,
        10, 10, 100, 30,
        hwnd, (HMENU)1,
        (HINSTANCE)(LONG_PTR)GetWindowLong(hwnd, GWLP_HINSTANCE),
        NULL);

    CreateWindow(
        "LISTBOX", "",
        WS_VISIBLE | WS_CHILD | LBS_STANDARD,
        10, 50, 500, 200,
        hwnd, (HMENU)2,
        (HINSTANCE)(LONG_PTR)GetWindowLong(hwnd, GWLP_HINSTANCE),
        NULL);

    ShowWindow(hwnd, nCmdShow);

    MSG msg = { };
    while (GetMessage(&msg, NULL, 0, 0))
    {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    return 0;
}
```

这里要理解的核心机制是**消息驱动**：程序不再是从上到下执行完就结束，而是进入 `GetMessage` 死循环，等 Windows 把事件（点击、按键、关闭）打包成"消息"投递给 `WndProc`，由它分发处理。按钮被点击时，`WM_COMMAND` 消息的 `wParam` 低 16 位带着创建按钮时给的那个 ID——`(HMENU)1`——`WndProc` 靠这个编号认出是哪个控件在说话。

另外注意第一行的 `ShowWindow(GetConsoleWindow(), SW_HIDE)`：WinMain 编译出的程序默认还拖着个控制台黑框，一行代码把它藏起来，程序才算"像个 Windows 程序"。

## 进阶：在内存里手搓一个对话框

资源文件里的对话框见得多了，但微软的文档里藏着一个更野的玩法：**在内存里直接拼一张对话框模板**，运行时用 `DialogBoxIndirect` 凭空创建。`动态创建对话框.c`（以及它的前身"乱搞的创建窗口.c"）干的就是这个。

流程是：`GlobalAlloc` 切一大块零初始化内存，然后按 `DLGTEMPLATE` 结构的格式**一个字段一个字段地填**——先填对话框的样式、控件数、坐标，再逐个填控件模板，每个控件之间用 `lpwAlign` 对齐到 DWORD 边界：

```c
hgbl = GlobalAlloc(GMEM_ZEROINIT, 2048);
lpdt = (LPDLGTEMPLATE)GlobalLock(hgbl);

lpdt->style = WS_POPUP | WS_BORDER | WS_SYSMENU | DS_MODALFRAME | WS_CAPTION;
lpdt->cdit = 2;         // 控件数量
lpdt->x  = 10;  lpdt->y  = 10;
lpdt->cx = 200; lpdt->cy = 200;

lpw = (LPWORD)(lpdt + 1);
*lpw++ = 0;             // 无菜单
*lpw++ = 0;             // 默认对话框类

lpwsz = (LPWSTR)lpw;
nchar = 1 + MultiByteToWideChar(CP_ACP, 0, "My Dialog", -1, lpwsz, 50);
lpw += nchar;

lpw = lpwAlign(lpw);    // 对齐到 DWORD 边界
lpdit = (LPDLGTEMPLATE)lpw;
lpdit->x  = 150; lpdit->y  = 0;
lpdit->cx = 50; lpdit->cy = 20;
lpdit->id = IDOK;
lpdit->style = WS_CHILD | WS_VISIBLE | BS_DEFPUSHBUTTON;
...
ret = DialogBoxIndirect(hinst, (LPDLGTEMPLATE)hgbl, hwndOwner, (DLGPROC)DialogProc);
```

这套写法我是照着微软官方文档的示例一步步复刻的，但复刻的过程把三个概念焊进了脑子：**模板是一段有格式的二进制，不是配置文件**；**对齐不是玄学**（`lpwAlign` 那个把指针推到 4 字节边界的函数，错一步整个模板解析全乱）；**控件的类名用 `0xFFFF + 原子值` 表示**（按钮是 0x0080）——系统控件在注册表里早已注册，报个编号就行。

## 收官：学生考勤管理系统

这条轨迹的终点是 2023 年 4 月的课程设计：一个完整的学生考勤管理系统，单文件 32KB，纯 Win32。源码单独建了仓库：[Student-Attendance-System](https://github.com/COSMICAL-CONTAINER/Student-Attendance-System)。它是跟着微软官方教程的代码一步一步搭起来的，但搭完之后，之前轨迹上的每样东西都在里面派上了用场：

**控件编号用宏管理。** 四组"姓名 / 年龄 / 学号 / 班级"标签加编辑框，每个控件一个宏编号——这是从 wind.c 里 `(HMENU)1`、`(HMENU)2` 的裸数字进化来的：

```c
#define ID_TEXT_NAME    11
#define ID_TEXT_AGE     12
#define ID_TEXT_ID      13
#define ID_TEXT_CLASS   14

#define ID_EDIT_NAME  21  // edit control id for name
#define ID_EDIT_AGE   22
#define ID_EDIT_ID    23
#define ID_EDIT_CLASS 24
```

**静态标签 + 编辑框**成对创建，`CreateTextAndEdit` 一个函数把整个录入表单铺出来：

```c
hLabUsername = CreateWindow(
    TEXT("static"),
    TEXT("姓名："),
    WS_CHILD | WS_VISIBLE | SS_CENTERIMAGE /*垂直居中*/ | SS_RIGHT /*水平居右*/,
    0, 20, 70, 26,
    hwndDlg,
    (HMENU)ID_TEXT_NAME,
    hInst,
    NULL);
```

**ListView 当主界面**——增删改查的载体。列名用 `InsertListViewColumns` 建好，学生数据一条条 `InsertListViewItems` 塞进去，选中删除走 `DeleteListViewChooseItems`。**菜单**挂了打开、保存、退出和编辑操作（复制/粘贴/剪切/删除）。整站三个窗口过程（主窗口、添加窗口、修改窗口）各管各的消息。

最值得一提的是它把前面"内存拼对话框"的技能直接复用了：添加和修改学生信息的弹窗，不是资源文件里的静态模板，而是运行时 `GlobalAlloc` + `DLGTEMPLATE` 现场拼出来的——学到的招式真的被用上了。

## 轨迹复盘

回头看这条从 2 月到 7 月的轨迹，有三个记忆点值得单独立此存照：

**快速编辑模式的坑。** 不摘掉它，控制台程序点一下鼠标就假死——这种坑只有踩过才知道，文档里绝不会写。

**`lpwAlign` 的意义。** 对齐这个问题，在结构体那一章人人都"学过"，但只有当你亲手在一段二进制里靠 `lpwAlign(lpw)` 跳过 2 个字节、否则整个对话框解析崩掉的时候，对齐才从考点变成常识。

**藏起黑框。** `ShowWindow(GetConsoleWindow(), SW_HIDE)`——一行代码的仪式感，程序从"学 C 时的作业"变成"一个 Windows 程序"。

Win32 如今已经很老了，老到新项目都不好意思用它。但它就是 Windows 本身：今天所有现代框架的窗口、消息、控件，剥开壳都是在调这一套。要理解一个系统，没有比用它最裸的方式驱动它更好的入口了。
