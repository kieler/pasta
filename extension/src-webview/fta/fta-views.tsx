/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2023 by
 * + Kiel University
 *   + Department of Computer Science
 *     + Real-Time and Embedded Systems Group
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */

/** @jsx svg */
import { injectable } from 'inversify';
import { VNode } from "snabbdom";
import { IViewArgs, PolylineEdgeView, RectangularNodeView, RenderingContext, SEdgeImpl, SGraphImpl, SGraphView, svg } from 'sprotty';
import { Point } from "sprotty-protocol";
import { renderAndGate, renderEllipse, renderHorizontalLine, renderInhibitGate, renderKnGate, renderOrGate, renderRectangleForNode, renderRoundedRectangle, renderVerticalLine } from "../views-rendering";
import { DescriptionNode, FTAEdge, FTAGraph, FTANode, FTAPort, FTA_DESCRIPTION_NODE_TYPE, FTA_EDGE_TYPE, FTA_NODE_TYPE, FTA_PORT_TYPE, FTNodeType } from './fta-model';

@injectable()
export class PolylineArrowEdgeViewFTA extends PolylineEdgeView {

    protected renderLine(edge: FTAEdge, segments: Point[], context: RenderingContext): VNode {
        const firstPoint = segments[0];
        let path = `M ${firstPoint.x},${firstPoint.y}`;
        for (let i = 1; i < segments.length; i++) {
            const p = segments[i];
            path += ` L ${p.x},${p.y}`;
        }
        // renderings for all junction points
        const junctionPointRenderings = edge.junctionPoints?.map(junctionPoint =>
            renderEllipse(junctionPoint.x, junctionPoint.y, 4, 4, 1)
        );

        // if an FTANode is selected, the components not connected to it should fade out
        return <g class-fta-edge={true} class-greyed-out={edge.notConnectedToSelectedCutSet}>
            <path d={path} />
            {...(junctionPointRenderings ?? [])}
        </g>;
    }

}

@injectable()
export class FTAInvisibleEdgeView extends PolylineArrowEdgeViewFTA {
    render(edge: Readonly<SEdgeImpl>, context: RenderingContext, args?: IViewArgs | undefined): VNode | undefined {
        return <g></g>;
    }
}

@injectable()
export class DescriptionNodeView extends RectangularNodeView {
    render(node: DescriptionNode, context: RenderingContext): VNode | undefined {
        // render the description node similar to an on edge label
        const element = renderRectangleForNode(node);
        const border1 = renderHorizontalLine(node);
        const border2 = renderHorizontalLine(node);
        const edge = renderVerticalLine(node);
        const translateBorder = `translate(0, ${Math.max(node.size.height, 0)})`;
        const translateEdge = `translate(${Math.max(node.size.width / 2.0, 0)}, 0)`;
        return <g
            class-fta-node={true}
            class-mouseover={node.hoverFeedback}
            class-greyed-out={node.notConnectedToSelectedCutSet}>
            <g class-vertical-edge={true} transform={translateEdge}>{edge}</g>
            <g class-gate-description={true} class-node-selected={node.selected} class-fta-highlight-node={node.inCurrentSelectedCutSet}>{element}</g>
            <g class-description-border={true}>{border1}</g>
            <g class-description-border={true} transform={translateBorder}>{border2}</g>
            {context.renderChildren(node)}
        </g>;
    }
}

@injectable()
export class FTANodeView extends RectangularNodeView {

    render(node: FTANode, context: RenderingContext): VNode {
        // create the element based on the type of the node
        let element: VNode;
        switch (node.nodeType) {
            case FTNodeType.PARENT:
                // parent is invisible
                return <g
                    class-fta-node={true}
                    class-mouseover={node.hoverFeedback}
                    class-greyed-out={false}>
                    {context.renderChildren(node)}
                </g>;
            case FTNodeType.TOPEVENT:
                element = renderRectangleForNode(node);
                break;
            case FTNodeType.COMPONENT:
            case FTNodeType.CONDITION:
                element = renderRoundedRectangle(node, 15, 15);
                break;
            case FTNodeType.AND:
                element = renderAndGate(node);
                break;
            case FTNodeType.OR:
                element = renderOrGate(node);
                break;
            case FTNodeType.KN:
                element = renderKnGate(node, node.k as number, node.n as number);
                break;
            case FTNodeType.INHIBIT:
                element = renderInhibitGate(node);
                break;
            default:
                element = renderRectangleForNode(node);
                break;
        }

        // if a cut set is selected, highlight the nodes in it and grey out not-connected elements
        return <g
            class-fta-node={true}
            class-mouseover={node.hoverFeedback}
            class-greyed-out={node.notConnectedToSelectedCutSet}>
            <g class-top-event={node.type === FTA_NODE_TYPE && node.topOfAnalysis} class-node-selected={node.selected} class-fta-highlight-node={node.inCurrentSelectedCutSet}>{element}</g>
            {context.renderChildren(node)}
        </g>;
    }
}

@injectable()
export class FTAGraphView extends SGraphView {

    render(model: Readonly<FTAGraph>, context: RenderingContext): VNode {
        if (model.children.length !== 0) {

            // find top event
            let topEvent: FTANode | undefined;
            model.children.forEach((child) => {
                if (child.type === FTA_NODE_TYPE) {
                    if ((child as FTANode).topOfAnalysis) {
                        topEvent = child as FTANode;
                    } else {
                        const children = child.children.filter((child) => child.type === FTA_NODE_TYPE);
                        const toaChild = children.find(child => (child as FTANode).topOfAnalysis);
                        if (toaChild) {
                            topEvent = toaChild as FTANode;
                        }
                    }
                }
            });

            if (topEvent) {
                // if a cut set is selected, for which the top event is not the root, 
                // we must hide the edges we dont inspect when calling "highlightConnectedToCutSet"
                model.children.forEach(child => {
                    if (child.type === FTA_EDGE_TYPE) {
                        (child as FTAEdge).notConnectedToSelectedCutSet = true;
                    } else if (child.type === FTA_NODE_TYPE) {
                        (child as FTANode).children.forEach(child => {
                            if (child.type === FTA_EDGE_TYPE) {
                                (child as FTAEdge).notConnectedToSelectedCutSet = true;
                            }
                        });
                    }
                });
                // highlight connected nodes
                if (topEvent.parent.children.find(child => child.type === FTA_DESCRIPTION_NODE_TYPE)) {
                    this.highlightConnectedToCutSet(model, topEvent.parent as FTANode);
                } else {
                    this.highlightConnectedToCutSet(model, topEvent as FTANode);
                }
            }
        }

        return super.render(model, context);
    }
    /**
     * Highlights the nodes and edges connected to the selected cut set.
     * @param model The FTAGraph.
     * @param currentNode The current node, which should be handled including its targets.
     */
    protected highlightConnectedToCutSet(model: SGraphImpl, currentNode: FTANode): void {
        for (const port of currentNode.children.filter(child => child.type === FTA_PORT_TYPE)) {
            const edge = model.children.find(child => child.type === FTA_EDGE_TYPE && (child as FTAEdge).sourceId === port.id) as FTAEdge;
            if (edge) {
                edge.notConnectedToSelectedCutSet = true;
                if (edge.target instanceof FTAPort) {
                    const target = (edge.target as FTAPort).parent as FTANode;
                    // handle successor nodes
                    this.highlightConnectedToCutSet(model, target);
                    // handle current node
                    if (!target.notConnectedToSelectedCutSet) {
                        currentNode.notConnectedToSelectedCutSet = false;
                        edge.notConnectedToSelectedCutSet = false;
                    }
                    // handle edges in parents
                    if (currentNode.nodeType === FTNodeType.PARENT) {
                        const innerEdge = currentNode.children.find(child => child.type === FTA_EDGE_TYPE && (child as FTAEdge).targetId === edge.sourceId) as FTAEdge;
                        innerEdge.notConnectedToSelectedCutSet = edge.notConnectedToSelectedCutSet;
                    }
                }
            }
        }
        // handle nodes in parents
        if (currentNode.nodeType === FTNodeType.PARENT) {
            currentNode.children.forEach(child => {
                if (child.type === FTA_NODE_TYPE || child.type === FTA_DESCRIPTION_NODE_TYPE) {
                    (child as FTANode).notConnectedToSelectedCutSet = currentNode.notConnectedToSelectedCutSet;
                }
            });
        }
    }

}
