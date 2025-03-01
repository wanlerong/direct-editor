import {Editor} from "./editor.js";
import {DeltaItem} from "./lib/delta.js";
import {DeltaSource} from "./const/const.js";

export class UndoManager {

  private editor: Editor
  private undoStack: DeltaItem[] = [];
  private redoStack: DeltaItem[] = [];
  private MAX_STACK_SIZE = 50;

  constructor(editor: Editor) {
    this.editor = editor
  }
  
  push(deltaItem: DeltaItem): void {
    this.undoStack.push(deltaItem);
    this.redoStack = [];  // 每次保存新状态时清空 redo 栈
    if (this.undoStack.length > this.MAX_STACK_SIZE) {
      this.undoStack.shift();
    }
  }

  undo() {
    if (this.undoStack.length > 0) {
      const item = this.undoStack.pop();
      console.log('undo stack', JSON.stringify(this.undoStack))
      let iDelta = item.delta.inverse(this.editor.getNextDeltas(item.delta))
      if (iDelta == null) {
        return
      }
      item.delta.nextReserve = iDelta
      console.log('undo inverse', JSON.stringify(item), JSON.stringify(iDelta))
      this.editor.applyDelta(iDelta, DeltaSource.UndoRedo)
      this.redoStack.push({delta:iDelta});
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const item = this.redoStack.pop();
      console.log('redo stack', JSON.stringify(this.redoStack))
      let iDelta = item.delta.inverse(this.editor.getNextDeltas(item.delta))
      if (iDelta == null) {
        return
      }
      item.delta.nextReserve = iDelta
      console.log('redo inverse', JSON.stringify(item), JSON.stringify(iDelta))
      this.editor.applyDelta(iDelta, DeltaSource.UndoRedo)
      this.undoStack.push({delta:iDelta});
    }
  }
}
