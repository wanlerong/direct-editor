import {HTMLStructureRule, basicSchema, lineSchema, listSchema, imgSchema} from "../schema/schema.js";
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

export const lineBlockConfig: BlockConfig = {
  type: BlockType.Line,
  schema: lineSchema,
  createElement: () => {
    const el = document.createElement('div');
    el.dataset.btype = BlockType.Line;
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

export const imgBlockConfig: BlockConfig = {
  type: BlockType.Image,
  schema: imgSchema,
  createElement: () => {
    const el = document.createElement('div');
    el.dataset.btype = BlockType.Image;
    return el;
  }
}

export function createBlockElement(btype: string, content?: DocumentFragment): HTMLElement {
  const block = document.createElement('div');
  block.dataset.btype = btype;

  if (content) {
    block.appendChild(content);
  }
  return block;
}