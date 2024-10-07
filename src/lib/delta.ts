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
export interface Op {
  p: key[] // path
  
  si?: string // insertText
  sd?: string // deleteText 
  li?: any // insertNode 
  ld?: any // removeNode 
  oi?: string | null // addAttr 
  od?: string | null // removeAttr
}

export class Delta {
  public ops: Op[]

  constructor(opList?: Op[]) {
    this.ops = opList ? opList : []
  }
  
  inverse(baseDeltas: Delta[]): Delta {
    // 获取当前 delta 在 baseDeltas 中的 index，作为序列号
    const sequenceNumber = baseDeltas.indexOf(this);
    let delta = new Delta()
    Array.from(this.ops).reverse().forEach(op => {
      let newPath = [...op.p];  // 基于当前 path
      baseDeltas.forEach((baseDelta, idx) => {
        if (idx <= sequenceNumber) {
          // 忽略所有序列号小于当前 deltaA 的操作
          return;
        }
        
        baseDelta.ops.forEach(baseOp => {
          if (baseOp.si || baseOp.sd) {
            if (arrayEquals(baseOp.p.slice(0, -1), newPath.slice(0, -1))) {
              if (baseOp.si) {
                if (baseOp.p[baseOp.p.length - 1] <= newPath[newPath.length - 1]) {
                  (newPath[newPath.length - 1] as number) += baseOp.si.length;
                }
              } else if (baseOp.sd) {
                if (baseOp.p[baseOp.p.length - 1] <= newPath[newPath.length - 1]) {
                  (newPath[newPath.length - 1] as number) -= baseOp.sd.length;
                }
              }
            }
          }
        })
      });
      
      delta.ops.push({
        p: op.p,
        si: op.sd,
        sd: op.si,
        li: op.ld,
        ld: op.li,
        oi: op.od,
        od: op.oi,
      })
    })
    return delta 
  }
}

function arrayEquals(arr1: (string | number)[], arr2: (string | number)[]): boolean {
  return arr1.length === arr2.length && arr1.every((v, i) => v === arr2[i]);
}

function arrayStartsWith(arr1: (string | number)[], arr2: (string | number)[]): boolean {
  return arr1.length >= arr2.length && arr2.every((v, i) => v === arr1[i]);
}

export type DeltaItem = {
  delta: Delta
  selection?: RangeSnapshot // delta 变更前的 selection 快照
}
