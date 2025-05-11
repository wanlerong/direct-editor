import {HTMLStructureRule, basicSchema, lineSchema, listSchema, imgSchema, todoSchema, codeSchema} from "../schema/schema.js";
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

export const todoBlockConfig: BlockConfig = {
  type: BlockType.Todo,
  schema: todoSchema,
  createElement: () => {
    const el = document.createElement('div');
    el.dataset.btype = BlockType.Todo;
    return el;
  }
}

export const codeBlockConfig: BlockConfig = {
  type: BlockType.Code,
  schema: codeSchema,
  createElement: () => {
    const el = document.createElement('div');
    el.dataset.btype = BlockType.Code;
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

export function getBlockType(element: HTMLElement): BlockType | null {
  if (!element) {
    return null
  }
  
  const typeStr = element.dataset.btype;
  return typeStr && Object.values(BlockType).includes(typeStr as BlockType)
    ? (typeStr as BlockType)
    : null;
}


export function createTodoItem(...nodes : Node[]): HTMLElement {
  const todoItem = document.createElement('div');
  todoItem.className = 'todo-item'

  let span = document.createElement('span');
  span.setAttribute("contenteditable", "false")
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  span.appendChild(checkbox)
  todoItem.appendChild(span)

  const todoItemTxtDiv = document.createElement('div');
  todoItemTxtDiv.replaceChildren(...nodes)
  todoItem.appendChild(todoItemTxtDiv)
  
  return todoItem
}

export function createCodeLine(...nodes : Node[]): HTMLElement {
  const codeItem = document.createElement('div');
  codeItem.replaceChildren(...nodes);
  return codeItem;
}