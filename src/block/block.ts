interface BlockConfig {
  type: BlockType;
  schema: HTMLStructureRule;
  allowedChildren: BlockType[];
}

enum BlockType {
  Basic = "basic",
  HTitle = "htitle",
  List = "list",
}

const basicBlockConfig: BlockConfig = {
  type: BlockType.Basic,
  allowedChildren: [],
  schema: basicSchema,
}

const htitleBlockConfig: BlockConfig = {
  type: BlockType.HTitle,
  allowedChildren: [],
  schema: htitleSchema,
}

const listBlockConfig: BlockConfig = {
  type: BlockType.List,
  allowedChildren: [],
  schema: listSchema,
}


