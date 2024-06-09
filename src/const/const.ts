export enum HTitleLevel {
  LEVEL_NONE = "None",
  H1 = "H1",
  H2 = "H2",
  H3 = "H3",
  H4 = "H4",
  H5 = "H5",
  H6 = "H6",
}

export enum BlockType {
  BLOCK_TYPE_NONE,
  BLOCK_TYPE_H1,
  BLOCK_TYPE_H2,
  BLOCK_TYPE_H3,
  BLOCK_TYPE_H4,
  BLOCK_TYPE_H5,
  BLOCK_TYPE_H6,
}

export function NodeToBlockType(node: Node) :BlockType {
  if (node == null) {
    return BlockType.BLOCK_TYPE_NONE
  }
  let name = node.nodeName
  switch (name) {
    case "H1":
      return BlockType.BLOCK_TYPE_H1
    case "H2":
      return BlockType.BLOCK_TYPE_H2
    case "H3":
      return BlockType.BLOCK_TYPE_H3
    case "H4":
      return BlockType.BLOCK_TYPE_H4
    case "H5":
      return BlockType.BLOCK_TYPE_H5
    case "H6":
      return BlockType.BLOCK_TYPE_H6
    default:
      return BlockType.BLOCK_TYPE_NONE
  }
}
