# :star:snabbdom源码分析

## 目录结构
```
|-- snabbdom
    |-- h.js                    - vnode生成模块
    |-- htmldomapi.js           - dom操作api
    |-- is.js                   - 类型判断
    |-- snabbdom.js             - 主模块
    |-- thunk.js                - thunk模块
    |-- vnode.js                - vnode工厂函数
    |-- helpers                 - 帮助函数
    |   |-- attachto.js
    |-- modules                 - 节点数据处理模块
    |   |-- attributes.js       - 处理属性
    |   |-- class.js            - 处理类名
    |   |-- dataset.js          - 处理自定义数据属性
    |   |-- eventlisteners.js   - 处理事件监听
    |   |-- hero.js             - 处理过渡效果
    |   |-- props.js            - 处理
    |   |-- style.js            - 处理内联样式
    |-- perf                    - 性能模块
        |-- benchmarks.js
        |-- index.html
```
## 生命周期

**总览**

名称|何时触发|回调参数
-|-|-
pre|补丁程序开始|没有
init|已添加一个vnode|vnode
create|已基于vnode创建了一个DOM元素|emptyVnode, vnode
insert|元素已插入DOM|vnode
prepatch|元素即将被修补|oldVnode, vnode
update|元素正在更新|oldVnode, vnode
postpatch|元素已被修补|oldVnode, vnode
destroy|一个元素被直接或间接删除|vnode
remove|元素直接从DOM中删除|vnode, removeCallback
post|修补程序完成|没有

下面的hook可用于模块：pre，create，update，destroy，remove，post。

下面的hook可用于单个节点属性（可视为业务钩子）：init，create，insert，prepatch，update，postpatch，destroy，remove。

## 模块系统
snabbdom通过模块机制解耦，在节点数据中，如果有相应的节点数据需要创建、更新、删除等操作，只需要指定生命周期钩子上部署回调，即会在vnode创建或者更新的过程中被相应的调用，完成对节点数据的处理。目前官方支持的模块处理器有如下7个：
* attributes.js       - 处理属性
* class.js            - 处理类名
* dataset.js          - 处理自定义数据属性
* eventlisteners.js   - 处理事件监听
* hero.js             - 处理过渡效果
* props.js            - 处理
* style.js            - 处理内联样式

同时官方也支持自定义模块处理器对虚拟节点进行处理，只要输出接口符合上面生命周期中所示的规范即可。

## 源码分析

### h函数
```js
// h函数：vnode生成器
// @param sel 选择器
// @param b 节点data数据
// @param c children子节点集合
function h(sel, b, c) {
  var data = {}, children, text, i;
  // c存在
  if (c !== undefined) {
    // b就是data
    data = b;
    // 如果c是数组说明是子节点集合
    if (is.array(c)) { children = c; }
    // 如果c是字符串或者数字说明是文本节点
    else if (is.primitive(c)) { text = c; }
  // b存在 c不存在
  } else if (b !== undefined) {
    // 如果b是数组说明是子节点集合
    if (is.array(b)) { children = b; }
    // 如果b是字符串或者数字说明是文本节点
    else if (is.primitive(b)) { text = b; }
    // 否则b是data
    else { data = b; }
  }

  // 如果说子节点是数组
  if (is.array(children)) {
    for (i = 0; i < children.length; ++i) {
      // 而且每一项是字符串或者数字 直接创建文本vnode节点
      if (is.primitive(children[i])) children[i] = VNode(undefined, undefined, undefined, children[i]);
    }
  }

  // svg helper
  if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g') {
    addNS(data, children, sel);
  }

  // 返回vnode
  return VNode(sel, data, children, text, undefined);
};

```

### Vnode结构
```js
// vnode工厂函数
// @param sel 选择器
// @param data 节点数据
// @param children 子节点
// @param text 文本数据
// @param elm 真实dom
function(sel, data, children, text, elm) {
  var key = data === undefined ? undefined : data.key;
  return {
    sel: sel,
    data: data,
    children: children,
    text: text, 
    elm: elm, 
    key: key
  };
};
```
从代码中可以看出，vnode主要包含如下几个属性：
* sel - 选择器
* data - 节点数据
* children - 子节点
* text - 文本数据
* elm - 真实dom
* key - data.key


### 入口api
```js
// init 入口函数
// @param modules 需要载入modules对节点data中各种数据进行处理
// @param api dom操作api
function init(modules, api) {
  var i, j, cbs = {};

  // 如果未传入api即使用内置函数风格domApi
  if (isUndef(api)) api = domApi;

  // 挂载模块钩子
  // 用于在指定生命周期对vnode进行相应模块的处理
  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      if (modules[j][hooks[i]] !== undefined) cbs[hooks[i]].push(modules[j][hooks[i]]);
    }
  }

  // 基于某个元素创建vnode
  function emptyNodeAt(elm) {}

  // 创建节点移除回调
  function createRmCb(childElm, listeners) {}

  // 根据vnode创建真实dom
  function createElm(vnode, insertedVnodeQueue) {}

  // 根据vnodes创建真实dom
  function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {}

  function invokeDestroyHook(vnode) {}

  // 根据vnodes移除真实dom
  function removeVnodes(parentElm, vnodes, startIdx, endIdx) {}

  // 同级比对算法
  function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {}

  // 核心模块节点比对
  function patchVnode(oldVnode, vnode, insertedVnodeQueue) {}

  // patch函数 - 即render函数
  return function(oldVnode, vnode) {};
}
```

### patch函数 即render入口函数
从入口函数可以看出新旧节点比对必须拥有一个顶级节点，这也是为什么vue中.vue文件中必须需要只能有一个顶级节点的原因。
```js
// patch函数
// @param oldVnode 旧vnode
// @param vnode 新vnode
function (oldVnode, vnode) {
  var i;
  var insertedVnodeQueue = [];
  // 开始前模块pre钩子调用
  for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

  // 第一次patch处理 oldVnode为虚拟dom挂载真实dom节点
  if (oldVnode instanceof Element) {
    // 如果oldVnode不为顶级节点
    // 则创建业务vnode之后，直接对需要挂载的真实dom节点进行替换
    if (oldVnode.parentElement !== null) {
      createElm(vnode, insertedVnodeQueue);
      oldVnode.parentElement.replaceChild(vnode.elm, oldVnode);
    // 如果oldVnode为顶级节点
    // 则以oldVnode创建虚拟node节点，走patchVnode流程
    } else {
      oldVnode = emptyNodeAt(oldVnode);
      patchVnode(oldVnode, vnode, insertedVnodeQueue);
    }

  // 后续patch节点
  } else {
    patchVnode(oldVnode, vnode, insertedVnodeQueue);
  }
  // patch函数完成后 调用业务代码内insert钩子
  for (i = 0; i < insertedVnodeQueue.length; ++i) {
    insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
  }
  // 模块post钩子函数调用
  for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
  return vnode;
};
```

### patchVnode函数
```js
// patchVnode 节点比对
// @param oldVnode 旧vnode
// @param vnode 新vnode
function patchVnode(oldVnode, vnode, insertedVnodeQueue) {
  var i, hook;
  // patch Vnode前 业务代码内prepatch hook调用
  if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
    i(oldVnode, vnode);
  }
  // 处理data.vnode结构
  if (isDef(i = oldVnode.data) && isDef(i = i.vnode)) oldVnode = i;
  if (isDef(i = vnode.data) && isDef(i = i.vnode)) vnode = i;

  // 将旧node的元素节点挂在新vnode上
  var elm = vnode.elm = oldVnode.elm,
      // 旧子节点
      oldCh = oldVnode.children,
      // 新子节点
      ch = vnode.children;
  // 如果新旧节点为同一节点 无需比对
  // 这种情况需要斟酌一下
  if (oldVnode === vnode) return;

  // 非常重要！
  // 业务代码与模块内update hook调用
  // 模块处理vnode数据属性的update hook调用
  if (isDef(vnode.data)) {
    for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
    i = vnode.data.hook;
    if (isDef(i) && isDef(i = i.update)) i(oldVnode, vnode);
  }

  // 如果vnode的文本节点不存在
  if (isUndef(vnode.text)) {
    // 如果新旧节点的子节点都存在 则走updateChildren更新流程
    if (isDef(oldCh) && isDef(ch)) {
      if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue);
    // 新子节点存在旧子节点不存在
    // 则创建新子节点
    } else if (isDef(ch)) {
      // 全节点插入
      addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
    // 旧子节点存在新子节点不存在
    // 则移除旧子节点
    } else if (isDef(oldCh)) {
      // 全节点移除
      removeVnodes(elm, oldCh, 0, oldCh.length - 1);
    }
  // 文本节点切文本内容不同
  // 更新文本节点
  } else if (oldVnode.text !== vnode.text) {
    elm.textContent = vnode.text;
  }

  // patchVnode结束后 业务代码内postpatch hook调用
  if (isDef(hook) && isDef(i = hook.postpatch)) {
    i(oldVnode, vnode);
  }
}
```

### updateChildren同级比对算法 diff算法核心
```js
// updateChildren 子节点比对
// @param parentElm 父级真实dom
// @param oldCh 旧子节点
// @param newCh 新子节点
function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
  // 声明旧子节点开始索引
  // 下面称之为旧开始索引
  var oldStartIdx = 0,
  // 声明新子节点开始索引
  // 下面称之为新开始索引
      newStartIdx = 0;
  // 声明旧子节点结束索引
  // 下面称之为旧结束索引
  var oldEndIdx = oldCh.length - 1;
  // 声明新子节点结束索引
  // 下面称之为新结束索引
  var newEndIdx = newCh.length - 1;
  // 声明旧开始子节点
  // 下面称之为旧开始
  var oldStartVnode = oldCh[0];
  // 声明旧结束子节点
  // 下面称之为旧结束
  var oldEndVnode = oldCh[oldEndIdx];
  // 声明新开始子节点
  // 下面称之为新开始
  var newStartVnode = newCh[0];
  // 声明新结束子节点
  // 下面称之为新结束
  var newEndVnode = newCh[newEndIdx];
  
  var oldKeyToIdx,
  idxInOld,
  elmToMove,
  before;

  // 跳出循环条件 旧开始索引 > 旧结束索引 或者 新开始索引 > 行结束索引
  // ->   <-
  // o o o o
  // o o o o o
  // ->     <-
  // 即新节点或者旧节点以及遍历完了
  // 情况1：新节点先遍历完，说明旧节点比新节点多，这个时候旧节点未遍历到的需要移除
  // 情况2：旧节点先遍历完，说明新节点比旧节点多，这个时候新节点未遍历到的需要添加
  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
    // 旧开始节点不存在
    // 即命中key被抽走了
    // 旧开始索引自增 向中间逼近 
    if (isUndef(oldStartVnode)) {
      oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
    // 旧结束节点不存在
    // 即命中key被抽走了
    // 旧结束索引自减 向中间逼近 
    } else if (isUndef(oldEndVnode)) {
      oldEndVnode = oldCh[--oldEndIdx];
    // 旧开始与新开始是同一节点
    // patch相同vnode 索引处理
    } else if (sameVnode(oldStartVnode, newStartVnode)) {
      patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
      oldStartVnode = oldCh[++oldStartIdx];
      newStartVnode = newCh[++newStartIdx];
    // 旧结束与新结束是同一节点
    // patch相同vnode 索引处理
    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
      oldEndVnode = oldCh[--oldEndIdx];
      newEndVnode = newCh[--newEndIdx];
    // 旧开始与新结束是同一节点
    // patch相同vnode 索引处理
    // 同时需要将旧开始的节点移动到旧结束后面
    } else if (sameVnode(oldStartVnode, newEndVnode)) {
      // Vnode moved right
      patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
      parentElm.insertBefore(oldStartVnode.elm, oldEndVnode.elm.nextSibling);
      oldStartVnode = oldCh[++oldStartIdx];
      newEndVnode = newCh[--newEndIdx];
    // 旧结束与新开始是同一节点
    // patch相同vnode 索引处理
    // 同时需要将旧结束的节点移动到旧开始前面
    } else if (sameVnode(oldEndVnode, newStartVnode)) {
      // Vnode moved left
      patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
      parentElm.insertBefore(oldEndVnode.elm, oldStartVnode.elm);
      oldEndVnode = oldCh[--oldEndIdx];
      newStartVnode = newCh[++newStartIdx];
    // 以上情况均不命中
    // 需要从 新开始和旧开始 开始处理
    } else {
      // 建立key与index索引的映射并缓存
      if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
      // 新开始节点根据key寻找在旧子节点中的索引
      idxInOld = oldKeyToIdx[newStartVnode.key];
      // 如果没找到
      if (isUndef(idxInOld)) {
        // 需要在旧开始节点前插入新创建的节点
        // New element
        parentElm.insertBefore(createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
        newStartVnode = newCh[++newStartIdx];
      // 如果找到了
      } else {
        // 需要移动的节点
        elmToMove = oldCh[idxInOld];
        // patch相同vnode
        patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
        // 将旧节点数据置为undefined 即将会命中循环中开始的那两种情况
        oldCh[idxInOld] = undefined;
        // 将需要移动的节点插旧开始前
        parentElm.insertBefore(elmToMove.elm, oldStartVnode.elm);
        // 处理索引
        newStartVnode = newCh[++newStartIdx];
      }
    }
  }

  // 旧节点先遍历完，说明新节点比旧节点多，这个时候新节点未遍历到的需要添加
  if (oldStartIdx > oldEndIdx) {
    // newEndIdx + 1不存在需要置为null兼容domapi
    before = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm;
    addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
  // 新节点先遍历完，说明旧节点比新节点多，这个时候旧节点未遍历到的需要移除
  } else if (newStartIdx > newEndIdx) {
    removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
  }
}
```

### addVnodes函数
```js
// addVnodes 通过一系列vnodes创建真实dom
// @param parentElm 需要添加节点的父及节点
// @param before 需要在before节点前插入
// @param vnodes 需要插入节点vnodes
// @param startIdx 开始索引
// @param endIdx 结束索引
// @param insertedVnodeQueue
function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
  for (; startIdx <= endIdx; ++startIdx) {
    parentElm.insertBefore(createElm(vnodes[startIdx], insertedVnodeQueue), before);
  }
}
```

### createElm函数
```js
// createElm 根据vnode生成真实dom节点
// @param vnode
// @return vnode.elm
function createElm(vnode, insertedVnodeQueue) {
  var i,
      data = vnode.data;

  // 处理init业务代码钩子与data.vnode结构
  if (isDef(data)) {
    if (isDef(i = data.hook) && isDef(i = i.init)) i(vnode);
    if (isDef(i = data.vnode)) vnode = i;
  }
  var elm,
      children = vnode.children,
      sel = vnode.sel;
  // 如果vnode中选择器存在
  if (isDef(sel)) {
    // Parse selector
    var hashIdx = sel.indexOf('#');
    var dotIdx = sel.indexOf('.', hashIdx);
    var hash = hashIdx > 0 ? hashIdx : sel.length;
    var dot = dotIdx > 0 ? dotIdx : sel.length;
    var tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
    // 节点生成
    elm = vnode.elm = isDef(data) && isDef(i = data.ns) ? document.createElementNS(i, tag) : document.createElement(tag);
    // 生成id
    if (hash < dot) elm.id = sel.slice(hash + 1, dot);
    // 生成class
    if (dotIdx > 0) elm.className = sel.slice(dot + 1).replace(/\./g, ' ');
    // 如果子节点vnode数组存在需要递归次函数
    if (is.array(children)) {
      for (i = 0; i < children.length; ++i) {
        elm.appendChild(createElm(children[i], insertedVnodeQueue));
      }
    // 如果vnode文本数据存在则创建文本节点
    } else if (is.primitive(vnode.text)) {
      elm.appendChild(document.createTextNode(vnode.text));
    }
    // 非常重要！
    // 模块处理器中create hook调用
    for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode);
    i = vnode.data.hook; // Reuse variable
    // 业务代码created钩子调用
    if (isDef(i)) {
      if (i.create) i.create(emptyNode, vnode);
      if (i.insert) insertedVnodeQueue.push(vnode);
    }
  // 否则创建一个文本节点
  } else {
    elm = vnode.elm = document.createTextNode(vnode.text);
  }
  return vnode.elm;
}
```

### removeVnode函数
```js
// removeVnodes 根据一系列vnodes将真实dom从父节点中移除
// @param parentElm 父级真实dom
// @param vnodes 一系列vnodes
// @param startIdx 开始索引
// @param endIdx 结束索引
function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
  for (; startIdx <= endIdx; ++startIdx) {
    var i,
        listeners,
        rm,
        ch = vnodes[startIdx];
    // 如果vnode存在
    if (isDef(ch)) {
      // 如果vnode选择器存在
      if (isDef(ch.sel)) {
        // 递归的destroy hook执行器
        invokeDestroyHook(ch);
        listeners = cbs.remove.length + 1;
        // 生成remove惰性函数 供业务代码内调用
        rm = createRmCb(ch.elm, listeners);
        for (i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);
        // 如果有业务remove钩子
        // 传入vnode与删除节点函数 可供业务代码执行完成后调用删除函数删除节点
        if (isDef(i = ch.data) && isDef(i = i.hook) && isDef(i = i.remove)) {
          i(ch, rm);
        // 否则直接移除节点
        } else {
          rm();
        }
      // 说明是文本节点 直接移除即可
      } else {
        // Text node
        parentElm.removeChild(ch.elm);
      }
    }
  }
}
```

## diff算法图示
软件画图啥的太麻烦了，还不如手写来的直接。（我也不知道为啥图是_(:з」∠)_倒的。）
![](https://blog.m1n9z.cn/diff.jpeg)

## patchVnode核心流程
![](https://blog.m1n9z.cn/patchVnode.jpeg)
