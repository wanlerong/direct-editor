import {BlockInfo} from "../block/blockType";

export type ActiveStatus = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  blockInfo: BlockInfo;
  disableActions: Action[]; // 当前禁用的 actions
};

export enum Action {
  HTITLE,
  ORDERED_LIST,
  UN_ORDERED_LIST,
}
