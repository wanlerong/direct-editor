export enum BlockType {
  None = "none",
  Basic = "basic",
  Line = "line",
  List = "list",
  Image = "img",
  Todo = "todo",
  Code = "code",
  Table = "table",
  Attach = "attach",
}

// 二级类型定义
export type BlockSubType =
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'  // 对应 Line
  | 'blockquote'  // 新增引用块类型
  | 'ul' | 'ol'       // 对应 List
  | 'none';           // 默认类型

// 完整的块类型信息
export interface BlockInfo {
  blockType: BlockType;
  subType: BlockSubType;
}

export const BlockInfoNone = { blockType: BlockType.None, subType: 'none' as BlockSubType };
