export const editorStyle = `
      .direct-editor {
        flex: 1;
        border: 1px solid #999999;
        padding: 1rem;
        margin-top: 1rem;
      }
      blockquote {
        background: #f9f9f9;
        border-left: 10px solid #ccc;
        margin: 1.5em 10px;
        padding: 0.5em 10px;
        quotes: "\\201C""\\201D""\\2018""\\2019";
        color: #999999;
      }
      .todo-item{
        display: flex;
        align-items: center;
      }

      .todo-item > span {
        width: 1.5em;
      }

      .todo-item > div {
        flex-grow: 1;
        min-width: 0;
      }
      
      [data-btype='code'] {
        background: #efefef;
        padding: 0.5rem;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-family: sans-serif;
        font-size: 14px;
      }

      td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      
      /* 表格单元格高亮样式 */
      td.cell-selected {
        background-color: #e6f7ff;
      }
      
      /* 表格单元格操作菜单样式 */
      .table-cell-options {
        position: absolute;
        z-index: 1000;
        display: none;
        pointer-events: auto;
      }
      
      /* 箭头按钮样式 */
      .cell-options-arrow {
        cursor: pointer;
        background: #f5f5f5;
        border: none;
        border-radius: 3px;
        padding: 2px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
        transition: all 0.2s ease;
        user-select: none;
        outline: none;
      }
      
      .cell-options-arrow:hover {
        background: #e6e6e6;
      }
      
      /* 下拉菜单样式 */
      .cell-options-dropdown {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        min-width: 180px;
        z-index: 1001;
        margin-top: 5px;
        pointer-events: auto;
      }
      
      /* 菜单项样式 */
      .cell-option-item {
        padding: 10px 15px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
        font-size: 14px;
        font-family: Arial, sans-serif;
        user-select: none;
      }
      
      .cell-option-item:hover {
        background-color: #f0f0f0;
      }
      
      .cell-option-item:last-child {
        border-bottom: none;
      }
      
      /* 禁用状态的菜单项 */
      .cell-option-item.disabled {
        opacity: 0.5;
        pointer-events: none;
        cursor: default;
      }
    `