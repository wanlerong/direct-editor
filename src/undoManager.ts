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

  private executeOperation(sourceStack: DeltaItem[], targetStack: DeltaItem[], operation: string): void {
    if (sourceStack.length > 0) {
      const item = sourceStack.pop();
      console.log(`${operation} stack`, JSON.stringify(sourceStack));

      let iDelta = item.delta.inverse(this.editor.getNextDeltas(item.delta));
      if (iDelta == null) {
        return;
      }

      item.delta.nextReserve = iDelta;
      console.log(`${operation} inverse`, JSON.stringify(item), JSON.stringify(iDelta));

      this.editor.applyDelta(iDelta, DeltaSource.UndoRedo);
      targetStack.push({delta: iDelta});
    }
  }
  
  undo(): void {
    this.executeOperation(this.undoStack, this.redoStack, 'undo');
  }

  redo(): void {
    this.executeOperation(this.redoStack, this.undoStack, 'redo');
  }
}