---
title: VB6.0 操作注册表
abbrlink: 135991a0
date: 2021-07-13 00:00:00
---

# VB6.0操作注册表

**本程序在Windows7系统下测试，Windows10系统注册表好像有变化，但修改的代码不会有变，可自行设计。**

本文将介绍用CreateObject(“wscript.shell”)创建对象来操作注册表

本文操作的注册表目录是**HKEY\_CLASSES\_ROOT\\Directory\\Background\\shell**  
也就是桌面菜单右键

下面看一下效果图：  
![在这里插入图片描述](20210713104324418.png)

其中python 注册表 重载文件资源管理器都是我自己添加的，在桌面右键菜单就可以直接打开，十分方便

下面我们来看一下自己动手怎么实现：

![在这里插入图片描述](20210713104727841.png)  
**在注册表里面是这个样子，这里显示的是名字。**

![在这里插入图片描述](20210713104908518.png)  
**这里看到是ico文件的设置，也就是图标**

![在这里插入图片描述](2021071310501599.png)  
**这里看到的就是点击的时候执行的命令，可以是一个路径，也可以是一条指令。**

接下来我们用Vb6.0实现添加注册表的功能

```plaintext
Dim WSH
Set WSH = CreateObject("WSCRIPT.SHELL")
WSH.RegWrite "HKEY_CLASSES_ROOT\Directory\Background\shell\test\test", "test"        '写入注册表
```

运行完后是这样的：

![在这里插入图片描述](20210713105751571.png)  
下面这个代码可以加入python到右键菜单中

```plaintext
Dim WSH
Set WSH = CreateObject("WSCRIPT.SHELL")
WSH.RegWrite "D:\python\python.exe","D:\python\python.exe" 
```

测试效果：

![在这里插入图片描述](20210713111014736.gif)  
![在这里插入图片描述](20210713111138242.gif)  
其实挺方便的。  
其实还可以做一个界面让用户自己输入自己想要运行的程序，代码如下：

```plaintext
Private Sub Command_openfile1_Click()
CommonDialog_exe.FileName = ""
CommonDialog_exe.Filter = "可执行应用程序(*.exe)|*.exe"
CommonDialog_exe.FilterIndex = 2
CommonDialog_exe.DialogTitle = "选择可执行应用程序(*.exe)"
CommonDialog_exe.ShowOpen
If CommonDialog_exe.FileName = "" Then
    a = "Nnothing"
Else
    Text_command.Text = CommonDialog_exe.FileName
End If
End Sub


Private Sub Command_openfile2_Click()
CommonDialog_exe.FileName = ""
CommonDialog_exe.Filter = "应用程序或图标文件(*.exe;*.ico)|*.exe;*.ico）"
CommonDialog_exe.FilterIndex = 2
CommonDialog_exe.DialogTitle = "选择图标(*.ico,*.exe)"
CommonDialog_exe.ShowOpen
If CommonDialog_exe.FileName = "" Then
    a = "Nnothing"
Else
    Text_ico.Text = CommonDialog_exe.FileName
End If
End Sub

Private Sub Command_run_Click()
Set WSH = CreateObject("wscript.shell")
reg_name_ico = "HKEY_CLASSES_ROOT\Directory\Background\shell\" + Text_name.Text + "\icon"
If Text_ico.Text = "" Then
    
WSH.RegWrite reg_name_ico, Text_ico.Text

reg_name = "HKEY_CLASSES_ROOT\Directory\Background\shell\" + Text_name.Text + "\command\"
reg_command = Text_command.Text
WSH.RegWrite reg_name, reg_command
MsgBox "添加成功"
End Sub

Private Sub Text_name_Change()
Text1.Text = "HKEY_CLASSES_ROOT\Directory\Background\shell\" + Text_name.Text + "\command\"
End Sub
```

下面是程序里各个控件名称：  
![在这里插入图片描述](20210713111847144.png)  
测试：

![在这里插入图片描述](20210713112242637.gif)  
十分的方便和快捷，点个赞吧，程序和源码连接如下：

[CSDN \[VB6.0源码\]注册表编辑器+exe文件.zip](https://download.csdn.net/download/qq_28406527/20234916)
