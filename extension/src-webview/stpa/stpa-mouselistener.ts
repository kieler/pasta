import { isExpandable, MouseListener, SLabelImpl, SModelElementImpl } from "sprotty";
import { Action, CollapseExpandAction } from "sprotty-protocol";
import { injectable, inject, postConstruct } from 'inversify';
import { DISymbol } from "../di.symbols";
import { OptionsRegistry } from "../options/options-registry";
import { getConnectedElements, getSameAspect, getAllRelationshipGraphNodes } from "./helper-methods";
import { CS_NODE_TYPE, CS_EDGE_TYPE, STPA_NODE_TYPE, STPAEdge, STPANode, EdgeType, CSEdge, EdgeLabel, CSInvisibleSubcomponent } from "./stpa-model";
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
    // all STPANodes of the current relationship graph                  
    private allSTPANodesCache: STPANode[] | undefined;


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
        let targetChild: EdgeLabel | undefined;
        // when a label is selected, we are interested in its parent node or also in its children, when its a CSEdge
        if (target instanceof SLabelImpl) {
            if (target.parent.type === CS_EDGE_TYPE) {
                targetChild = target as EdgeLabel;
            }
            target = target.parent;
        }
       
        let matchingNodes: STPANode[] | undefined;

        if (target.type !== STPA_NODE_TYPE && target.type !== CS_NODE_TYPE && target.type !== CS_EDGE_TYPE) {
            // if no STPANode is selected, unflag the elements and reset the set
            this.reset();
            this.selectedNodes.clear();
            return [HighlightUpdateAction.create([])];
        } else if (target.type === CS_NODE_TYPE) {
            // if a controller is pressed, select the associated responsibilities
            this.allSTPANodesCache ??= getAllRelationshipGraphNodes(target);
            matchingNodes = this.allSTPANodesCache.filter(node => {
                return node.controller === target.id; 
            });
        } else if (target.type === CS_EDGE_TYPE && (target as CSEdge).edgeType === EdgeType.CONTROL_ACTION) {
            // if a control action is clicked, select the associated UCAs
            this.allSTPANodesCache ??= getAllRelationshipGraphNodes(target);
            matchingNodes = this.allSTPANodesCache.filter(node => {
                return node.controlAction === (targetChild as EdgeLabel).controlAction; 
            });
        } 
        if (!event.ctrlKey) {
            // if the ctrl key is not pressed, only select one node
            this.reset();
            this.selectedNodes.clear();
        }

        const mode: 'shift' | 'normal' = event.shiftKey ? 'shift' : 'normal';
        const targets = matchingNodes ? matchingNodes : [target as STPANode];

        // Each STPANode can be selected in multiple modes (e.g. 'normal' or 'shift')
        // Manage selection state for a node depending on the current input mode.
        for (const node of targets) {
            const modes = this.selectedNodes.get(node);

            if (!modes) {
                // Node not selected yet — add it with the current mode
                this.selectedNodes.set(node, new Set([mode]));
            } else if (modes.has(mode)) {
                // Node selected in this mode - deselect only this mode
                modes.delete(mode);

                if (modes.size === 0) {
                    // No modes left — remove node entirely
                    this.selectedNodes.delete(node);
                }
            } else {
                // Add mode to existing selection
                modes.add(mode);
            }
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
        return [HighlightUpdateAction.create(highlightIds)];
    }

    doubleClick(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        // when a label is selected, we are interested in its parent node
        target = target instanceof SLabelImpl ? target.parent : target;
        // when the label was inside an invisible subcomponent, we are interested in the parent of the subcomponent
        target = target instanceof CSInvisibleSubcomponent ? target.parent : target;
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
        this.allSTPANodesCache = undefined;
    }

    /**
     * Function for resetting highlights, when highlight options gets toggled.
     */
    private handleHighlightToggled(): void {
        this.completeReset();
    }
}
