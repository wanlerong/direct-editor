// schema for normalize
type HTMLStructureRule = {
  allowedTags: string[];
  allowText: boolean;
  allowedBlocks?: BlockType[]; // 允许包含的块类型
  attributes?: string[];
  children?: {
    [tagName: string]: HTMLStructureRule;
  };
}

const spanSchema: HTMLStructureRule = {
  allowedTags: [],
  allowText: true,
  attributes: ["style", "id"]
}

const basicSchema: HTMLStructureRule = {
  allowedTags: ["span", "br", "a"],
  allowText: true,
  attributes: ["id"],
  children: {
    "span": spanSchema
  }
}

const htitleSchema: HTMLStructureRule = {
  allowedTags: ["h1", "h2", "h3", "h4", "h5", "h6"],
  allowText: false,
  attributes: ["id"],
  children: {
    "h1": basicSchema,
    "h2": basicSchema,
    "h3": basicSchema,
    "h4": basicSchema,
    "h5": basicSchema,
    "h6": basicSchema,
  }
}

const liSchema: HTMLStructureRule={
  allowedTags: [...basicSchema.allowedTags, "ul", "ol"],
  allowText: true,
  attributes: ["id"],
  children: {
    "span": spanSchema,
    // 使用 getter 延迟获取 ulSchema
    get "ul"() {
      return ulSchema;
    },
    get "ol"() {
      return ulSchema;
    },
  }
} 

const ulSchema: HTMLStructureRule={
  allowedTags: ["li"],
  allowText: false,
  attributes: ["id"],
  children: {
    "li": liSchema,
  }
}

const listSchema: HTMLStructureRule = {
  allowedTags: ["ul", "ol"],
  allowText: false,
  attributes: ["id"],
  children: {
    "ul": ulSchema,
    "ol": ulSchema,
  }
}



