import {HTMLStructureRule, basicSchema, htitleSchema, listSchema} from "../schema/schema.js";
import {BlockType} from "./blockType.js";

export interface BlockConfig {
  type: BlockType;
  schema: HTMLStructureRule;
  createElement: () => HTMLElement;
}

export const basicBlockConfig: BlockConfig = {
  type: BlockType.Basic,
  schema: basicSchema,
  createElement: () => {
    const el = document.createElement('div');
    el.dataset.btype = BlockType.Basic;
    return el;
  }
}

export const htitleBlockConfig: BlockConfig = {
  type: BlockType.HTitle,
  schema: htitleSchema,
  createElement: () => {
    const el = document.createElement('div');
    el.dataset.btype = BlockType.HTitle;
    return el;
  }
}

export const listBlockConfig: BlockConfig = {
  type: BlockType.List,
  schema: listSchema,
  createElement: () => {
    const el = document.createElement('div');
    el.dataset.btype = BlockType.List;
    return el;
  }
}
