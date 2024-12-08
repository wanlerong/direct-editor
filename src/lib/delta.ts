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
      let adjustedPath = [...op.p];  // 基于当前 path
      let needUndo = true

      let isS = op.si || op.sd
      let isL = op.li || op.ld

      baseDeltas.forEach((baseDelta, idx) => {
        if (idx <= sequenceNumber) {
          // 忽略所有序列号小于当前 deltaA 的操作
          return;
        }

        baseDelta.ops.forEach(baseOp => {
          let targetNodePath = adjustedPath.slice(0, -1)
          if (isS) {
            targetNodePath = adjustedPath.slice(0, -2) // text node's parent path
          }
          if (baseOp.li) {
            let parentPath = baseOp.p.slice(0, -1) // 该 path 下有 insert 子元素
            if (parentPath.length <= targetNodePath.length && Delta.isPathAffected(targetNodePath, parentPath)) {
              // baseOp.p.length - 1 即发生 insert 的那一层的深度
              const insertionIndex = baseOp.p[baseOp.p.length - 1] as number;
              const pathIndex = adjustedPath[baseOp.p.length - 1] as number;
              if (insertionIndex <= pathIndex) {
                adjustedPath[baseOp.p.length - 1] = pathIndex + 1;
              }
            }
          } else if (baseOp.ld) {
            let parentPath = baseOp.p.slice(0, -1)
            if (parentPath.length <= targetNodePath.length && Delta.isPathAffected(targetNodePath, parentPath)) {
              const delIndex = baseOp.p[baseOp.p.length - 1] as number;
              const pathIndex = adjustedPath[baseOp.p.length - 1] as number;
              if (delIndex < pathIndex) {
                adjustedPath[baseOp.p.length - 1] = pathIndex - 1;
              } else if (delIndex == pathIndex) {
                // del by other，do not need undo anymore
                needUndo = false
              }
            }
          } else if (baseOp.si || baseOp.sd) {
            if (isL) {
              return
            }
            let targetTextPath = adjustedPath.slice(0, -1) // text node's path
            let baseTextPath = baseOp.p.slice(0, -1) // text node's path
            if (arrayEquals(targetTextPath, baseTextPath)) {
              if (baseOp.si) {
                if (baseOp.p[baseOp.p.length - 1] <= adjustedPath[adjustedPath.length - 1]) {
                  (adjustedPath[adjustedPath.length - 1] as number) += baseOp.si.length;
                }
              } else if (baseOp.sd) {
                if (baseOp.p[baseOp.p.length - 1] <= adjustedPath[adjustedPath.length - 1]) {
                  (adjustedPath[adjustedPath.length - 1] as number) -= baseOp.sd.length;
                }
              }
            }
          }
        })
      });

      if (needUndo) {
        delta.ops.push({
          p: adjustedPath,
          si: op.sd,
          sd: op.si,
          li: op.ld,
          ld: op.li,
          oi: op.od,
          od: op.oi,
        })
      }

    })
    return delta
  }

  private static isPathAffected(path: key[], opPath: key[]): boolean {
    for (let i = 0; i < opPath.length - 1; i++) {
      if (path[i] !== opPath[i]) {
        return false;
      }
    }
    return true;
  }

}

function arrayEquals(arr1: (string | number)[], arr2: (string | number)[]): boolean {
  return arr1.length === arr2.length && arr1.every((v, i) => v === arr2[i]);
}

export type DeltaItem = {
  delta: Delta
  selection?: RangeSnapshot // delta 变更前的 selection 快照
}
