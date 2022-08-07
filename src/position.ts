class Position {
  private node: Node;
  private offset: number;

  constructor(node: Node, offset: number) {
    this.node = node
    this.offset = offset
  }
}

export default Position