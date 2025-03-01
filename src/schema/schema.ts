import {BlockType} from "../block/blockType.js";

// schema for normalize
export type HTMLStructureRule = {
  allowedTags: string[];
  allowText: boolean;
  allowedBlocks?: BlockType[]; // 允许包含的块类型
  attributes?: string[];
  children?: {
    [tagName: string]: HTMLStructureRule;
  };
}

export const rootSchema: HTMLStructureRule = {
  allowedTags: ["div"],
  allowText: false,
  attributes: ["class", "contenteditable"],
  allowedBlocks: [BlockType.Basic, BlockType.HTitle, BlockType.List],
}

export const spanSchema: HTMLStructureRule = {
  allowedTags: [],
  allowText: true,
  attributes: ["style", "id"]
}

export const brSchema: HTMLStructureRule = {
  allowedTags: [],
  allowText: false,
  attributes: ["id"]
}
export const basicSchema: HTMLStructureRule = {
  allowedTags: ["span", "br", "a"],
  allowText: true,
  attributes: ["id", "data-btype"],
  children: {
    "span": spanSchema,
    "br": brSchema,
  }
}

export const htitleSchema: HTMLStructureRule = {
  allowedTags: ["h1", "h2", "h3", "h4", "h5", "h6"],
  allowText: false,
  attributes: ["id", "data-btype"],
  children: {
    "h1": basicSchema,
    "h2": basicSchema,
    "h3": basicSchema,
    "h4": basicSchema,
    "h5": basicSchema,
    "h6": basicSchema,
  }
}

export const liSchema: HTMLStructureRule={
  allowedTags: [...basicSchema.allowedTags, "ul", "ol"],
  allowText: true,
  attributes: ["id"],
  children: {
    "span": spanSchema,
    "br": brSchema,
    // 使用 getter 延迟获取 ulSchema
    get "ul"() {
      return ulSchema;
    },
    get "ol"() {
      return ulSchema;
    },
  }
}

export const ulSchema: HTMLStructureRule={
  allowedTags: ["li"],
  allowText: false,
  attributes: ["id"],
  children: {
    "li": liSchema,
  }
}

export const listSchema: HTMLStructureRule = {
  allowedTags: ["ul", "ol"],
  allowText: false,
  attributes: ["id", "data-btype"],
  children: {
    "ul": ulSchema,
    "ol": ulSchema,
  }
}

