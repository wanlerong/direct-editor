import {BlockType} from "../block/blockType.js";

// schema for normalize
export type HTMLStructureRule = {
  childAllowedTags: string[];
  childAllowText: boolean;
  childAllowedBlocks?: BlockType[]; // 允许包含的块类型
  attributes?: string[];
  children?: {
    [tagName: string]: HTMLStructureRule;
  };
}

export const rootSchema: HTMLStructureRule = {
  childAllowedTags: ["div"],
  childAllowText: false,
  attributes: ["class", "contenteditable"],
  childAllowedBlocks: [BlockType.Basic, BlockType.HTitle, BlockType.List],
}

export const spanSchema: HTMLStructureRule = {
  childAllowedTags: [],
  childAllowText: true,
  attributes: ["style", "id"]
}

export const brSchema: HTMLStructureRule = {
  childAllowedTags: [],
  childAllowText: false,
  attributes: ["id"]
}

export const aSchema: HTMLStructureRule = {
  childAllowedTags: ["span"],
  childAllowText: true,
  attributes: ["style", "id", "href"],
  children:{
    "span": spanSchema,
  }
}

export const basicSchema: HTMLStructureRule = {
  childAllowedTags: ["span", "br", "a"],
  childAllowText: true,
  attributes: ["id", "data-btype"],
  children: {
    "span": spanSchema,
    "br": brSchema,
    "a": aSchema,
  }
}

export const htitleSchema: HTMLStructureRule = {
  childAllowedTags: ["h1", "h2", "h3", "h4", "h5", "h6"],
  childAllowText: false,
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
  childAllowedTags: [...basicSchema.childAllowedTags, "ul", "ol"],
  childAllowText: true,
  attributes: ["id"],
  children: {
    "span": spanSchema,
    "br": brSchema,
    "a": aSchema,
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
  childAllowedTags: ["li"],
  childAllowText: false,
  attributes: ["id"],
  children: {
    "li": liSchema,
  }
}

export const listSchema: HTMLStructureRule = {
  childAllowedTags: ["ul", "ol"],
  childAllowText: false,
  attributes: ["id", "data-btype"],
  children: {
    "ul": ulSchema,
    "ol": ulSchema,
  }
}

