import {Editor} from "./editor";

export type RangeSnapshot = {
  startContainerPath: string;
  startOffset: number;
  endContainerPath: string;
  endOffset: number;
};

export type EditorState = {
  content: string
  selection: RangeSnapshot
}

export class UndoManager {

  private editor: Editor
  private undoStack: EditorState[] = [];
  private redoStack: EditorState[] = [];
  private MAX_STACK_SIZE = 50;

  constructor(editor: Editor) {
    this.editor = editor
  }
  
  saveState(state: EditorState): void {
    this.undoStack.push(state);
    this.redoStack = [];  // 每次保存新状态时清空 redo 栈
    if (this.undoStack.length > this.MAX_STACK_SIZE) {
      this.undoStack.shift();
    }
    
    this.undoStack.forEach(us => {
      console.log(us.content)
    })
  }

  undo() {
    if (this.undoStack.length > 1) {
      const currentState = this.undoStack.pop();
      this.redoStack.push(currentState);
      this.editor.applyEditorState(this.undoStack[this.undoStack.length - 1])
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const stateToRedo = this.redoStack.pop();
      this.undoStack.push(stateToRedo);
      this.editor.applyEditorState(stateToRedo)
    }
  }
}
