import {BlockInfo} from "../block/blockType.js";
import {LinkOperationState} from "../toolbar";

export type ActiveStatus = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  blockInfo: BlockInfo;
  disableActions: Action[]; // 当前禁用的 actions
  link: LinkOperationState;
};

export enum Action {
  Line,
  ORDERED_LIST,
  UN_ORDERED_LIST,
  TODO,
}
