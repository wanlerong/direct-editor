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
  public seq: number
  public ops: Op[]
  public nextReserve: Delta

  constructor(opList?: Op[]) {
    this.ops = opList ? opList : []
  }

  adjustPurePath(nextDeltas: Delta[]): Delta {
    let delta = new Delta()
    let canAdjust = true
    Array.from(this.ops).reverse().forEach(op => {
      let adjustedPath = [...op.p];  // 基于当前 path
      let isS = op.si || op.sd
      let isL = op.li || op.ld
      nextDeltas.forEach(nextDelta => {
        if (!nextDelta) {
          return
        }
        nextDelta.ops.forEach(nextOp => {
          let targetNodePath = adjustedPath.slice(0, -1)
          if (isS) {
            targetNodePath = adjustedPath.slice(0, -2) // text node's parent path
          }
          if (nextOp.li) {
            let parentPath = nextOp.p.slice(0, -1) // 该 path 下有 insert 子元素
            if (parentPath.length <= targetNodePath.length && Delta.isPathAffected(targetNodePath, parentPath)) {
              // nextOp.p.length - 1 即发生 insert 的那一层的深度
              const insertionIndex = nextOp.p[nextOp.p.length - 1] as number;
              const pathIndex = adjustedPath[nextOp.p.length - 1] as number;
              if (insertionIndex <= pathIndex) {
                adjustedPath[nextOp.p.length - 1] = pathIndex + 1;
              }
            }
          } else if (nextOp.ld) {
            let parentPath = nextOp.p.slice(0, -1)
            if (parentPath.length <= targetNodePath.length && Delta.isPathAffected(targetNodePath, parentPath)) {
              const delIndex = nextOp.p[nextOp.p.length - 1] as number;
              const pathIndex = adjustedPath[nextOp.p.length - 1] as number;
              if (delIndex < pathIndex) {
                adjustedPath[nextOp.p.length - 1] = pathIndex - 1;
              } else if (delIndex == pathIndex) {
                // del by other，do not need undo anymore, 也不会对更前面的 path 造成影响
                canAdjust = false
                return
              }
            }
          } else if (nextOp.si || nextOp.sd) {
            if (isL) {
              return
            }
            let targetTextPath = adjustedPath.slice(0, -1) // text node's path
            let nextTextPath = nextOp.p.slice(0, -1) // text node's path
            if (arrayEquals(targetTextPath, nextTextPath)) {
              if (nextOp.si) {
                if (op.si && op.si.length > 1) {
                  let left = adjustedPath[adjustedPath.length - 1] as number
                  let right = left + (op.si as string).length - 1
                  let siLeft = nextOp.p[nextOp.p.length - 1] as number
                  if (siLeft > left && siLeft <= right) {
                    // next op insert between prev range, can't undo anymore
                    canAdjust = false
                    return;
                  }
                }
                if (nextOp.p[nextOp.p.length - 1] <= adjustedPath[adjustedPath.length - 1]) {
                  (adjustedPath[adjustedPath.length - 1] as number) += nextOp.si.length;
                }
              }
              if (nextOp.sd) {
                if (op.si && nextOp.sd.length > 0) {
                  let left = adjustedPath[adjustedPath.length - 1] as number
                  let right = left + (op.si as string).length - 1
                  let sdLeft = nextOp.p[nextOp.p.length - 1] as number
                  let sdRight = sdLeft + nextOp.sd.length - 1
                  if (left <= sdRight && sdLeft <= right) {
                    // del by other，do not need undo anymore
                    canAdjust = false
                    return;
                  }
                }
                if (nextOp.p[nextOp.p.length - 1] < adjustedPath[adjustedPath.length - 1]) {
                  (adjustedPath[adjustedPath.length - 1] as number) -= nextOp.sd.length;
                }
              }
            }
          }
        })
      });
      delta.ops.push({
        ...op,
        p: adjustedPath,
      })
    })

    if (canAdjust) {
      // console.log("pure", JSON.stringify(delta))
      return delta
    } else {
      return null
    }
  }

  // delta 依据后面发生的 delta 去 adjustPath
  // nextDeltas 中可能包含成对的
  adjustPath(nextDeltas: Delta[]): Delta {
    let finalPureDeltas = []
    let pureDeltas = [] // 不含成对的
    let reverseDeltasMap = {}
    let reverseDeltasCount = 0

    nextDeltas.forEach(nextDelta => {
      if (reverseDeltasMap[nextDelta.seq]) {
        pureDeltas = pureDeltas.map(it => {
          return it.adjustPurePath([reverseDeltasMap[nextDelta.seq]])
        })
        delete reverseDeltasMap[nextDelta.seq]
        reverseDeltasCount--
        // console.log(reverseDeltasCount)
        if (reverseDeltasCount == 0) {
          finalPureDeltas.push(...pureDeltas)
          // console.log(JSON.stringify(pureDeltas), JSON.stringify(finalPureDeltas))
          pureDeltas = []
        }
        return;
      }
      
      if (nextDelta.nextReserve) {
        reverseDeltasMap[nextDelta.nextReserve.seq] = nextDelta.nextReserve
        reverseDeltasCount++
        return
      } else {
        if (reverseDeltasCount > 0){
          pureDeltas.push(nextDelta)
        } else {
          finalPureDeltas.push(nextDelta)
        }
      }
    })

    // console.log("11111 final", JSON.stringify(finalPureDeltas))
    return this.adjustPurePath(finalPureDeltas)
  }

  /**
   * @param nextDeltas 后续的deltas，会对前面的 deltas 的 path 有影响
   */
  inverse(nextDeltas: Delta[]): Delta {
    let delta = this.adjustPath(nextDeltas)
    if (!delta) {
      return null
    }
    
    delta.ops = delta.ops.map(op => {
      return {
        p: op.p,
        si: op.sd,
        sd: op.si,
        li: op.ld,
        ld: op.li,
        oi: op.od,
        od: op.oi,
      }
    })
    return delta
  }

  private static isPathAffected(path: key[], opPath: key[]): boolean {
    for (let i = 0; i < opPath.length; i++) {
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
