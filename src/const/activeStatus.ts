import {BlockType} from "./const";

export type ActiveStatus = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  blockType: BlockType;
  disableActions: Action[]; // 当前禁用的 actions
};

export enum Action {
  HTITLE,
  ORDERED_LIST,
  UN_ORDERED_LIST,
}
