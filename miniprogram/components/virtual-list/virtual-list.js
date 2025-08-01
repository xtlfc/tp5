// components/virtual-list/virtual-list.js

Component({
  properties: {
    // 数据列表
    list: {
      type: Array,
      value: []
    },
    // 每项高度
    itemHeight: {
      type: Number,
      value: 100
    },
    // 容器高度
    containerHeight: {
      type: Number,
      value: 600
    },
    // 缓冲区大小
    bufferSize: {
      type: Number,
      value: 5
    },
    // 是否启用虚拟滚动
    enableVirtual: {
      type: Boolean,
      value: true
    }
  },

  data: {
    visibleItems: [],
    startIndex: 0,
    endIndex: 0,
    totalHeight: 0,
    scrollTop: 0,
    containerStyle: '',
    listStyle: ''
  },

  lifetimes: {
    attached() {
      this.initVirtualList()
    }
  },

  observers: {
    'list': function(newList) {
      this.updateVirtualList()
    }
  },

  methods: {
    // 初始化虚拟列表
    initVirtualList() {
      if (!this.properties.enableVirtual) {
        this.setData({
          visibleItems: this.properties.list,
          totalHeight: this.properties.list.length * this.properties.itemHeight
        })
        return
      }

      this.updateVirtualList()
    },

    // 更新虚拟列表
    updateVirtualList() {
      const { list, itemHeight, containerHeight, bufferSize } = this.properties
      
      if (!this.properties.enableVirtual) {
        this.setData({
          visibleItems: list,
          totalHeight: list.length * itemHeight
        })
        return
      }

      const visibleCount = Math.ceil(containerHeight / itemHeight)
      const totalHeight = list.length * itemHeight

      this.setData({
        totalHeight,
        listStyle: `height: ${totalHeight}rpx;`
      })

      this.updateVisibleRange(0)
    },

    // 更新可见范围
    updateVisibleRange(scrollTop) {
      const { list, itemHeight, containerHeight, bufferSize } = this.properties
      
      if (!this.properties.enableVirtual) return

      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize)
      const visibleCount = Math.ceil(containerHeight / itemHeight)
      const endIndex = Math.min(list.length - 1, startIndex + visibleCount + bufferSize * 2)

      const visibleItems = list.slice(startIndex, endIndex + 1).map((item, index) => ({
        ...item,
        _virtualIndex: startIndex + index,
        _virtualStyle: `transform: translateY(${(startIndex + index) * itemHeight}rpx);`
      }))

      this.setData({
        visibleItems,
        startIndex,
        endIndex,
        scrollTop
      })
    },

    // 滚动事件处理
    onScroll(e) {
      const scrollTop = e.detail.scrollTop
      this.updateVisibleRange(scrollTop)
      this.triggerEvent('scroll', { scrollTop })
    },

    // 滚动到底部
    scrollToBottom() {
      const { list, itemHeight } = this.properties
      const scrollTop = list.length * itemHeight
      
      this.setData({ scrollTop })
      this.updateVisibleRange(scrollTop)
    },

    // 滚动到指定索引
    scrollToIndex(index) {
      const { itemHeight } = this.properties
      const scrollTop = index * itemHeight
      
      this.setData({ scrollTop })
      this.updateVisibleRange(scrollTop)
    },

    // 获取可见项
    getVisibleItems() {
      return this.data.visibleItems
    },

    // 获取滚动位置
    getScrollTop() {
      return this.data.scrollTop
    },

    // 刷新列表
    refresh() {
      this.updateVirtualList()
    },

    // 清空列表
    clear() {
      this.setData({
        visibleItems: [],
        startIndex: 0,
        endIndex: 0,
        totalHeight: 0,
        scrollTop: 0
      })
    }
  }
})