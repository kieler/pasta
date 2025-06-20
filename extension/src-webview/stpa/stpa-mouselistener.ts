import { isExpandable, MouseListener, SLabelImpl, SModelElementImpl } from "sprotty";
import { Action, CollapseExpandAction } from "sprotty-protocol";
import { flagConnectedElements, flagSameAspect } from "./helper-methods";
import { CS_NODE_TYPE, STPA_NODE_TYPE, STPAEdge, STPANode } from "./stpa-model";

export class StpaMouseListener extends MouseListener {
    protected selectedNodes: Map<STPANode, Set<'ctrl' | 'normal'>> = new Map();
    protected flaggedElementsSet: Set<STPANode | STPAEdge> = new Set();
    protected connectionCache: Map<STPANode, {
                                normal?: Set<STPANode | STPAEdge>,
                                ctrl?: Set<STPANode | STPAEdge>
                            }> = new Map();                     //TODO: can this map grow to large?

    // TODO: maybe also other click for only deselecting clicked node / complete tree / ...
    mouseDown(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        // when a label is selected, we are interested in its parent node
        target = target instanceof SLabelImpl ? target.parent : target;

        if (target.type !== STPA_NODE_TYPE) {
            // if no STPANode is selected, unflag the elements and reset the set
            this.reset();
            this.selectedNodes.clear();
            return [];
        }

        const mode: 'ctrl' | 'normal' = event.ctrlKey ? 'ctrl' : 'normal';
        let modes = this.selectedNodes.get(target as STPANode);

        if (!modes) {
            // Node not selected yet — add it with the current mode
            this.selectedNodes.set(target as STPANode, new Set([mode]));
        } else if (modes.has(mode)) {
            // Deselect only this mode
            modes.delete(mode);

            if (modes.size === 0) {
                // No modes left — remove node entirely
                this.selectedNodes.delete(target as STPANode);
            }
        } else {
            // Add mode to existing selection
            modes.add(mode);
            console.log("select");
        }


        // Clear previous highlights
        this.reset(); 

        for (const [node, modes] of this.selectedNodes) {
            const cache = this.connectionCache.get(node) ?? {};

            for (const mode of modes) {
                // is a node with this mode already in the cache?
                if (!cache[mode]) {
                    // if not, create new Set
                    cache[mode] = new Set(
                        mode === 'ctrl' ? flagSameAspect(node) : flagConnectedElements(node)
                    );
                    this.connectionCache.set(node, cache);
                }
                // get the set for this node and mode
                const connected = cache[mode]!;

                // add all elem of the sets to be highlighted
                for (const element of connected) {
                    this.flaggedElementsSet.add(element);
                }
            }
        }

        // Apply highlights
        for (const element of this.flaggedElementsSet) {
            element.highlight = true;  //TODO: warum sind manche edges heller ohne highlight?
        }

        return [];
    }


    doubleClick(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        // when a label is selected, we are interested in its parent node
        target = target instanceof SLabelImpl ? target.parent : target;
        // if the selected node is expandable, the node should be expanded or collapsed
        if (target.type === CS_NODE_TYPE && isExpandable(target)) {
            return [
                CollapseExpandAction.create({
                    expandIds: target.expanded ? [] : [target.id],
                    collapseIds: target.expanded ? [target.id] : [],
                }),
            ];
        }
        return [];
    }

    /**
     * Resets the highlight attribute of the highlighted nodes.
     */
    protected reset(): void {
        for (const element of this.flaggedElementsSet) {
            element.highlight = false;
        }
        this.flaggedElementsSet.clear();
    }
}
