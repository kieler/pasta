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

import { AstNode } from "langium";
import { GeneratorContext, IdCache, LangiumDiagramGenerator } from "langium-sprotty";
import { SLabel, SModelElement, SModelRoot, SNode } from "sprotty-protocol";
import { Component, Condition, Gate, ModelFTA, isComponent, isCondition, isKNGate } from "../../generated/ast.js";
import { HEADER_LABEL_TYPE } from "../../stpa/diagram/stpa-model.js";
import { getDescription } from "../../utils.js";
import { topOfAnalysis } from "../analysis/fta-cutSet-calculator.js";
import { FtaServices } from "../fta-module.js";
import { namedFtaElement } from "../utils.js";
import { DescriptionNode, FTAEdge, FTAGraph, FTANode, FTAPort } from "./fta-interfaces.js";
import {
    FTA_DESCRIPTION_NODE_TYPE,
    FTA_EDGE_TYPE,
    FTA_GRAPH_TYPE,
    FTA_INVISIBLE_EDGE_TYPE,
    FTA_NODE_TYPE,
    FTA_PORT_TYPE,
    FTNodeType,
    PortSide,
} from "./fta-model.js";
import { FtaSynthesisOptions, noCutSet, spofsSet } from "./fta-synthesis-options.js";
import { getFTNodeType, getTargets } from "./utils.js";
export class FtaDiagramGenerator extends LangiumDiagramGenerator {
    protected readonly options: FtaSynthesisOptions;

    /** Saves the Ids of the generated SNodes */
    protected idToSNode: Map<string, SNode> = new Map();
    /** Saves the parent node of a gate */
    protected parentOfGate: Map<string, SNode> = new Map();
    /** Saves the description node of a gate */
    protected descriptionOfGate: Map<string, SNode> = new Map();
    /** Saves the port of a node */
    protected nodeToPort: Map<string, FTAPort> = new Map();

    constructor(services: FtaServices) {
        super(services);
        this.options = services.options.SynthesisOptions;
    }

    /**
     * Generates an SGraph for the FTA model contained in {@code args}.
     * @param args GeneratorContext for the FTA model.
     * @returns the root of the generated SGraph.
     */
    protected generateRoot(args: GeneratorContext<ModelFTA>): SModelRoot {
        const { document } = args;
        const model = document.parseResult.value;
        const idCache = args.idCache;
        // reset maps
        this.descriptionOfGate = new Map();
        this.parentOfGate = new Map();
        this.idToSNode = new Map();

        const ftaChildren: SModelElement[] = [
            // create nodes for top event, components, conditions, and gates
            ...model.components.map(component => this.generateFTNode(component, idCache)),
            ...model.conditions.map(condition => this.generateFTNode(condition, idCache)),
            ...model.gates.map(gate => this.generateGate(gate, idCache)),
            // create edges for the gates and the top event
            ...model.gates.map(gate => this.generateEdges(gate, idCache)).flat(1),
        ];

        if (model.topEvent) {
            ftaChildren.push(
                this.generateFTNode(model.topEvent, idCache),
                ...this.generateEdges(model.topEvent, idCache)
            );
        }

        const graph: FTAGraph = {
            type: FTA_GRAPH_TYPE,
            id: "root",
            children: ftaChildren,
        };
        graph.modelOrder = this.options.getModelOrder();

        return graph;
    }

    /**
     * Generates the edges for the given {@code node}.
     * @param node FTA component for which the edges should be created.
     * @param idCache The ID cache of the FTA model.
     * @returns edges representing the references the given {@code node} contains.
     */
    protected generateEdges(node: AstNode, idCache: IdCache<AstNode>): SModelElement[] {
        const elements: SModelElement[] = [];
        const sourceId = idCache.getId(node);
        if (sourceId) {
            // for every reference an edge is created
            const targets = getTargets(node);
            for (const target of targets) {
                const targetId = idCache.getId(target);
                const edgeId = idCache.uniqueId(`${sourceId}_${targetId}`, undefined);

                // create port for the source node
                const sourceNode = this.idToSNode.get(sourceId);
                const sourcePortId = idCache.uniqueId(edgeId + "_port");
                sourceNode?.children?.push(this.createFTAPort(sourcePortId, PortSide.SOUTH));

                // create port for source parent and edge to this port
                let sourceParentPortId: string | undefined;
                if (this.parentOfGate.has(sourceId)) {
                    const parent = this.parentOfGate.get(sourceId);
                    sourceParentPortId = idCache.uniqueId(edgeId + "_port");
                    parent?.children?.push(this.createFTAPort(sourceParentPortId, PortSide.SOUTH));
                    const betweenEdgeId = idCache.uniqueId(edgeId + "_betweenEdge");
                    const e = this.generateFTEdge(
                        betweenEdgeId,
                        sourcePortId,
                        sourceParentPortId,
                        FTA_EDGE_TYPE,
                        idCache
                    );
                    parent?.children?.push(e);
                }

                // create edge to target
                if (targetId) {
                    let targetPortId: string | undefined = undefined;
                    if (this.parentOfGate.has(targetId)) {
                        // get the port id from the parent
                        const parent = this.parentOfGate.get(targetId);
                        targetPortId = this.nodeToPort.get(parent?.id ?? "")?.id;
                    } else {
                        // get the port id from the target node
                        const targetNode = this.idToSNode.get(targetId);
                        targetPortId = this.nodeToPort.get(targetNode?.id ?? "")?.id;
                    }

                    if (targetPortId) {
                        // create edge from source to target
                        const e = this.generateFTEdge(
                            edgeId,
                            sourceParentPortId ?? sourcePortId,
                            targetPortId,
                            FTA_EDGE_TYPE,
                            idCache
                        );
                        elements.push(e);
                    }
                }
            }
        }
        return elements;
    }

    /**
     * Generates a single FTAEdge based on the given arguments.
     * @param edgeId The ID of the edge that should be created.
     * @param sourceId The ID of the source of the edge.
     * @param targetId The ID of the target of the edge.
     * @param idCache The ID cache of the FTA model.
     * @param label The label of the edge.
     * @returns an FTAEdge.
     */
    protected generateFTEdge(
        edgeId: string,
        sourceId: string,
        targetId: string,
        type: string,
        idCache: IdCache<AstNode>,
        label?: string
    ): FTAEdge {
        const children = label ? this.createEdgeLabel(label, edgeId, idCache) : [];
        return {
            type: type,
            id: edgeId,
            sourceId: sourceId,
            targetId: targetId,
            children: children,
            notConnectedToSelectedCutSet: false,
        };
    }

    protected generateGate(node: Gate, idCache: IdCache<AstNode>): FTANode {
        const gateNode = this.generateFTNode(node, idCache);
        this.idToSNode.set(gateNode.id, gateNode);
        if (!this.options.getShowGateDescriptions() || node.description === undefined) {
            return gateNode;
        }
        // create node for gate description
        const descriptionNodeId = idCache.uniqueId(node.name + "Description");
        const label = getDescription(
            node.description,
            this.options.getLabelManagement(),
            this.options.getLabelShorteningWidth(),
            descriptionNodeId,
            idCache
        ).reverse();
        const descriptionNode: DescriptionNode = {
            type: FTA_DESCRIPTION_NODE_TYPE,
            id: descriptionNodeId,
            name: node.description ?? "",
            children: label,
            layout: "stack",
            inCurrentSelectedCutSet: gateNode.inCurrentSelectedCutSet,
            notConnectedToSelectedCutSet: gateNode.notConnectedToSelectedCutSet,
            layoutOptions: {
                paddingTop: 10.0,
                paddingBottom: 10.0,
                paddngLeft: 10.0,
                paddingRight: 10.0,
            },
        };

        // create invisible edge from description to gate
        const invisibleEdge = this.generateFTEdge(
            idCache.uniqueId(node.name + "InvisibleEdge"),
            descriptionNode.id,
            this.nodeToPort.get(gateNode.id)?.id ?? gateNode.id,
            FTA_INVISIBLE_EDGE_TYPE,
            idCache
        );

        const parentId = idCache.uniqueId(node.name + "Parent");
        const port = this.createFTAPort(idCache.uniqueId(parentId + "_port"), PortSide.NORTH);

        // create invisible edge from parent to description
        const betweenEdgeId = idCache.uniqueId(node.name + "InvisibleEdge");
        const invisibleEdgeParetToDescription = this.generateFTEdge(
            betweenEdgeId,
            port.id,
            descriptionNode.id,
            FTA_INVISIBLE_EDGE_TYPE,
            idCache
        );

        // order is important to have the descriptionNode above the gateNode
        const children: SModelElement[] = [
            descriptionNode,
            gateNode,
            invisibleEdge,
            port,
            invisibleEdgeParetToDescription,
        ];

        // create invisible node that contains the desciprion and gate node
        const parent = {
            type: FTA_NODE_TYPE,
            id: parentId,
            name: node.name,
            nodeType: FTNodeType.PARENT,
            description: "",
            children: children,
            layout: "stack",
            inCurrentSelectedCutSet: gateNode.inCurrentSelectedCutSet,
            notConnectedToSelectedCutSet: gateNode.notConnectedToSelectedCutSet,
            layoutOptions: {
                paddingTop: 0.0,
                paddingBottom: 10.0,
                paddingLeft: 0.0,
                paddingRight: 0.0,
            },
        };

        // update maps
        this.idToSNode.set(descriptionNode.id, descriptionNode);
        this.descriptionOfGate.set(gateNode.id, descriptionNode);
        this.parentOfGate.set(gateNode.id, parent);
        this.nodeToPort.set(parent.id, port);
        return parent;
    }

    /**
     * Generates a single FTANode for the given {@code node}.
     * @param node The FTA component the node should be created for.
     * @param idCache The ID cache of the FTA model.
     * @returns a FTANode representing {@code node}.
     */
    protected generateFTNode(node: namedFtaElement, idCache: IdCache<AstNode>): FTANode {
        const nodeId = idCache.uniqueId(node.name.replace(" ", ""), node);
        let children: SModelElement[] = [];
        if (
            this.options.getShowComponentDescriptions() &&
            (node.$type === Component || node.$type === Condition) &&
            node.description !== undefined
        ) {
            children = this.createNodeLabel(node.name, nodeId, idCache, HEADER_LABEL_TYPE);
            const label = getDescription(
                node.description,
                this.options.getLabelManagement(),
                this.options.getLabelShorteningWidth(),
                nodeId,
                idCache
            );
            children.push(...label.reverse());
        } else {
            children = this.createNodeLabel(node.name, nodeId, idCache);
        }
        // one port for outgoing edges
        const port = this.createFTAPort(idCache.uniqueId(nodeId + "_port"), PortSide.NORTH);
        children.push(port);
        this.nodeToPort.set(nodeId, port);
        const description = isComponent(node) || isCondition(node) ? node.description : "";
        const set = this.options.getCutSet();
        let includedInCutSet =
            set !== noCutSet.id ? set.includes(node.name + ",") || set.includes(node.name + "]") : false;
        let notConnected = set !== noCutSet.id ? !includedInCutSet : false;
        // single points of failure should be shown
        if (set === spofsSet.id) {
            const spofs = this.options.getSpofs();
            includedInCutSet = spofs.includes(node.name);
            notConnected = !includedInCutSet;
        }

        const ftNode = this.createNode(
            nodeId,
            node.name,
            getFTNodeType(node),
            description,
            children,
            includedInCutSet,
            notConnected,
            topOfAnalysis === node.name && this.options.getCutSet() !== noCutSet.id
        );

        this.idToSNode.set(nodeId, ftNode);

        if (isKNGate(node)) {
            ftNode.k = node.k;
            ftNode.n = node.children.length;
        }
        return ftNode;
    }

    protected createNode(
        id: string,
        name: string,
        type: FTNodeType,
        description: string,
        children: SModelElement[],
        includedInCutSet: boolean | undefined,
        notConnected: boolean | undefined,
        topOfAnalysis: boolean | undefined
    ): FTANode {
        return {
            type: FTA_NODE_TYPE,
            id: id,
            name: name,
            nodeType: type,
            description: description,
            children: children,
            layout: "stack",
            inCurrentSelectedCutSet: includedInCutSet,
            notConnectedToSelectedCutSet: notConnected,
            topOfAnalysis: topOfAnalysis,
            layoutOptions: {
                paddingTop: 10.0,
                paddingBottom: 10.0,
                paddngLeft: 10.0,
                paddingRight: 10.0,
            },
        };
    }

    /**
     * Generates SLabel element for the given {@code label} of a node.
     * @param label Label to translate to SLabel element.
     * @param id The ID of the element for which the label should be generated.
     * @param idCache The ID cache of the FTA model.
     * @param type The type of the label.
     * @returns SLabel element representing {@code label}.
     */
    protected createNodeLabel(label: string, id: string, idCache: IdCache<AstNode>, type = "label"): SLabel[] {
        return [
            <SLabel>{
                type: type,
                id: idCache.uniqueId(id + "_label"),
                text: label,
            },
        ];
    }

    /**
     * Generates SLabel element for the given {@code label} of an edge.
     * @param label Label to translate to SLabel element.
     * @param id The ID of the element for which the label should be generated.
     * @param idCache The ID cache of the FTA model.
     * @returns SLabel element representing {@code label}.
     */
    protected createEdgeLabel(label: string, id: string, idCache: IdCache<AstNode>): SLabel[] {
        return [
            <SLabel>{
                type: "label:xref",
                id: idCache.uniqueId(id + "_label"),
                text: label,
            },
        ];
    }

    /**
     * Creates an FTAPort.
     * @param id The ID of the port.
     * @param side The side of the port.
     * @returns an FTAPort.
     */
    protected createFTAPort(id: string, side: PortSide): FTAPort {
        return {
            type: FTA_PORT_TYPE,
            id: id,
            side: side,
        };
    }
}
