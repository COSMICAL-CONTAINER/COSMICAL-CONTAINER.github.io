---
title: Matrix 开发记：用 C 写一个矩阵运算库
tags:
  - C语言
  - 线性代数
  - 指针
abbrlink: 469ca244
date: 2023-03-01 16:07:00
---

2023 年 2 月 28 日，我开了自己的第一个"系统级"项目：mathematics-system，目标是用 C 写一套数学工具。打头阵的就是这个矩阵库 Matrix——创建、加减、数乘、转置、行列式、求逆、求秩，一天之内从 V1.0 迭代到 V1.0.1。后来这个屋檐下又住进了字符串大整数 [BigInterge](/posts/4d6809c9/)，整个项目都在 GitHub 的 [Mathematics-System](https://github.com/COSMICAL-CONTAINER/Mathematics-System) 仓库里。

> 📌 更新（2026-08-31）：为写这篇重新编译复现了全套测试，并当场抓到了行列式一节的堆崩溃——详见复盘一节。

头文件是当年最流行的 Doxygen 风格大注释，认真到标了"取代版本"：

```c
/*
 * 文件名称：Matrix.h
 * 摘    要：本文件主要是矩阵相关函数的声明
 *
 * 当前版本：1.0.1
 * 作    者：寰宇体(Cosmical Container)
 * 完成日期：2023年3月1日
 *
 * 取代版本：1.0.0
 * 原作者  ：寰宇体(Cosmical Container)
 * 完成日期：2023年2月28日
 */
```

## 数据结构：float 的二维指针

矩阵本体是三件套——行数、列数、指向数据的二级指针：

```c
typedef struct
{
    int row;
    int col;
    float **data;
}Matrix;
```

`float **data` 的布局值得展开讲：它不是一块连续的二维内存，而是**"行的指针数组"**——`data` 指向一个 `float*` 数组，每个元素再各自指向一行。创建时要先分配行指针数组，再逐行分配：

```c
mat->data = (float**)MatrixMalloc(row * sizeof(float*));
...
for (int i = 0; i < row; i++)
{
    mat->data[i] = (float*)MatrixMalloc(col * sizeof(float));
    ...
    for (int j = 0; j < col; j++)
    {
        mat->data[i][j] = 0;
    }
}
```

这样换来的甜头是 `mat->data[i][j]` 和数学书写完全一致；代价是内存不连续、要逐行释放。初始化函数 `InitMatrix` 还藏着一个小巧思：调用方给的是一个**扁平的一维 int 数组**，用 `arr[i * mat->col + j]` 这一个下标公式把它摊到二维格子上——行主序的手动展开。

销毁是创建的镜像，三层 free 逐层拆：先拆每行，再拆行指针数组，最后拆结构体。`DestroyMatrix` 开头就判空返回，配合下面这对宏，构成了这个库的错误处理风格：

```c
#define Check_NULL_Matrix_return(mat)         \
    if ( mat == NULL )                        \
    {                                         \
        MatrixError("The matrix is NULL!");   \
        return NULL;                          \
    }

#define Check_NULL_Matrix_exit(mat)           \
    if ( mat == NULL )                        \
    {                                         \
        MatrixError("The matrix is NULL!");   \
        exit(-1);                             \
    }
```

同一个问题准备了两个宏：一个报错后返回 NULL，一个报错后直接退出。什么时候该返回、什么时候该退出？当时的我显然还没想清楚——这个库里两种策略混用，成了后来复盘的一条。

## 矩阵乘法：三重循环里的经典次序

加减法没什么可说的（加法多一个同型检查），真正的主角是乘法。三重循环人人会写，经典在**循环变量的次序**——`mat1` 的列配 `mat2` 的行：

```c
if (mat1->col != mat2->row)
{
    MatrixError("Error: The sizes of two matrices are not compatible for multiplication.\n");
    exit(-1);
}

Matrix *mat = CreateMatrix(mat1->row, mat2->col);
for (int i = 0; i < mat1->row; i++)
{
    for (int j = 0; j < mat2->col; j++)
    {
        for (int k = 0; k < mat1->col; k++)
        {
            mat->data[i][j] += mat1->data[i][k] * mat2->data[k][j];
        }
    }
}
```

数乘和数除则是**原地修改**——直接改传入的矩阵，返回的还是它自己。这个设计选择后面复盘时再说。

## 行列式：按第一行展开的递归

行列式用的是教科书最正统的定义：按第一行展开，余子式递归。`MatrixDet(mat, x)` 里的 x 是当前阶数，每一轮先把"去掉第 0 行第 j 列"的余子式抠进临时矩阵 c：

```c
for(j=0;j<x;j++)
{
    for(i=0;i<x-1;i++)
    {
        for(k=0;k<x-1;k++)
        {
            if(k<j)
                c->data[i][k]=mat->data[i+1][k];
            if(k>=j)
                c->data[i][k]=mat->data[i+1][k+1];
        }
    }
    s += pow(-1,j) * mat->data[0][j] * MatrixDet(c, x-1); //递归算法求出值
}
```

`if(k<j)` 和 `if(k>=j)` 两行就是"跳过第 j 列"的实现：左边的列原样抄，右边的列从下一列抄——删除一列不需要真的移动内存，换个下标就行。符号用 `pow(-1, j)` 给出代数余子式的正负。这个函数里埋着一个严重的 bug，运行效果一节见分晓。

## 求逆：高斯-约旦消元

求逆用的是增广矩阵法：把 `A` 和单位阵 `I` 拼成 `[A | I]`，对左边做高斯-约旦消元把左边消成单位阵，右边自然就是 `A⁻¹`：

```c
Matrix* res = CreateMatrix(n, n * 2);
// 将原矩阵和单位矩阵拼接成增广矩阵
for (int i = 0; i < n; i++)
{
    for (int j = 0; j < n; j++)
    {
        res->data[i][j] = mat->data[i][j];
    }
    res->data[i][n + i] = 1.0;
}

// 高斯-约旦消元法
for (int i = 0; i < n; i++)
{
    float t = res->data[i][i];
    if (t == 0)
    {
        MatrixError("Error: matrix can't be inversed.\n");
        DestroyMatrix(res);
        return NULL;
    }
    for (int j = i; j < n * 2; j++)
    {
        res->data[i][j] /= t;      // 主行归一化
    }
    for (int j = 0; j < n; j++)
    {
        if (j != i)
        {
            t = res->data[j][i];
            for (int k = i; k < n * 2; k++)
            {
                res->data[j][k] -= t * res->data[i][k];   // 其他行消成 0
            }
        }
    }
}
```

主对角线归一、其余行消零，两步交替——这是高斯-约旦的标准节奏。求秩是同款消元的简化版，消出上三角后数非零主元的个数。

## 运行效果：一段迟到两年的崩溃

测试程序造了 2×3、3×2 的矩阵轮番表演，最后用 `[[1,2],[3,4]]` 演行列式和求逆。为写文章重新编译跑它，结果在行列式那一步——**程序直接崩了**，Windows 退出码 `-1073740940`，也就是 `0xC0000374`：堆损坏。前面的运算全对，一到 `DetCalc` 就当场去世。

而且这不是环境问题，是代码里如假包换的 use-after-free。回头看 MatrixDet：临时矩阵 c 在 j 循环**外面**创建，`DestroyMatrix(c)` 却写在 j 循环**里面**——第一轮结束时 c 就被释放了，第二轮循环往已释放的 c 里填数（use-after-free）、递归结束再销毁一遍（double-free）。2023 年它"能跑"，是因为当年的运行库对堆损坏不敏感；现在的 UCRT 带堆校验，一碰就抓。

修复只要把那行 DestroyMatrix 挪出循环（c 每轮覆盖复用，循环结束统一销毁），顺手把累加器 `s` 从 `int` 换成 `float`——原来的 `int s` 会把带小数的行列式截断成整数，`[[1,2],[3,4]]` 恰好全是整数才没露馅：

```c
float MatrixDet(Matrix *mat, int x)
{
    int i, j, k;
    float s = 0;
    Matrix* c = CreateMatrix(x, x);
    if (x == 1)
    {
        s = mat->data[0][0];
    }
    else
    {
        for(j=0;j<x;j++)
        {
            ... // 填充余子式 c（同上）
            s += pow(-1,j) * mat->data[0][j] * MatrixDet(c, x-1);
        }
    }
    DestroyMatrix(c);   // 挪到循环外：一轮一销毁是罪魁祸首
	return s;
}
```

修完再跑，全套测试一次到底，逆矩阵还顺手验了算——`det × det⁻¹ = I`：

```text
Create and Init Matrix:

A(2,3):
1.00 2.00 3.00
4.00 5.00 6.00

B(3,2):
1.00 2.00
3.00 4.00
5.00 6.00

MatrixNumMul:
A_mul = A * k(6.00)
6.00 12.00 18.00
24.00 30.00 36.00

MatrixTranspose:
C = A^T:
1.00 4.00
2.00 5.00
3.00 6.00

MatrixMul:
E = A * B:
22.00 28.00
49.00 64.00

DetCalc:
det =
|1 2|
|3 4| = -2.00

InverseMatrix
detInverse = det^-1:
-2.00 1.00
1.50 -0.50

CheckInverse:
result = det * detInverse:
1.00 0.00
0.00 1.00

Rank(det) 2:
```

行列式 -2 没错，`2×2` 的逆 `-2 1 / 1.5 -0.5` 也没错，验算乘回原矩阵精确得到单位阵——两年前的代码，修掉两行之后依然能打。

## 复盘：崩溃之外的三笔账

**第一，错误处理风格分裂。** `Check_NULL_Matrix_return` 和 `Check_NULL_Matrix_exit` 两个宏并存，矩阵加法尺寸不符是 `exit(-1)`，行列式非方阵也是 `exit(-1)`，求逆非方阵却是 `return NULL`——调用方永远猜不到下一次出错会被杀掉还是拿到 NULL。一个库应该统一：要么错误码/NULL 返回，要么约定退出，不能看心情。

**第二，API 的内存语义不一致。** `MatrixAdd`、`MatrixMul`、`MatrixTranspose`、`MatrixInverse` 返回**新矩阵**，`MatrixNumMul`、`MatrixNumDiv` 却**原地修改**传入的矩阵。测试程序里那句 `MatrixNumDiv(A, 2.0); // 只是把A恢复原样` 恰好暴露了这点——数乘 6 再数除 3、2，原地改回去了。两种语义都合理，混着用就是陷阱。

**第三，消元没有换主元。** 求逆和求秩都直接拿主对角线元素当主元，遇到 `[[0,1],[1,0]]` 这种对角线上是零的可逆矩阵，求逆会误报失败、求秩会算出错误的秩。标准的做法是选列主元（那一列绝对值最大的行换上来）。另外求秩的消元是**原地**进行的，调用之后传入的矩阵就被改成阶梯形了——`Rank` 这种"查询"函数悄悄改参数，也是 API 卫生问题。

还有个小彩蛋留给细心的读者：头文件的包含保护写的是 `_MARTRIX_H`——MATRIX 拼成了 MARTRIX，和它守护的代码一起，原样留在了仓库里。

## 完整代码

以下为 2023 年 V1.0.1 的原始文件，包含上文复盘的行列式 bug——原样封存，使用前记得先按复盘里的两处修掉。

```c Matrix.h
/*
 * Matrix.c
 *
 * Copyright (c) 2023,Cosmical Container
 * All rights reserved.
 *
 * 文件名称：Matrix.h
 * 摘    要：本文件主要是矩阵相关函数的声明
 *
 * this file is created by Cosmical Container
 * who want to write a Mathematics system with C program.
 *
 * thanks you for using it.
 *
 * 当前版本：1.0.1
 * 作    者：寰宇体(Cosmical Container)
 * 完成日期：2023年3月1日
 *
 * 取代版本：1.0.0
 * 原作者  ：寰宇体(Cosmical Container)
 * 完成日期：2023年2月28日
 */
#ifndef _MARTRIX_H
#define _MARTRIX_H

#define Check_NULL_Matrix_return(mat)         \
    if ( mat == NULL )                        \
    {                                         \
        MatrixError("The matrix is NULL!");   \
        return NULL;                          \
    }

#define Check_NULL_Matrix_exit(mat)           \
    if ( mat == NULL )                        \
    {                                         \
        MatrixError("The matrix is NULL!");   \
        exit(-1);                             \
    }

typedef struct
{
    int row;
    int col;
    float **data;
}Matrix;

// 矩阵的内存申请函数
void *MatrixMalloc(size_t _Size);

// 矩阵的内存释放函数
void MatrixFree(void *_Memory);

// 矩阵的报错信息
void MatrixError(const char * _Message);

// 创建矩阵
Matrix *CreateMatrix(int row, int col);

// 创建单位矩阵
Matrix *CreateUnitMatrix(int dimension);

// 初始化矩阵
Matrix *InitMatrix(Matrix *mat, int arr[]);

// 打印矩阵
void PrintMatrix(Matrix *mat);

// 删除矩阵
void DestroyMatrix(Matrix *mat);

// 矩阵加法
Matrix *MatrixAdd(Matrix *mat1, Matrix *mat2);

// 矩阵乘法 matrix multiplication
Matrix *MatrixMul(Matrix *mat1, Matrix *mat2);

// 矩阵数乘 matrix number multiplication
Matrix *MatrixNumMul(Matrix *mat, float k);

// 矩阵数除
Matrix *MatrixNumDiv(Matrix *mat, float k);

// 计算行列式(Determinant)
float MatrixDetCalc(Matrix *mat);
// 计算行列式(Determinant)中的递归函数
float MatrixDet(Matrix *mat, int x);

// 矩阵转置
Matrix *MatrixTranspose(Matrix *mat);

// 矩阵求逆
Matrix *MatrixInverse(Matrix *mat);

// 矩阵求秩
int MatrixRankCalc(Matrix* mat);

#endif //_MARTRIX_H
```

```c Matrix.c
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include "Matrix.h"

void *MatrixMalloc(size_t _Size)
{
    return malloc(_Size);
}

void MatrixFree(void *_Memory)
{
    free(_Memory);
}

void MatrixError(const char *_Message)
{
    printf("%s\n", _Message);
}

// 创建矩阵
Matrix *CreateMatrix(int row, int col)
{
    Matrix *mat = (Matrix*)MatrixMalloc(sizeof(Matrix));

    if ( mat == NULL )
    {
        MatrixError("CreateMatrix: create matrix failed");
        exit(-1);
    }

    mat->row = row;
    mat->col = col;
    mat->data = (float**)MatrixMalloc(row * sizeof(float*));

    if (mat->data == NULL)
    {
        MatrixError("CreateMatrix: create matrix data failed");
        exit(-1);
    }

    for (int i = 0; i < row; i++)
    {
        mat->data[i] = (float*)MatrixMalloc(col * sizeof(float));
        if (mat->data[i] == NULL)
        {
            MatrixError("CreateMatrix: create matrix data failed");
            exit(-1);
        }

        for (int j = 0; j < col; j++)
        {
            mat->data[i][j] = 0;
        }
    }
    return mat;
}

Matrix *CreateUnitMatrix(int dimension)
{
    Matrix *mat = CreateMatrix(dimension, dimension);

    for (int i = 0; i < dimension; i++)
    {
        for (int j = 0; j < dimension; j++)
        {
            mat->data[i][j] = (i == j ? 1 : 0);
        }
    }
    return mat;
}

// 初始化矩阵
Matrix *InitMatrix(Matrix *mat, int arr[])
{
    Check_NULL_Matrix_return (mat);

    for (int i = 0; i < mat->row; i++)
    {
        for (int j = 0; j < mat->col; j++)
        {
            mat->data[i][j] = arr[i * mat->col + j];
        }
    }
    return mat;
}

// 打印矩阵
void PrintMatrix(Matrix *mat)
{
    if ( mat != NULL )
    {
        for (int i = 0; i < mat->row; i++)
        {
            for (int j = 0; j < mat->col; j++)
            {
                printf("%.2f ",mat->data[i][j]);
            }
            putchar('\n');
        }
        putchar('\n');
    }
}

// 释放矩阵
void DestroyMatrix(Matrix *mat)
{
    if ( mat == NULL )
    {
        return ;
    }

    for (int i = 0; i < mat->row; i++)
    {
        MatrixFree(mat->data[i]);
    }

    MatrixFree(mat->data);
    MatrixFree(mat);
}

// 矩阵加法
Matrix *MatrixAdd(Matrix *mat1, Matrix *mat2)
{
    if (mat1 == NULL || mat2 == NULL)
    {
        MatrixError("The matrix is NULL!");
        return NULL;
    }

    if (mat1->row != mat2->row || mat1->col != mat2->col)
    {
        MatrixError("Error: The sizes of two matrices are not equal.\n");
        exit(-1);
    }

    Matrix *mat = CreateMatrix(mat1->row, mat2->col);
    for (int i = 0; i < mat1->row; i++)
    {
        for (int j = 0; j < mat1->col; j++)
        {
            mat->data[i][j] = mat1->data[i][j] + mat2->data[i][j];
        }
    }
    return mat;
}

// 矩阵乘法
Matrix *MatrixMul(Matrix *mat1, Matrix *mat2)
{
    if (mat1 == NULL || mat2 == NULL)
    {
        return NULL;
    }

    if (mat1->col != mat2->row)
    {
        MatrixError("Error: The sizes of two matrices are not compatible for multiplication.\n");
        exit(-1);
    }

    Matrix *mat = CreateMatrix(mat1->row, mat2->col);

    for (int i = 0; i < mat1->row; i++)
    {
        for (int j = 0; j < mat2->col; j++)
        {
            for (int k = 0; k < mat1->col; k++)
            {
                mat->data[i][j] += mat1->data[i][k] * mat2->data[k][j];
            }
        }
    }
    return mat;
}

// 矩阵数乘 matrix number multiplication
Matrix *MatrixNumMul(Matrix *mat, float k)
{
    Check_NULL_Matrix_return (mat)

    for (int i = 0; i < mat->row; i++)
    {
        for (int j = 0; j < mat->col; j++)
        {
            mat->data[i][j] *= k;
        }
    }
    return mat;
}

// 矩阵数除 matrix number division
Matrix *MatrixNumDiv(Matrix *mat, float k)
{
    Check_NULL_Matrix_return (mat);

    if ( k == 0 )
    {
        MatrixError("The divisor cannot be 0!");
        return mat;
    }

    for (int i = 0; i < mat->row; i++)
    {
        for (int j = 0; j < mat->col; j++)
        {
            mat->data[i][j] /= k;
        }
    }

    return mat;
}

// 计算矩阵转换为行列式之后的值
float MatrixDetCalc(Matrix *mat)
{
    Check_NULL_Matrix_exit(mat);

    if ( mat->col != mat->row )
    {
        MatrixError("Error: The matrix is not square!");
        exit(-1);
    }

    return MatrixDet(mat, mat->col);
}

//计算矩阵的行列式递归函数
float MatrixDet(Matrix *mat, int x)
{
    int i=0, j=0, s=0, k=0;
    Matrix* c = CreateMatrix(x, x);  //用c数组来表示余子列
    if (x == 1)
    {
        s = mat->data[0][0];
    }
    else
    {
        for(j=0;j<x;j++)
        {
            for(i=0;i<x-1;i++)
            {
                for(k=0;k<x-1;k++)
                {
                    if(k<j)
                        c->data[i][k]=mat->data[i+1][k];
                    if(k>=j)
                        c->data[i][k]=mat->data[i+1][k+1];
                }
            }
            s += pow(-1,j) * mat->data[0][j] * MatrixDet(c, x-1); //递归算法求出值
            DestroyMatrix(c);
        }
    }
	return s;
}

// 矩阵转置
Matrix *MatrixTranspose(Matrix *mat)
{
    Check_NULL_Matrix_return(mat);

    Matrix *transpose_mat = CreateMatrix(mat->col, mat->row);
    for (int i = 0; i < mat->row; i++)
    {
        for (int j = 0; j < mat->col; j++)
        {
            transpose_mat->data[j][i] = mat->data[i][j];
        }
    }
    return transpose_mat;
}

// 矩阵求逆
Matrix *MatrixInverse(Matrix *mat)
{
    Check_NULL_Matrix_return(mat);

    if (mat->row != mat->col)
    {
        MatrixError("Error: matrix not square, can't be inversed.\n");
        return NULL;
    }

    int n = mat->row;
    Matrix* res = CreateMatrix(n, n * 2);

    // 将原矩阵和单位矩阵拼接成增广矩阵
    for (int i = 0; i < n; i++)
    {
        for (int j = 0; j < n; j++)
        {
            res->data[i][j] = mat->data[i][j];
        }
        res->data[i][n + i] = 1.0;
    }

    // 高斯-约旦消元法
    for (int i = 0; i < n; i++)
    {
        float t = res->data[i][i];
        if (t == 0)
        {
            MatrixError("Error: matrix can't be inversed.\n");
            DestroyMatrix(res);
            return NULL;
        }
        for (int j = i; j < n * 2; j++)
        {
            res->data[i][j] /= t;
        }
        for (int j = 0; j < n; j++)
        {
            if (j != i)
            {
                t = res->data[j][i];
                for (int k = i; k < n * 2; k++)
                {
                    res->data[j][k] -= t * res->data[i][k];
                }
            }
        }
    }

    // 提取逆矩阵
    Matrix* inv = CreateMatrix(n, n);
    for (int i = 0; i < n; i++)
    {
        for (int j = 0; j < n; j++)
        {
            inv->data[i][j] = res->data[i][n + j];
        }
    }

    // 释放资源
    DestroyMatrix(res);

    return inv;
}

// 矩阵求秩
int MatrixRankCalc(Matrix* mat)
{
    Check_NULL_Matrix_exit(mat);

    int rank = 0;
    int n = mat->row;
    int m = mat->col;
    int i, j, k;

    // 构造矩阵的行阶梯型矩阵
    for (i = 0; i < n; i++)
    {
        // 如果行阶梯型矩阵的最后一行是全0，则矩阵的秩为当前行数
        if (mat->data[i][i] == 0)
        {
            break;
        }
        rank++;

        // 对于每一行，将该行以下的行通过高斯消元变为全0，得到行阶梯型矩阵
        for (j = i + 1; j < n; j++)
        {
            float factor = mat->data[j][i] / mat->data[i][i];
            for (k = i; k < m; k++)
            {
                mat->data[j][k] -= factor * mat->data[i][k];
            }
        }
    }

    return rank;
}
```

```c Matrix_test.c
#include <stdio.h>
#include "Matrix.h"

int main()
{
    // 创建矩阵
    Matrix *A = CreateMatrix(2, 3);
    Matrix *B = CreateMatrix(3, 2);
    Matrix *det = CreateMatrix(2, 2);

    // 初始化矩阵
    int arr1[] = {1, 2, 3, 4, 5, 6};
    int arr2[] = {1, 2, 3, 4, 5, 6};
    int arr3[] = {1, 2, 3, 4};

    printf("Create and Init Matrix:\n\n");
    InitMatrix(A, arr1);
    InitMatrix(B, arr2);
    InitMatrix(det, arr3);

    // 打印A矩阵
    printf("A(2,3):\n");
    PrintMatrix(A);

    // 打印B矩阵
    printf("B(3,2):\n");
    PrintMatrix(B);

    // 矩阵数乘
    MatrixNumMul(A, 6.0);
    printf("MatrixNumMul:\nA_mul = A * k(%.2f)\n", 6.0);
    PrintMatrix(A);

    // 矩阵数除
    MatrixNumDiv(A, 3.0);
    printf("MatrixNumDiv:\nA_div = A / k(%.2f)\n", 3.0);
    PrintMatrix(A);

    MatrixNumDiv(A, 2.0); // 只是把A恢复原样

    // 矩阵转置
    Matrix *C = MatrixTranspose(A);
    printf("MatrixTranspose:\nC = A^T:\n");
    PrintMatrix(C);

    // 矩阵加法
    Matrix *D = MatrixAdd(A, A);
    printf("MatrixAdd:\nD = A + A:\n");
    PrintMatrix(D);

    // 矩阵乘法
    Matrix *E = MatrixMul(A, B);
    printf("MatrixMul:\nE = A * B:\n");
    PrintMatrix(E);

    // 求矩阵转化为行列式的值
    printf("DetCalc:\ndet = \n|1 2|\n|3 4| = %.2f\n\n", MatrixDetCalc(det));

    // 创建单位矩阵
    Matrix *F = CreateUnitMatrix(5);
    printf("UnitMatrix E(5):\n");
    PrintMatrix(F);

    // 求矩阵的逆矩阵并验算
    Matrix *detInverse = MatrixInverse(det);
    printf("InverseMatrix\ndetInverse = det^-1:\n");
    PrintMatrix(detInverse);

    Matrix *result = MatrixMul(det, detInverse);
    printf("CheckInverse:\nresult = det * detInverse:\n");
    PrintMatrix(result);

    // 求矩阵的秩
    printf("Rank(det) %d:\n", MatrixRankCalc(det));

    // 释放内存
    DestroyMatrix(A);
    DestroyMatrix(B);
    DestroyMatrix(C);
    DestroyMatrix(D);
    DestroyMatrix(E);
    DestroyMatrix(F);
    DestroyMatrix(detInverse);
    DestroyMatrix(result);

    getchar();
    return 0;
}
```
