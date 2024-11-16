import {Editor} from "./editor";
import {DeltaItem} from "./lib/delta";
import {DeltaSource} from "./const/const";

export class UndoManager {

  private editor: Editor
  private undoStack: DeltaItem[] = [];
  private redoStack: DeltaItem[] = [];
  private MAX_STACK_SIZE = 50;

  constructor(editor: Editor) {
    this.editor = editor
  }
  
  push(deltaItem: DeltaItem): void {
    console.log('push undo stack', JSON.stringify(deltaItem))
    
    this.undoStack.push(deltaItem);
    this.redoStack = [];  // 每次保存新状态时清空 redo 栈
    if (this.undoStack.length > this.MAX_STACK_SIZE) {
      this.undoStack.shift();
    }
  }

  undo() {
    if (this.undoStack.length > 0) {
      const item = this.undoStack.pop();
      let iDelta = item.delta.inverse(this.editor.deltas)
      console.log('inverse', JSON.stringify(item), JSON.stringify(iDelta))
      this.redoStack.push({delta:iDelta});
      this.editor.applyDelta(iDelta, DeltaSource.UndoRedo)
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const item = this.redoStack.pop();
      let iDelta = item.delta.inverse(this.editor.deltas)
      
      console.log('inverse', JSON.stringify(item), JSON.stringify(iDelta))
      
      this.undoStack.push({delta:iDelta});
      this.editor.applyDelta(iDelta, DeltaSource.UndoRedo)
    }
  }
}
