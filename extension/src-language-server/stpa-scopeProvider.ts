/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2021 by
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

import { DefaultScopeProvider, stream, Stream, AstNode, Scope, getDocument, PrecomputedScopes, AstNodeDescription, 
    EMPTY_SCOPE } from "langium";
import { isResponsibility, isResps, isSystemConstraint, isActionUCAs, Model, Node, UCA, Command, ActionUCAs, Hazard, 
    SystemConstraint, isModel, isHazardList, isContConstraint, isLossScenario, LossScenario} from "./generated/ast";
import { StpaServices } from "./stpa-module";


export class StpaScopeProvider extends DefaultScopeProvider {

    /* the types of the different aspects */
    private CA_TYPE = Command;
    private HAZARD_TYPE = Hazard;
    private SYS_CONSTRAINT_TYPE = SystemConstraint;
    private UCA_TYPE = UCA;

    constructor(services: StpaServices) {
        super(services);
    }

    getScope(node: AstNode, referenceId: string): Scope {
        const referenceType = this.reflection.getReferenceType(referenceId);
        const precomputed = getDocument(node).precomputedScopes;
        // get the root container which should be the Model
        let model = node.$container;
        while (model && !isModel(model)) {
            model = model?.$container;
        }
        if (precomputed && model) {
            // determine the scope for the different aspects & reference types
            if ((isContConstraint(node) || isLossScenario(node)) && referenceType === this.UCA_TYPE) {
                return this.getUCAs(model, precomputed);
            } else if (isHazardList(node) && isLossScenario(node.$container) && node.$container.uca && referenceType === this.HAZARD_TYPE) {
                return this.getUCAHazards(node.$container, model, precomputed);
            } else if (isResponsibility(node) && referenceType === this.SYS_CONSTRAINT_TYPE) {
                return this.getSystemConstraints(model, precomputed);
            } else if ((isSystemConstraint(node) || isHazardList(node)) && referenceType === this.HAZARD_TYPE) {
                return this.getHazards(model, precomputed);
            } else if (isActionUCAs(node) && referenceType === this.CA_TYPE) {
                return this.getCAs(node, precomputed);
            } else {
                return this.getStandardScope(node, referenceType, precomputed);
            }
        }
        return EMPTY_SCOPE;
        //return this.getGlobalScope(referenceType);
    }

    /**
     * Creates the standard scope.
     * @param node Current AstNode.
     * @param referenceType Type of the reference.
     * @param precomputed Precomputed Scope of the document.
     * @returns Scope with the elements that should be referencable.
     */
    private getStandardScope(node: AstNode, referenceType: string, precomputed: PrecomputedScopes): Scope {
        let currentNode: AstNode | undefined = node;
        // responsibilities and UCAs should have references to the nodes in the control structure
        if ((isResps(node) || isActionUCAs(node)) && referenceType === Node) {
            const model = node.$container as Model;
            currentNode = model.controlStructure;
        }

        const allDescriptions = this.getDescriptions(currentNode, referenceType, precomputed);
        return this.descriptionsToScope(allDescriptions);
    }

    /**
     * Creates scope containing hazards that are referenced by the UCA {@code scenario} references.
     * @param scenario Current loss scenario.
     * @param model Root of the STPA model.
     * @param precomputed Precomputed Scope of the document.
     * @returns Scope containing the hazards referenced by the UCA.
     */
    private getUCAHazards(scenario: LossScenario, model: Model, precomputed: PrecomputedScopes): Scope {
        const names = scenario.uca?.ref?.list.refs.map(x => x.ref?.name);
        const allDescriptions = this.getHazardSysCompsDescriptions(model.hazards, precomputed, this.HAZARD_TYPE);
        const filtered = allDescriptions.filter(desc => names?.includes(desc.name));
        return this.descriptionsToScope(filtered);
    }

    /**
     * Creates scope containing controlActions of the system component {@code node} references.
     * @param node Current ActionUCAs.
     * @param precomputed Precomputed Scope of the document.
     * @returns Scope containing all VerticalEdges.
     */
    private getCAs(node: ActionUCAs, precomputed: PrecomputedScopes): Scope {
        let allDescriptions: AstNodeDescription[] = [];
        let actionLists = node.system.ref?.actions;

        if (actionLists) {
            for (const actionList of actionLists) {
                let currentNode: AstNode | undefined = actionList;
                const descs = this.getDescriptions(currentNode, this.CA_TYPE, precomputed);
                allDescriptions = allDescriptions.concat(descs);
            }
        }
        return this.descriptionsToScope(allDescriptions);
    }

    /**
     * Creates scope containing all hazards.
     * @param model Root of the STPA model.
     * @param precomputed Precomputed Scope of the document.
     * @returns Scope containing all hazards.
     */
    private getHazards(model: Model, precomputed: PrecomputedScopes): Scope {
        const allDescriptions = this.getHazardSysCompsDescriptions(model.hazards, precomputed, this.HAZARD_TYPE);
        return this.descriptionsToScope(allDescriptions);
    }

    /**
     * Creates scope containing all system constraints.
     * @param model Root of the STPA model.
     * @param precomputed Precomputed Scope of the document.
     * @returns Scope containing all system-level constraints.
     */
    private getSystemConstraints(model: Model, precomputed: PrecomputedScopes): Scope {
        const allDescriptions = this.getHazardSysCompsDescriptions(model.systemLevelConstraints, precomputed, this.SYS_CONSTRAINT_TYPE);
        return this.descriptionsToScope(allDescriptions);
    }

    /**
     * Collects, depending on {@code type}, all definitions of hazards or system-level constraints including subcomponents
     * @param nodes The list of hazards or constraints
     * @param precomputed Precomputed Scope of the document.
     * @param type Type of the seacrhed aspect. Either hazard or system constraint.
     * @returns All defnitions of hazards or constraints depending on {@code type}.
     */
    private getHazardSysCompsDescriptions(nodes: (Hazard | SystemConstraint)[], precomputed: PrecomputedScopes, type: string): AstNodeDescription[] {
        if (type === this.HAZARD_TYPE || type === this.SYS_CONSTRAINT_TYPE) {
            let res: AstNodeDescription[] = [];
            for (const node of nodes) {
                let currentNode: AstNode | undefined = node;
                if (node.subComps.length !== 0) {
                    res = this.getHazardSysCompsDescriptions(node.subComps, precomputed, type);
                }
                res = res.concat(this.getDescriptions(currentNode, type, precomputed));
            }
            return res;
        } else {
            throw new Error("ScopeProvider: The search type should be hazard or system-level constraint.");
        }
    }

    /**
     * Creates scope containing all UCAs.
     * @param model Root of the STPA model.
     * @param precomputed Precomputed Scope of the document.
     * @returns Scope containing all UCAs.
     */
    private getUCAs(model: Model, precomputed: PrecomputedScopes): Scope {
        let allDescriptions: AstNodeDescription[] = [];
        const allUCAs = model.allUCAs;
        for (const systemUCAs of allUCAs) {
            let currentNode: AstNode | undefined = systemUCAs;
            const descs = this.getDescriptions(currentNode, this.UCA_TYPE, precomputed);
            allDescriptions = allDescriptions.concat(descs);
        }
        return this.descriptionsToScope(allDescriptions);
    }

    /**
     * Collects node descriptions for {@code currentNode}.
     * @param currentNode AstNode for which the descriptions should be collected.
     * @param type The type the descriptions should have.
     * @param precomputed Precomputed Scope of the document.
     * @returns Descriptions of type {@code type} for {@code currentNode}.
     */
    private getDescriptions(currentNode: AstNode | undefined, type: string, precomputed: PrecomputedScopes): AstNodeDescription[] {
        let res: AstNodeDescription[] = [];
        while (currentNode) {
            const allDescriptions = precomputed.get(currentNode);
            if (allDescriptions) {
                res = res.concat(allDescriptions.filter(desc => this.reflection.isSubtype(desc.type, type)));
            }
            currentNode = currentNode.$container;
        }
        return res;
    }

    /**
     * Creates a scope contaning {@code descs}.
     * @param descs The node descriptions that should be contained in the Scope.
     * @returns Scope containing {@code descs}.
     */
    private descriptionsToScope(descs: AstNodeDescription[]): Scope {
        const scopes: Array<Stream<AstNodeDescription>> = [];
        scopes.push(stream(descs));
        let result: Scope = EMPTY_SCOPE;
        for (let i = scopes.length - 1; i >= 0; i--) {
            result = this.createScope(scopes[i], result);
        }
        return result;
    }

}