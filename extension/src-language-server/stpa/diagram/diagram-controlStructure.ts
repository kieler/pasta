/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2024 by
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
import { IdCache } from "langium-sprotty";
import { SModelElement, SNode } from "sprotty-protocol";
import { expansionState } from "../../diagram-server.js";
import { Command, Graph, Node, Variable, VerticalEdge } from "../../generated/ast.js";
import { createControlStructureEdge, createDummyNode, createLabel, createPort } from "./diagram-elements.js";
import { CSEdge, CSNode, ParentNode } from "./stpa-interfaces.js";
import {
    CS_EDGE_TYPE,
    CS_INTERMEDIATE_EDGE_TYPE,
    CS_INVISIBLE_SUBCOMPONENT_TYPE,
    CS_NODE_TYPE,
    EdgeType,
    HEADER_LABEL_TYPE,
    PARENT_TYPE,
    PASTA_LABEL_TYPE,
    PROCESS_MODEL_PARENT_NODE_TYPE,
    PortSide,
} from "./stpa-model.js";
import { StpaSynthesisOptions } from "./stpa-synthesis-options.js";
import { getCommonAncestor, sortPorts } from "./utils.js";

/**
 * Creates the control structure diagram for the given {@code controlStructure}.
 * @param controlStructure The control structure.
 * @param idToSNode The map of IDs to SNodes.
 * @param options The synthesis options of the STPA model.
 * @param idCache The ID cache of the STPA model.
 * @param addMissing Whether missing feedback should be added to the control structure.
 * @param missingFeedback The missing feedbacks of the control structure.
 * @returns the generated control structure diagram.
 */
export function createControlStructure(
    controlStructure: Graph,
    idToSNode: Map<string, SNode>,
    options: StpaSynthesisOptions,
    idCache: IdCache<AstNode>,
    addMissing: boolean,
    missingFeedback?: Map<string, Node[]>
): ParentNode {
    // set the level of the nodes in the control structure automatically
    // setLevelOfCSNodes(controlStructure.nodes);
    // determine the nodes of the control structure graph
    const csNodes = controlStructure.nodes.map(n => createControlStructureNode(n, idToSNode, options, idCache));
    // children (nodes and edges) of the control structure
    const CSChildren = [
        ...csNodes,
        ...generateVerticalCSEdges(controlStructure.nodes, idToSNode, idCache, addMissing, missingFeedback),
        //...this.generateHorizontalCSEdges(filteredModel.controlStructure.edges, idCache)
    ];
    // sort the ports in order to group edges based on the nodes they are connected to
    sortPorts(CSChildren.filter(node => node.type.startsWith("node")) as CSNode[]);

    return {
        type: PARENT_TYPE,
        id: "controlStructure",
        children: CSChildren,
        modelOrder: options.getModelOrder(),
    };
}

/**
 * Generates a single control structure node for the given {@code node},
 * @param node The system component a CSNode should be created for.
 * @param param1 GeneratorContext of the STPA model.
 * @returns A CSNode representing {@code node}.
 */
export function createControlStructureNode(
    node: Node,
    idToSNode: Map<string, SNode>,
    options: StpaSynthesisOptions,
    idCache: IdCache<AstNode>
): CSNode {
    const label = node.label ? node.label : node.name;
    const nodeId = idCache.uniqueId(node.name, node);
    const children: SModelElement[] = createLabel([label], nodeId, idCache, PASTA_LABEL_TYPE);
    if (options.getShowProcessModels()) {
        // add nodes representing the process model
        children.push(createProcessModelNodes(node.variables, idCache));
    }
    // add children of the control structure node if the node is expanded
    if (node.children?.length !== 0 && expansionState.get(node.name) === true) {
        // add invisible node to group the children in order to be able to lay them out separately from the process model node
        const invisibleNode = {
            type: CS_INVISIBLE_SUBCOMPONENT_TYPE,
            id: idCache.uniqueId(node.name + "_invisible"),
            children: [] as SModelElement[],
            layout: "stack",
            layoutOptions: {
                paddingTop: 10.0,
                paddingBottom: 10.0,
                paddingLeft: 10.0,
                paddingRight: 10.0,
            },
        };
        // create the actual children
        node.children?.forEach(child => {
            invisibleNode.children?.push(createControlStructureNode(child, idToSNode, options, idCache));
        });
        children.push(invisibleNode);
    }
    const csNode = {
        type: CS_NODE_TYPE,
        id: nodeId,
        level: node.level,
        children: children,
        hasChildren: node.children?.length !== 0,
        expanded: expansionState.get(node.name) === true,
        layout: "stack",
        layoutOptions: {
            paddingTop: 10.0,
            paddingBottom: 10.0,
            paddingLeft: 10.0,
            paddingRight: 10.0,
        },
    };
    idToSNode.set(nodeId, csNode);
    return csNode;
}

/**
 * Creates nodes representing the process model defined by the {@code variables} and encapsulates them in an invisible node.
 * @param variables The variables of the process model.
 * @param idCache The id cache of the STPA model.
 * @returns an invisible node containing the nodes representing the process model.
 */
export function createProcessModelNodes(variables: Variable[], idCache: IdCache<AstNode>): SNode {
    const csChildren: SModelElement[] = [];
    for (const variable of variables) {
        // translate the variable name to a header label and the values to further labels
        const label = variable.name;
        const nodeId = idCache.uniqueId(variable.name, variable);
        const values = variable.values?.map(value => value.name);
        const children = [
            ...createLabel([label], nodeId, idCache, HEADER_LABEL_TYPE),
            ...createLabel(values, nodeId, idCache, PASTA_LABEL_TYPE),
        ];
        // create the actual node with the created labels
        const csNode = {
            type: CS_NODE_TYPE,
            id: nodeId,
            children: children,
            hasChildren: false,
            expanded: expansionState.get(variable.name) === true,
            layout: "stack",
            layoutOptions: {
                paddingTop: 10.0,
                paddingBottom: 10.0,
                paddingLeft: 10.0,
                paddingRight: 10.0,
            },
        } as CSNode;
        csChildren.push(csNode);
    }
    // encapsulate the nodes representing the process model in an invisible node
    const invisibleNode = {
        type: PROCESS_MODEL_PARENT_NODE_TYPE,
        id: idCache.uniqueId("invisible"),
        children: csChildren,
        layout: "stack",
        layoutOptions: {
            paddingTop: 10.0,
            paddingBottom: 10.0,
            paddingLeft: 10.0,
            paddingRight: 10.0,
        },
    };
    return invisibleNode;
}

/**
 * Creates the edges for the control structure.
 * @param nodes The nodes of the control structure.
 * @param idCache The ID cache of the STPA model.
 * @param addMissing Whether missing feedback should be added to the control structure.
 * @param missingFeedback The missing feedbacks of the control structure.
 * @returns A list of edges for the control structure.
 */
export function generateVerticalCSEdges(
    nodes: Node[],
    idToSNode: Map<string, SNode>,
    idCache: IdCache<AstNode>,
    addMissing: boolean,
    missingFeedback?: Map<string, Node[]>
): (CSNode | CSEdge)[] {
    const edges: (CSNode | CSEdge)[] = [];
    // for every control action and feedback of every a node, a edge should be created
    for (const node of nodes) {
        // create edges representing the control actions
        edges.push(
            ...translateCommandsToEdges(
                node,
                node.actions,
                EdgeType.CONTROL_ACTION,
                idToSNode,
                idCache,
                addMissing,
                missingFeedback
            )
        );
        // create edges representing feedback
        edges.push(...translateCommandsToEdges(node, node.feedbacks, EdgeType.FEEDBACK, idToSNode, idCache, false));
        // create edges representing the other inputs
        edges.push(...translateIOToEdgeAndNode(node.inputs, node, EdgeType.INPUT, idToSNode, idCache));
        // create edges representing the other outputs
        edges.push(...translateIOToEdgeAndNode(node.outputs, node, EdgeType.OUTPUT, idToSNode, idCache));

        // add edges of the children of the node if the node is expanded
        if (expansionState.get(node.name) === true) {
            // create edges for children and add the ones that must be added at the top level
            edges.push(...generateVerticalCSEdges(node.children, idToSNode, idCache, addMissing, missingFeedback));
        }
    }
    return edges;
}

/**
 * Translates the commands (control action or feedback) of a node to (intermediate) edges and adds them to the correct nodes.
 * @param node The node of the commands.
 * @param commands The control actions or feedback of a node.
 * @param edgeType The type of the edge (control action or feedback).
 * @param idToSNode The map of IDs to SNodes.
 * @param idCache The ID cache of the STPA model.
 * @param addMissing Whether missing feedback should be added to the control structure.
 * @param missingFeedback The missing feedbacks of the control structure.
 * @returns A list of edges representing the commands that should be added at the top level.
 */
export function translateCommandsToEdges(
    source: Node,
    commands: VerticalEdge[],
    edgeType: EdgeType,
    idToSNode: Map<string, SNode>,
    idCache: IdCache<AstNode>,
    addMissing: boolean,
    missingFeedback?: Map<string, Node[]>
): CSEdge[] {
    const edges: CSEdge[] = [];
    for (const edge of commands) {
        // create edge id
        const target = edge.target.ref;
        const edgeId = idCache.uniqueId(
            `${idCache.getId(source)}_${edge.comms[0].name}_${idCache.getId(target)}`,
            edge
        );

        if (target) {
            // multiple commands to same target is represented by one edge -> combine labels to one
            const label: string[] = [];
            for (let i = 0; i < edge.comms.length; i++) {
                const com = edge.comms[i];
                label.push(com.label);
            }
            createEdgeForCommand(source, target, edgeId, edgeType, label, idToSNode, idCache, edges);
        }
    }

    // add missing feedback edges
    if (addMissing && missingFeedback) {
        // add feedback edge to each node to which a feedback is missing
        let hasMissingFeedback = false;
        for (const target of missingFeedback.get(source?.name ?? "") ?? []) {
            if (source && target) {
                hasMissingFeedback = true;
                createEdgeForCommand(
                    source,
                    target,
                    idCache.uniqueId(`${source?.name}_missingFeedback_${target}`),
                    EdgeType.MISSING_FEEDBACK,
                    ["MISSING"],
                    idToSNode,
                    idCache,
                    edges
                );
            }
        }
        // set flag for missing feedback to the source node
        if (hasMissingFeedback) {
            const sourceNode = idToSNode.get(idCache.getId(source) ?? "");
            if (sourceNode && sourceNode.type === CS_NODE_TYPE) {
                (sourceNode as CSNode).hasMissingFeedback = true;
            }
        }
    }

    return edges;
}

/**
 * Creates (intermediate) edges for the given {@code source} and {@code target} and adds them to the correct node.
 * @param source The source of the edge.
 * @param target The target of the edge.
 * @param edgeId The ID of the edge.
 * @param edgeType The type of the edge.
 * @param label The label of the edge.
 * @param idToSNode The map of IDs to SNodes.
 * @param idCache The ID cache of the STPA model.
 * @param edges The list of edges to add the created edges to.
 */
export function createEdgeForCommand(
    source: Node,
    target: Node,
    edgeId: string,
    edgeType: EdgeType,
    label: string[],
    idToSNode: Map<string, SNode>,
    idCache: IdCache<AstNode>,
    edges: CSEdge[]
): void {
    // edges can be hierachy crossing so we must determine the common ancestor of source and target
    const commonAncestor = getCommonAncestor(source, target);
    // create the intermediate ports and edges
    const ports = generateIntermediateCSEdges(source, target, edgeId, edgeType, idToSNode, idCache, commonAncestor);
    // add edge between the two ports in the common ancestor
    const csEdge = createControlStructureEdge(
        idCache.uniqueId(edgeId),
        ports.sourcePort,
        ports.targetPort,
        label,
        edgeType,
        // if the common ancestor is the parent of the target we want an edge with an arrow otherwise an intermediate edge
        target.$container === commonAncestor ? CS_EDGE_TYPE : CS_INTERMEDIATE_EDGE_TYPE,
        idCache
    );
    if (commonAncestor?.$type === "Graph") {
        // if the common ancestor is the graph, the edge must be added at the top level and hence have to be returned
        edges.push(csEdge);
    } else if (commonAncestor) {
        // if the common ancestor is a node, the edge must be added to the children of the common ancestor
        const snodeAncestor = idToSNode.get(idCache.getId(commonAncestor)!);
        snodeAncestor?.children?.find(node => node.type === CS_INVISIBLE_SUBCOMPONENT_TYPE)?.children?.push(csEdge);
    }
}

/**
 * Translates the inputs or outputs of a node to edges.
 * @param io The inputs or outputs of a node.
 * @param node The node of the inputs or outputs.
 * @param edgetype The type of the edge (input or output).
 * @param idCache The ID cache of the STPA model.
 * @returns a list of edges representing the inputs or outputs that should be added at the top level.
 */
export function translateIOToEdgeAndNode(
    io: Command[],
    node: Node,
    edgetype: EdgeType,
    idToSNode: Map<string, SNode>,
    idCache: IdCache<AstNode>
): (CSNode | CSEdge)[] {
    if (io.length !== 0) {
        const nodeId = idCache.getId(node);

        // create the label of the edge
        const label: string[] = [];
        for (let i = 0; i < io.length; i++) {
            const command = io[i];
            label.push(command.label);
        }

        let graphComponents: (CSNode | CSEdge)[] = [];
        switch (edgetype) {
            case EdgeType.INPUT:
                // create dummy node for the input
                const inputDummyNode = createDummyNode(
                    "input" + node.name,
                    node.level ? node.level - 1 : undefined,
                    idCache
                );
                // create edge for the input
                const inputEdge = createControlStructureEdge(
                    idCache.uniqueId(`${inputDummyNode.id}_input_${nodeId}`),
                    inputDummyNode.id ? inputDummyNode.id : "",
                    nodeId ? nodeId : "",
                    label,
                    edgetype,
                    CS_EDGE_TYPE,
                    idCache
                );
                graphComponents = [inputEdge, inputDummyNode];
                break;
            case EdgeType.OUTPUT:
                // create dummy node for the output
                const outputDummyNode = createDummyNode(
                    "output" + node.name,
                    node.level ? node.level + 1 : undefined,
                    idCache
                );
                // create edge for the output
                const outputEdge = createControlStructureEdge(
                    idCache.uniqueId(`${nodeId}_output_${outputDummyNode.id}`),
                    nodeId ? nodeId : "",
                    outputDummyNode.id ? outputDummyNode.id : "",
                    label,
                    edgetype,
                    CS_EDGE_TYPE,
                    idCache
                );
                graphComponents = [outputEdge, outputDummyNode];
                break;
            default:
                console.error("EdgeType is not INPUT or OUTPUT");
                break;
        }
        if (node.$container?.$type === "Graph") {
            return graphComponents;
        } else {
            const parent = idToSNode.get(idCache.getId(node.$container)!);
            const invisibleChild = parent?.children?.find(child => child.type === CS_INVISIBLE_SUBCOMPONENT_TYPE);
            invisibleChild?.children?.push(...graphComponents);
        }
    }
    return [];
}

/**
 * Generates intermediate edges and ports for the given {@code source} and {@code target} to connect them through hierarchical levels.
 * @param source The source of the edge.
 * @param target The target of the edge.
 * @param edgeId The ID of the original edge.
 * @param edgeType The type of the edge.
 * @param idCache The ID cache of the STPA model.
 * @param ancestor The common ancestor of the source and target.
 * @returns the IDs of the source and target port at the hierarchy level of the {@code ancestor}.
 */
export function generateIntermediateCSEdges(
    source: Node | undefined,
    target: Node | undefined,
    edgeId: string,
    edgeType: EdgeType,
    idToSNode: Map<string, SNode>,
    idCache: IdCache<AstNode>,
    ancestor?: Node | Graph
): { sourcePort: string; targetPort: string } {
    const assocEdge = { node1: source?.name ?? "", node2: target?.name ?? "" };
    // add ports for source and target and their ancestors till the common ancestor
    const sources = generatePortsForCSHierarchy(
        source,
        assocEdge,
        edgeId,
        edgeType === EdgeType.CONTROL_ACTION ? PortSide.SOUTH : PortSide.NORTH,
        idToSNode,
        idCache,
        ancestor
    );
    const targets = generatePortsForCSHierarchy(
        target,
        assocEdge,
        edgeId,
        edgeType === EdgeType.CONTROL_ACTION ? PortSide.NORTH : PortSide.SOUTH,
        idToSNode,
        idCache,
        ancestor
    );
    // add edges between the ports of the source and its ancestors
    for (let i = 0; i < sources.nodes.length - 1; i++) {
        const sEdgeType = CS_INTERMEDIATE_EDGE_TYPE;
        sources.nodes[i + 1]?.children?.push(
            createControlStructureEdge(
                idCache.uniqueId(edgeId),
                sources.portIds[i],
                sources.portIds[i + 1],
                [],
                edgeType,
                sEdgeType,
                idCache,
                false
            )
        );
    }
    // add edges between the ports of the target and its ancestors
    for (let i = 0; i < targets.nodes.length - 1; i++) {
        const sEdgeType = i === 0 ? CS_EDGE_TYPE : CS_INTERMEDIATE_EDGE_TYPE;
        targets.nodes[i + 1]?.children?.push(
            createControlStructureEdge(
                idCache.uniqueId(edgeId),
                targets.portIds[i + 1],
                targets.portIds[i],
                [],
                edgeType,
                sEdgeType,
                idCache,
                false
            )
        );
    }
    // return the source and target port at the hierarchy level of the ancestor
    return {
        sourcePort: sources.portIds[sources.portIds.length - 1],
        targetPort: targets.portIds[targets.portIds.length - 1],
    };
}

/**
 * Adds ports for the {@code current} node and its (grand)parents up to the {@code ancestor}.
 * @param current The node for which the ports should be created.
 * @param assocEdge The associated edge for which the ports should be created.
 * @param edgeId The ID of the original edge for which the ports should be created.
 * @param side The side of the ports.
 * @param idCache The ID cache of the STPA model.
 * @param ancestor The common ancestor of the source and target of the associated edge.
 * @returns the IDs of the created ports and the nodes the ports were added to.
 */
export function generatePortsForCSHierarchy(
    current: AstNode | undefined,
    assocEdge: { node1: string; node2: string },
    edgeId: string,
    side: PortSide,
    idToSNode: Map<string, SNode>,
    idCache: IdCache<AstNode>,
    ancestor?: Node | Graph
): { portIds: string[]; nodes: SNode[] } {
    const ids: string[] = [];
    const nodes: SNode[] = [];
    while (current && (!ancestor || current !== ancestor)) {
        const currentId = idCache.getId(current);
        if (!currentId) {
            // if the current node is collapsed, the ID is not set
            // we may still want to draw the edge so far as possible to indicate the connection
            current = current?.$container;
        } else {
            const currentNode = idToSNode.get(currentId);
            if (currentNode) {
                // current node could have an invisible child that was skipped while going up the hierarchy because it does not exist in the AST
                const invisibleChild = currentNode?.children?.find(
                    child => child.type === CS_INVISIBLE_SUBCOMPONENT_TYPE
                );
                if (invisibleChild && ids.length !== 0) {
                    // add port for the invisible node first
                    const invisiblePortId = idCache.uniqueId(edgeId + "_newTransition");
                    invisibleChild.children?.push(createPort(invisiblePortId, side, assocEdge));
                    ids.push(invisiblePortId);
                    nodes.push(invisibleChild);
                }
                // add port for the current node
                const nodePortId = idCache.uniqueId(edgeId + "_newTransition");
                currentNode?.children?.push(createPort(nodePortId, side, assocEdge));
                ids.push(nodePortId);
                nodes.push(currentNode);
                current = current?.$container;
            }
        }
    }
    return { portIds: ids, nodes: nodes };
}

// for this in-layer edges are needed, which are not supported by ELK at the moment
/*     protected generateHorizontalCSEdges(edges: Edge[], args: GeneratorContext<Model>): SEdge[]{
            const idCache = args.idCache
            let genEdges: SEdge[] = []
            for (const edge of edges) {
                const sourceId = idCache.getId(edge.source.ref)
                const targetId = idCache.getId(edge.target.ref)
                const edgeId = idCache.uniqueId(`${sourceId}:${edge.name}:${targetId}`, edge)
                const e = this.generateSEdge(edgeId, sourceId ? sourceId : '', targetId ? targetId : '', 
                                edge.label? edge.label:edge.name, args)
                genEdges.push(e)
            }
            return genEdges
        } */
