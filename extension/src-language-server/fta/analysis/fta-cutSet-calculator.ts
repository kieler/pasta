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
import {
    TopEvent,
    isAND,
    isComponent,
    isCondition,
    isGate,
    isInhibitGate,
    isKNGate,
    isOR,
    isTopEvent,
} from "../../generated/ast.js";
import { namedFtaElement } from "../utils.js";

/* element for which the cut sets were determined */
export let topOfAnalysis: string | undefined;

/**
 * Determines the minimal cut sets for the fault tree constructured by {@code allNodes}.
 * @param allNodes All nodes in the fault tree.
 * @returns the minimal cut sets for a fault tree.
 */
export function determineMinimalCutSets(allNodes: AstNode[], startNode?: namedFtaElement): Set<namedFtaElement>[] {
    // TODO: add minimal flag (could reduce computation cost)
    const allCutSets = determineCutSetsForFT(allNodes, startNode);

    // Cut sets are minimal if removing one element destroys the cut set
    // If cut set contains another cut set from the array, remove it since it is not minimal
    const minimalCutSet = allCutSets.filter((cutSet) => checkMinimalCutSet(cutSet, allCutSets));

    return minimalCutSet;
}

/**
 * Checks whether the given {@code cutSet} is a minimal cut set.
 * @param cutSet The list to check.
 * @param allCutSets All Cut Sets of the Fault Tree.
 * @returns True if the given set is a minimal cut set.
 */
function checkMinimalCutSet(cutSet: Set<namedFtaElement>, allCutSets: Set<namedFtaElement>[]): boolean {
    for (const otherCutSet of allCutSets) {
        let contained = true;
        otherCutSet.forEach((element) => {
            if (!cutSet.has(element)) {
                contained = false;
            }
        });
        if (contained && cutSet !== otherCutSet) {
            return false;
        }
    }
    return true;
}

/**
 * Determines all cut sets of a fault tree.
 * @param allNodes All nodes of the fault tree.
 * @param startNode The node from which the cut sets should be determined.
 * @returns the cut sets of the fault tree.
 */
export function determineCutSetsForFT(allNodes: AstNode[], startNode?: namedFtaElement): Set<namedFtaElement>[] {
    /*  Idea:
            Start from the top event.
            Get the only child of top event (will always be only one) as our starting node.
            Calculate all children of the node and evaluate them.
            In the evaluation we check if the child has children too and do the same recursively until 
            the children are components.
            Depending on the type of the node process the results of the children differently. */
            
    topOfAnalysis = startNode?.name;
    if (!startNode) {
        topOfAnalysis = (allNodes.find((node) => isTopEvent(node)) as namedFtaElement).name;
        // if no start node is given, the top event is used as start node
        startNode = getChildOfTopEvent(allNodes);
    }
    if (startNode) {
        // determine the cut sets of the Fault Tree
        return determineCutSetsForGate(startNode, allNodes);
    }
    return [];
}

/**
 * Determines the cut sets for the (sub) fault tree that has {@code startNode} as the top node.
 * @param startNode The top node of the (sub) fault tree for which the cut sets should be determined.
 * @param allNodes All nodes of the fault tree.
 * @param idCache The idCache of the generator context from the corresponding graph.
 * @returns the determined cut sets for the (sub) fault tree as a list of lists.
 */
function determineCutSetsForGate(startNode: AstNode, allNodes: AstNode[]): Set<namedFtaElement>[] {
    let result: Set<namedFtaElement>[] = [];

    // components do not have children, so return the component
    if (isComponent(startNode) || isCondition(startNode)) {
        return [new Set<namedFtaElement>([startNode])];
    }

    const children = getChildrenOfNode(startNode);
    if (children.length === 0 || !isGate(startNode)) {
        return result;
    }

    if (isAND(startNode) || isInhibitGate(startNode)) {
        // concatenate each cut set of a child with every cut set of the other children
        for (const child of children) {
            result = concatInnerListsWithEachOther(determineCutSetsForGate(child, allNodes), result);
        }
    } else if (isOR(startNode)) {
        // add the cut sets of each child to the result
        for (const child of children) {
            result.push(...determineCutSetsForGate(child, allNodes));
        }
    } else if (isKNGate(startNode)) {
        const k = startNode.k;
        const n = startNode.children.length;

        // determine every combination (with length k or greater) of the children
        // Example: children = [M1, M2, G1] and k = 2 -> [[M1, M2], [M1, G1], [M2, G1], [M1, M2, G1]]
        const combinations: AstNode[][] = [];
        for (let i = k; i <= n; i++) {
            combinations.push(...createAllCombinations(children, i));
        }

        // determine the cut sets for each combination
        // (treat each combination the same way as an AND gate with the combination as its children)
        for (const combination of combinations) {
            let combinationResult: Set<namedFtaElement>[] = [];
            for (const element of combination) {
                combinationResult = concatInnerListsWithEachOther(
                    determineCutSetsForGate(element, allNodes),
                    combinationResult
                );
            }
            result.push(...combinationResult);
        }
    }

    return result;
}

/**
 * Creates all combinations with length {@code k} of the given {@code nodes}.
 * @param nodes The list of nodes for which all combinations should be created.
 * @param k The number of elements in a combination.
 * @returns all combinations with length {@code k} of the given {@ode ndoes}.
 */
function createAllCombinations(nodes: AstNode[], k: number): AstNode[][] {
    const combinations: AstNode[][] = [];

    if (k > nodes.length || k <= 0) {
        return [];
    }
    if (k === nodes.length) {
        return [nodes];
    }
    if (k === 1) {
        nodes.forEach((node) => combinations.push([node]));
    }

    for (let i = 0; i < nodes.length; i++) {
        const currentNode: AstNode = nodes[i];
        for (const subElements of createAllCombinations(nodes.slice(i + 1), k - 1)) {
            subElements.unshift(currentNode);
            combinations.push(subElements);
        }
    }

    return combinations;
}

/**
 * Determines all the children of {@code node}.
 * @param node The node for which the children should be determined.
 * @returns all children of the given {@code node}.
 */
function getChildrenOfNode(node: AstNode): namedFtaElement[] {
    const children: namedFtaElement[] = [];
    if (isComponent(node) || isCondition(node)) {
        // node has no children
        return children;
    }

    if (isGate(node)) {
        // add children of the gate
        for (const childRef of node.children) {
            if (childRef.ref) {
                children.push(childRef.ref);
            }
        }
        // add condition of inhibit gate
        if (isInhibitGate(node)) {
            for (const childRef of node.condition) {
                if (childRef?.ref) {
                    children.push(childRef.ref);
                }
            }
        }
    }
    return children;
}

/**
 * Determines the child of the top event.
 * @param allNodes All nodes in the fault tree.
 * @returns the child of the top event.
 */
function getChildOfTopEvent(allNodes: AstNode[]): namedFtaElement | undefined {
    const topEventChild = (allNodes.find((node) => isTopEvent(node)) as TopEvent).child;
    if (topEventChild) {
        return topEventChild.ref;
    }
}

/**
 * Concatenates the cut sets of two sets with each other.
 * E.g. [X1, X2] and [Y1, Y2] result in [[X1, Y1], [X1, Y2], [X2, Y1], [X2, Y2]].
 * @param firstAllCutSets The first set of cut sets.
 * @param secondAllCutSets The second set of cut sets.
 * @returns a set where every cut set of both sets is concatenated with each other.
 */
function concatInnerListsWithEachOther(
    firstAllCutSets: Set<namedFtaElement>[],
    secondAllCutSets: Set<namedFtaElement>[]
): Set<namedFtaElement>[] {
    const result: Set<namedFtaElement>[] = [];
    // if one cut set set is empty, return the other
    if (firstAllCutSets.length === 0) {
        return secondAllCutSets;
    }
    if (secondAllCutSets.length === 0) {
        return firstAllCutSets;
    }
    // concatenate sets
    for (const firstCutSet of firstAllCutSets) {
        for (const secondCutSet of secondAllCutSets) {
            // add the new set if it snot already included in the result
            const newSet = new Set([...firstCutSet, ...secondCutSet]);
            if (result.every((cutSet) => !eqSet(cutSet, newSet))) {
                result.push(newSet);
            }
        }
    }
    return result;
}

/** Checks whether two sets of AstNodes are equal */
const eqSet = (xs: Set<AstNode>, ys: Set<AstNode>): boolean => xs.size === ys.size && [...xs].every((x) => ys.has(x));
