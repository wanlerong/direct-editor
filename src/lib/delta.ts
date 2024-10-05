import {RangeSnapshot} from "../range";

// https://github.com/ottypes/json0
type key = number | string

// insertText {p:[path,offset], si:s}
// deleteText {p:[path,offset], sd:s}
// insertNode {p:[path,idx], li:obj}
// removeNode {p:[path,idx], ld:obj}
// replaceNode {p:[path,idx], li:obj, ld:obj2}
// addAttr {p:[path,key], oi:obj}
// removeAttr {p:[path,key], od:obj}
// updateAttr {p:[path,key], oi:obj, od:obj}
interface Op {
  p: key[] // path
  
  si?: string // insertText
  sd?: string // deleteText 
  li?: any // insertNode 
  ld?: any // removeNode 
  oi?: any // addAttr 
  od?: any // removeAttr 
}

export class Delta {
  public ops: Op[]

  constructor(opList?: Op[]) {
    this.ops = opList ? opList : []
  }
  
  inverse(): Delta {
    let delta = new Delta()
    this.ops.forEach(op => {
      delta.ops.push({
        p: op.p,
        si: op.sd,
        sd: op.si,
      })
    })
    return delta 
  }
}

export type DeltaItem = {
  delta: Delta
  selection?: RangeSnapshot // delta 变更前的 selection 快照
}
