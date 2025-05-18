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
  childAllowedBlocks: [BlockType.Basic, BlockType.Line, BlockType.List, BlockType.Image, BlockType.Todo, BlockType.Code, BlockType.Table],
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

export const lineSchema: HTMLStructureRule = {
  childAllowedTags: ["h1", "h2", "h3", "h4", "h5", "h6", "blockquote"],
  childAllowText: false,
  attributes: ["id", "data-btype"],
  children: {
    "h1": basicSchema,
    "h2": basicSchema,
    "h3": basicSchema,
    "h4": basicSchema,
    "h5": basicSchema,
    "h6": basicSchema,
    "blockquote": basicSchema,
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

export const imgSchema: HTMLStructureRule = {
  childAllowedTags: ["img"],
  childAllowText: false,
  attributes: ["id", "data-btype"],
  children: {
    "img": {
      childAllowedTags: [],
      childAllowText: false,
      attributes: ["src", "style", "id"]
    }
  }
}

export const todoItemSchema: HTMLStructureRule = {
  childAllowedTags: ["span","div"],
  childAllowText: false,
  attributes: ["id","class"],
  children: {
    "span": {
      childAllowedTags: ["input"],
      childAllowText: false,
      attributes: ["contenteditable","id"],
      children: {
        "input": {
          childAllowedTags: [],
          childAllowText: false,
          attributes: ["type", "checked", "id"]
        }
      }
    },
    "div":basicSchema
  }
}

export const todoSchema: HTMLStructureRule = {
  childAllowedTags: ["div"],
  childAllowText: false,
  attributes: ["id", "data-btype"],
  children: {
    "div": todoItemSchema
  }
}

export const codeLineSchema: HTMLStructureRule = {
  childAllowedTags: ["br"],
  childAllowText: true,
  attributes: ["id", "data-btype"],
  children: {
    "br": brSchema,
  }
}

export const codeSchema: HTMLStructureRule = {
  childAllowedTags: ["div"],
  childAllowText: false,
  attributes: ["id", "data-btype"],
  children: {
    "div": codeLineSchema
  }
}

export const tableCellSchema: HTMLStructureRule = {
  childAllowedTags: ["div"],
  childAllowText: false,
  attributes: ["id","class","colspan","rowspan"],
  childAllowedBlocks: [BlockType.Basic, BlockType.Line, BlockType.List, BlockType.Image, BlockType.Todo, BlockType.Code]
}

export const tableRowSchema: HTMLStructureRule = {
  childAllowedTags: ["td"],
  childAllowText: false,
  attributes: ["id"],
  children: {
    "td": tableCellSchema
  }
}

export const tableSchema: HTMLStructureRule = {
  childAllowedTags: ["table"],
  childAllowText: false,
  attributes: ["id", "data-btype"],
  children: {
    "table": {
      childAllowedTags: ["tr"],
      childAllowText: false,
      attributes: ["id"],
      children: {
        "tr": tableRowSchema
      }
    }
  }
}
