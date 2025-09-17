import { isExpandable, MouseListener, SLabelImpl, SModelElementImpl } from "sprotty";
import { Action, CollapseExpandAction } from "sprotty-protocol";
import { injectable, inject, postConstruct } from 'inversify';
import { DISymbol } from "../di.symbols";
import { OptionsRegistry } from "../options/options-registry";
import { getConnectedElements, getSameAspect } from "./helper-methods";
import { CS_NODE_TYPE, STPA_NODE_TYPE, STPAEdge, STPANode } from "./stpa-model";
import { HighlightUpdateAction } from "../actions";
import { UpdateOptionsAction } from "../options/actions";
import { IdSet, IdMap } from "./stpa-helpers";

@injectable()
export class StpaMouseListener extends MouseListener {
    // all Nodes that were clicked by the user with the corresponding mode
    protected selectedNodes: IdMap<STPANode, Set<'shift' | 'normal'>> = new IdMap();
    // Set off all the highlighted nodes and edges of the graph
    protected flaggedElementsSet: IdSet<STPANode | STPAEdge> = new IdSet();
    // Caches graph traversal results to avoid recomputing connected elements. Maps node to flagConnectedElements (normal) / flagSameAspect (shift) 
    protected connectionCache: IdMap<STPANode, { 
                                  normal?: IdSet<STPANode | STPAEdge>,
                                  shift?: IdSet<STPANode | STPAEdge>
                               }> = new IdMap();                     

    @inject(DISymbol.OptionsRegistry) private OptionsRegistry: OptionsRegistry;
    @postConstruct()
    init(): void {
        // Subscribe to different registry changes and always reset except for a graph update caused by HighlightUpdateAction
        this.OptionsRegistry.onChange((action?: UpdateOptionsAction) => {
        // If the action is from highlight, skip reset
        if (action?._source === "highlight") {
            return; // Skip reset on highlight update
        }
        this.handleHighlightToggled();
        });
    }

    mouseDown(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        // when a label is selected, we are interested in its parent node
        target = target instanceof SLabelImpl ? target.parent : target;

        if (target.type !== STPA_NODE_TYPE) {
            // if no STPANode is selected, unflag the elements and reset the set
            this.reset();
            this.selectedNodes.clear();
            return [HighlightUpdateAction.create([])];
        } else if (!event.ctrlKey) {
            // if the ctrl key is not pressed, only select one node at a time
            this.reset();
            this.selectedNodes.clear();
        }

        const mode: 'shift' | 'normal' = event.shiftKey ? 'shift' : 'normal';
        let modes = this.selectedNodes.get(target as STPANode);

        // Each STPANode can be selected in multiple modes (e.g. 'normal' or 'shift')
        // Manage selection state for a node depending on the current input mode.
        if (!modes) {
            // Node not selected yet — add it with the current mode
            this.selectedNodes.set(target as STPANode, new Set([mode]));
        } else if (modes.has(mode)) {
            // Node selected in this mode - deselect only this mode
            modes.delete(mode);

            if (modes.size === 0) {
                // No modes left — remove node entirely
                this.selectedNodes.delete(target as STPANode);
            }
        } else {
            // Add mode to existing selection
            modes.add(mode);
        }

        // Clear previous highlights
        this.reset(); 

        for (const [node, modes] of this.selectedNodes) {
            const cache = this.connectionCache.get(node) ?? {};

            for (const mode of modes) {
                // is a node with this mode already in the cache?
                if (!cache[mode]) {
                    // if not, create new Set
                    cache[mode] = new IdSet(
                        mode === 'shift' ? getSameAspect(node) : getConnectedElements(node)
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
            element.highlight = true;  
        }

        const highlightIds = [...this.flaggedElementsSet].map(el => el.id);
        return [HighlightUpdateAction.create(highlightIds)]; // TODO: now working for strg for some reason
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
     * Resets the highlight attribute of the highlighted nodes and clears the set of flagged elements.
     */
    protected reset(): void {
        for (const element of this.flaggedElementsSet) {
            element.highlight = false;
        }
        this.flaggedElementsSet.clear();
    }

    /**
     * Resets the highlight attribute of the highlighted nodes and clears all sets and maps.
     */
    private completeReset(): void {
        this.reset();
        this.selectedNodes.clear();
        this.connectionCache.clear();
    }

    /**
     * Function for resetting highlights, when highlight options gets toggled.
     */
    private handleHighlightToggled(): void {
        this.completeReset();
    }
}
