import { CallFrame } from "./types"

export type FlameNode = {
    name: string 
    value: number 
    children?: FlameNode[]
}

/**
 * 
 * @param frame Convert a CallFrame tree into a FlameNode tree
 * for flame graph viz
 * 
 */
export function toFlameTree(frame: CallFrame): FlameNode {
    const node: FlameNode = {
        name: frame.name,
        value: frame.gasUsed,
    }

    if (frame.children.length > 0) {
        node.children = frame.children.map(toFlameTree)
    }

    return node

}
