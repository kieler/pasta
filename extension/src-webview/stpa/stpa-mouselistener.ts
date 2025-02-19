import { isExpandable, MouseListener, SLabelImpl, SModelElementImpl } from "sprotty";
import { Action, CollapseExpandAction } from "sprotty-protocol";
import { flagConnectedElements, flagSameAspect } from "./helper-methods";
import { CS_NODE_TYPE, STPA_NODE_TYPE, STPAEdge, STPANode } from "./stpa-model";

export class StpaMouseListener extends MouseListener {
    protected flaggedElements: (STPANode | STPAEdge)[] = [];

    mouseDown(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        // when a label is selected, we are interested in its parent node
        target = target instanceof SLabelImpl ? target.parent : target;
        if (target.type === STPA_NODE_TYPE) {
            if (event.ctrlKey) {
                // when ctrl is pressed all nodes with the same aspect as the selected one should be highlighted
                this.flaggedElements.push(...flagSameAspect(target as STPANode));
            } else {
                // if no key modifier is used, the "highlight" attribute is set for the nodes and edges connected to the selected node
                this.flaggedElements.push(...flagConnectedElements(target as STPANode));
            }
        } else {
            // if no STPANode is selected, unflag the elements and reset the list
            this.reset();
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
        for (const element of this.flaggedElements) {
            element.highlight = false;
        }
        this.flaggedElements = [];
    }
}
