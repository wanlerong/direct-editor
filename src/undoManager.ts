import {Editor} from "./editor";
import {DeltaItem} from "./lib/delta";

export class UndoManager {

  private editor: Editor
  private undoStack: DeltaItem[] = [];
  private redoStack: DeltaItem[] = [];
  private MAX_STACK_SIZE = 50;

  constructor(editor: Editor) {
    this.editor = editor
  }
  
  push(deltaItem: DeltaItem): void {
    console.log(JSON.stringify(deltaItem))
    this.undoStack.push(deltaItem);
    this.redoStack = [];  // 每次保存新状态时清空 redo 栈
    if (this.undoStack.length > this.MAX_STACK_SIZE) {
      this.undoStack.shift();
    }
  }

  undo() {
    if (this.undoStack.length > 0) {
      const item = this.undoStack.pop();
      this.redoStack.push(item);
      this.editor.applyDelta(item.delta.inverse())
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const toRedo = this.redoStack.pop();
      this.undoStack.push(toRedo);
      this.editor.applyDelta(toRedo.delta)
    }
  }
}
