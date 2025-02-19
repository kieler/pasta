/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2021-2023 by
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

import { Reference, ValidationAcceptor, ValidationChecks } from "langium";
import { Position } from "vscode-languageserver-types";
import {
    Context,
    ControllerConstraint,
    DCAContext,
    DCARule,
    Graph,
    Hazard,
    HazardList,
    Loss,
    Model,
    Node,
    PastaAstType,
    Responsibility,
    Rule,
    SystemConstraint,
    isModel,
    isRule,
} from "../../generated/ast.js";
import { StpaServices } from "../stpa-module.js";
import { UCA_TYPE, collectElementsWithSubComps, elementWithName, elementWithRefs } from "../utils.js";

export function registerValidationChecks(services: StpaServices): void {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.StpaValidator;
    const checks: ValidationChecks<PastaAstType> = {
        Model: validator.checkModel,
        Hazard: validator.checkHazard,
        SystemConstraint: validator.checkSystemConstraint,
        Responsibility: validator.checkResponsibility,
        ControllerConstraint: validator.checkControllerConstraints,
        HazardList: validator.checkHazardList,
        Node: validator.checkNode,
        Graph: validator.checkControlStructure,
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class StpaValidator {
    /** Boolean option to toggle the check whether all system-level constraints are covered by a responsibility. */
    checkResponsibilitiesForConstraints = true;

    /** Boolean option to toggle the check whether all UCAs are covered by constraints. */
    checkConstraintsForUCAs = true;

    /** Boolean option to toggle the check whether all UCAs are covered by scenarios. */
    checkScenariosForUCAs = true;

    /** Boolean option to toggle the check whether all UCAs are covered by safety requirements. */
    checkSafetyRequirementsForUCAs = true;

    /** Boolean option to toggle the check whether system components are missing feedback in the control structure. */
    checkMissingFeedback = true;

    checkForConflictingUCAs = true;

    /**
     * Map from node ID to a list of nodes to which a feedback is missing.
     */
    missingFeedback: Map<string, Node[]> = new Map();

    /**
     * Executes validation checks for the whole model.
     * @param model The model to validate.
     * @param accept
     */
    checkModel(model: Model, accept: ValidationAcceptor): void {
        this.checkAllAspectsPresent(model, accept);
        this.checkForTODOs(model, accept);

        const hazards = collectElementsWithSubComps(model.hazards) as Hazard[];
        const sysCons = collectElementsWithSubComps(model.systemLevelConstraints) as SystemConstraint[];
        const responsibilities = model.responsibilities?.map(r => r.responsiblitiesForOneSystem).flat(1);
        const ucas = model.allUCAs
            ?.map(sysUCA =>
                sysUCA.providingUcas.concat(sysUCA.notProvidingUcas, sysUCA.wrongTimingUcas, sysUCA.continousUcas)
            )
            .flat(1);
        const contexts = model.rules?.map(rule => rule.contexts).flat(1);

        // collect all elements that have a reference list
        let elementsWithRefs: elementWithRefs[] = [
            ...hazards,
            ...sysCons,
            ...ucas.map(uca => uca.list),
            ...contexts.map(context => context.list),
        ];

        // collect nodes that should be checked whether they are referenced
        let nodesToCheck: elementWithName[] = [...model.losses, ...hazards];
        if (this.checkResponsibilitiesForConstraints) {
            nodesToCheck.push(...sysCons);
            elementsWithRefs.push(...responsibilities);
        }
        // get all reference names
        const references = this.collectReferences(elementsWithRefs);
        // check if all elements are referenced at least once
        for (const node of nodesToCheck) {
            if (!references.has(node.name)) {
                accept("warning", "This element is not referenced", { node: node, property: "name" });
            }
        }

        //check referenced UCAs
        elementsWithRefs = [];
        // get referenced ucas from the different aspects
        let constraintsRefs = new Set<string>();
        let scenarioRefs: (string | undefined)[] = [];
        let safetyRequirementsRefs = new Set<string>();
        if (this.checkConstraintsForUCAs) {
            constraintsRefs = this.collectReferences(model.controllerConstraints);
        }
        if (this.checkScenariosForUCAs) {
            scenarioRefs = model.scenarios.map(scenario => scenario.uca?.ref?.name);
        }
        if (this.checkSafetyRequirementsForUCAs) {
            safetyRequirementsRefs = this.collectReferences(model.safetyCons);
        }
        // check if ucas are referenced by the other aspects
        nodesToCheck = [...ucas, ...contexts];
        for (const node of nodesToCheck) {
            if (this.checkConstraintsForUCAs && !constraintsRefs.has(node.name)) {
                accept("warning", "This element is not referenced by a constraint", { node: node, property: "name" });
            }
            if (this.checkScenariosForUCAs && !scenarioRefs.includes(node.name)) {
                accept("warning", "This element is not referenced by a scenario", { node: node, property: "name" });
            }
            if (this.checkSafetyRequirementsForUCAs && !safetyRequirementsRefs.has(node.name)) {
                accept("warning", "This element is not referenced by a safety requirement", {
                    node: node,
                    property: "name",
                });
            }
        }

        // collect elements that have an identifier and should be referenced
        const allElements: elementWithName[] = [
            ...model.losses,
            ...hazards,
            ...sysCons,
            ...ucas,
            ...contexts,
            ...responsibilities,
            ...model.controllerConstraints,
            ...model.scenarios,
            ...model.safetyCons,
        ];
        //check that their IDs are unique
        this.checkIDsAreUnique(allElements, accept);

        // check that each control action has at least one UCA
        const ucaActions = [
            ...model.allUCAs.map(alluca => alluca.system?.ref?.name + "." + alluca.action?.ref?.name),
            ...model.rules.map(rule => rule.system?.ref?.name + "." + rule.action?.ref?.name),
        ];
        this.checkControlActionsReferencedByUCA(model.controlStructure?.nodes ?? [], ucaActions, accept);
        // check UCAs and DCAs
        this.checkUCAsAndDCAs(model, accept);
    }

    /**
     * Check whether the control actions of a node are referenced by at least one UCA.
     * @param nodes The nodes to check.
     * @param ucaActions The control actions that are referenced by a UCA.
     * @param accept
     */
    protected checkControlActionsReferencedByUCA(
        nodes: Node[],
        ucaActions: string[],
        accept: ValidationAcceptor
    ): void {
        nodes.forEach(node => {
            node.actions.forEach(action =>
                action.comms.forEach(command => {
                    const name = node.name + "." + command.name;
                    if (!ucaActions.includes(name)) {
                        accept("warning", "This action is not referenced by a UCA", {
                            node: command,
                            property: "name",
                        });
                    }
                })
            );
            this.checkControlActionsReferencedByUCA(node.children, ucaActions, accept);
        });
    }

    /**
     * Checks the UCAs and DCAs for duplicates and conflicts.
     * @param model The model containing the UCAs and DCAs.
     * @param accept
     */
    protected checkUCAsAndDCAs(model: Model, accept: ValidationAcceptor): void {
        // check for duplicate ActionUCA definition
        this.checkActionUcasForDuplicates(model, accept);
        // check for duplicate rule definition
        // group rules by action and system
        const ruleMap = new Map<string, Rule[]>();
        for (const rule of model.rules) {
            const key = rule.system?.ref?.name + "." + rule.action?.ref?.name;
            if (ruleMap.has(key)) {
                ruleMap.get(key)?.push(rule);
            } else {
                ruleMap.set(key, [rule]);
            }
        }
        this.checkRulesForDuplicates(ruleMap, accept);
        // check for duplicate dca rule definition
        // group dca rules by action and system
        const dcaRuleMap = new Map<string, DCARule[]>();
        for (const dcaRule of model.allDCAs) {
            const key = dcaRule.system?.ref?.name + "." + dcaRule.action?.ref?.name;
            if (dcaRuleMap.has(key)) {
                dcaRuleMap.get(key)?.push(dcaRule);
            } else {
                dcaRuleMap.set(key, [dcaRule]);
            }
        }
        this.checkRulesForDuplicates(dcaRuleMap, accept);
        // check for conflicting UCAs
        if (this.checkForConflictingUCAs) {
            this.checkForConflictingRules(ruleMap, accept);
        }
        // check for conflicts between UCAs and DCAs
        this.checkForConflictsBetweenUCAsAndDCAs(model.rules, model.allDCAs, accept);
    }

    /**
     * Validates that at most one ActionUCA is defined for a control action.
     * @param model The model containing the UCAs.
     * @param accept
     */
    checkActionUcasForDuplicates(model: Model, accept: ValidationAcceptor): void {
        const referencedCommand: Set<string> = new Set<string>();
        for (const actionUca of model.allUCAs) {
            const action = actionUca.system?.$refText + "." + actionUca.action?.$refText;
            if (referencedCommand.has(action)) {
                accept("warning", "This action is already covered by UCAs", { node: actionUca, property: "action" });
            } else {
                referencedCommand.add(action);
            }
        }
    }

    /**
     * Validates that at most one UCA rule is defined for a control action and type.
     * @param ruleMap The rules mapped by their control action.
     * @param accept
     */
    checkRulesForDuplicates(ruleMap: Map<string, Rule[]> | Map<string, DCARule[]>, accept: ValidationAcceptor): void {
        for (const rules of ruleMap.values()) {
            const types = new Set<string>();
            for (const rule of rules) {
                if (types.has(rule.type)) {
                    const action = isRule(rule) ? "UCA" : "DCA";
                    accept("warning", `This ${action} type is already covered by another rule for the stated action`, {
                        node: rule,
                        property: "type",
                    });
                } else {
                    types.add(rule.type);
                }
            }
        }
    }

    /**
     * Validates that rules for the same control action and type do not conflict.
     * @param ruleMap The rules mapped by their control action.
     * @param accept
     */
    protected checkForConflictingRules(ruleMap: Map<string, Rule[]>, accept: ValidationAcceptor): void {
        for (const rules of ruleMap.values()) {
            // UCAs can only conflict if one of them is a provided UCA
            const providedRule = rules.find(rule => rule.type === UCA_TYPE.PROVIDED);
            if (providedRule) {
                for (const rule of rules) {
                    // check the UCAs of type provided against all other UCAs
                    if (rule.type !== UCA_TYPE.PROVIDED) {
                        for (const context of rule.contexts) {
                            for (const otherContext of providedRule.contexts) {
                                if (this.isSameContext(context, otherContext)) {
                                    accept(
                                        "warning",
                                        "Conflict with " + providedRule.name + " " + otherContext.name + " detected",
                                        {
                                            node: context,
                                        }
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Validates that there are no conflicts between UCAs and DCAs.
     * A DCA is not allowed to have the same type and context as a UCA.
     * @param ucas The UCAs to check.
     * @param dcas The DCAs to check.
     * @param accept
     */
    protected checkForConflictsBetweenUCAsAndDCAs(ucas: Rule[], dcas: DCARule[], accept: ValidationAcceptor): void {
        for (const dca of dcas) {
            for (const uca of ucas) {
                // if they have different types or different control actions, they cannot conflict
                const ucaType = uca.type === UCA_TYPE.PROVIDED ? UCA_TYPE.PROVIDED : UCA_TYPE.NOT_PROVIDED;
                const dcaAction = dca.system?.$refText + "." + dca.action?.$refText;
                const ucaAction = uca.system?.$refText + "." + uca.action?.$refText;
                if (dcaAction === ucaAction && dca.type === ucaType) {
                    for (const context of dca.contexts) {
                        for (const otherContext of uca.contexts) {
                            // if they have the same type and context for same control action, they conflict
                            if (this.isSameContext(context, otherContext)) {
                                accept("warning", "Conflict with " + uca.name + " " + otherContext.name + " detected", {
                                    node: context,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Checks whether the contexts of two rules are the same or whether one of them is a subset of the other.
     * @param context1 The first context to compare.
     * @param context2 The second context to compare.
     * @returns true if the contexts are the same or one of them is a subset of the other, false otherwise.
     */
    protected isSameContext(context1: Context | DCAContext, context2: Context | DCAContext): boolean {
        let isSame = true;
        // check whether context1 is a subset of context2
        for (let i = 0; i < context1.assignedValues.length; i++) {
            const varIndex = context2.assignedValues.findIndex(
                v => v.variable.$refText === context1.assignedValues[i].variable.$refText
            );
            if (
                varIndex === -1 ||
                context2.assignedValues[varIndex].value.$refText !== context1.assignedValues[i].value.$refText
            ) {
                isSame = false;
                break;
            }
        }
        if (!isSame) {
            isSame = true;
            // check whether context2 is a subset of context1
            for (let i = 0; i < context2.assignedValues.length; i++) {
                const varIndex = context1.assignedValues.findIndex(
                    v => v.variable.$refText === context2.assignedValues[i].variable.$refText
                );
                if (
                    varIndex === -1 ||
                    context1.assignedValues[varIndex].value.$refText !== context2.assignedValues[i].value.$refText
                ) {
                    isSame = false;
                    break;
                }
            }
        }
        return isSame;
    }

    /**
     * Executes validation checks for a hazard.
     * @param hazard The Hazard to check.
     * @param accept
     */
    checkHazard(hazard: Hazard, accept: ValidationAcceptor): void {
        if (hazard.subComponents) {
            this.checkPrefixOfSubElements(hazard.name, hazard.subComponents, accept);
            this.checkReferencedLossesOfSubHazard(hazard.refs, hazard.subComponents, accept);
        }
        this.checkReferenceListForDuplicates(hazard, hazard.refs, accept);
        // a top-level hazard should reference loss(es)
        if (isModel(hazard.$container) && hazard.refs.length === 0) {
            const range = hazard.$cstNode?.range;
            const newRange = range
                ? {
                      start: { line: range.start.line, character: range.start.character },
                      end: { line: range.end.line, character: range.end.character },
                  }
                : undefined;
            if (newRange) {
                newRange.start.character = newRange.end.character - 1;
            }
            accept("warning", "A hazard should reference loss(es)", { node: hazard, range: range });
        }
    }

    /**
     * Executes validation checks for a system-level constraint.
     * @param sysCons The SystemConstraint to check.
     * @param accept
     */
    checkSystemConstraint(sysCons: SystemConstraint, accept: ValidationAcceptor): void {
        if (sysCons.subComponents) {
            this.checkPrefixOfSubElements(sysCons.name, sysCons.subComponents, accept);
        }
        this.checkReferenceListForDuplicates(sysCons, sysCons.refs, accept);
    }

    /**
     * Executes validation checks for a responsibility.
     * @param resp The responsibility to check.
     * @param accept
     */
    checkResponsibility(resp: Responsibility, accept: ValidationAcceptor): void {
        this.checkReferenceListForDuplicates(resp, resp.refs, accept);
    }

    /**
     * Executes validation checks for the control structure.
     * @param graph The control structure to check.
     * @param accept
     */
    checkControlStructure(graph: Graph, accept: ValidationAcceptor): void {
        const nodes = [...graph.nodes, ...graph.nodes.map(node => this.getChildren(node)).flat(1)];
        this.checkIDsAreUnique(nodes, accept);
        this.checkForMissingFeedback(nodes, accept);
    }

    /**
     * Checks whether feedback is missing in the control structure and fills the missingFeedback map.
     * @param nodes The nodes of the control structure.
     * @param accept
     */
    protected checkForMissingFeedback(nodes: Node[], accept: ValidationAcceptor): void {
        // fill the map with the missing feedback
        this.missingFeedback.clear();
        for (const node of nodes) {
            const nodeID = node.name;
            // check for each action of the node whether feedback is missing
            node.actions.forEach(action => {
                const target = action.target.ref;
                if (target) {
                    // check if target sents feedback back
                    const sentFeedback = target.feedbacks.find(feedback => feedback.target.$refText === nodeID);
                    if (!sentFeedback) {
                        // add the missing feedback to the map
                        const targetID = target.name;
                        if (!this.missingFeedback.has(targetID)) {
                            this.missingFeedback.set(targetID, [node]);
                        } else {
                            this.missingFeedback.get(targetID)?.push(node);
                        }
                    }
                }
            });
        }

        // show warnings for all nodes that have missing feedback
        if (this.checkMissingFeedback) {
            nodes.forEach(node => {
                const missingTargets = this.missingFeedback.get(node.name);
                if (missingTargets) {
                    accept(
                        "warning",
                        "Feedback is missing to the following components: " +
                            missingTargets.map(target => target.label ?? target.name).join(),
                        { node: node, property: "name" }
                    );
                }
            });
        }
    }

    /**
     * Collects all (grand)children of a node.
     * @param node The node to collect the children from.
     * @returns a list of all (grand)children of the node.
     */
    protected getChildren(node: Node): Node[] {
        const children: Node[] = [];
        node.children.forEach(child => {
            children.push(child);
            children.push(...this.getChildren(child));
        });
        return children;
    }

    /**
     * Executes validation checks for a node of the control structure.
     * @param node The node to check.
     * @param accept
     */
    checkNode(node: Node, accept: ValidationAcceptor): void {
        this.checkIDsAreUnique(node.variables, accept);
        this.checkIDsAreUnique(node.actions.map(ve => ve.comms).flat(1), accept);
        this.checkIDsAreUnique(node.feedbacks.map(ve => ve.comms).flat(1), accept);
    }

    /**
     * Executes validation checks for a controller constraint.
     * @param contCons The ContConstraint to check.
     * @param accept
     */
    checkControllerConstraints(contCons: ControllerConstraint, accept: ValidationAcceptor): void {
        this.checkReferenceListForDuplicates(contCons, contCons.refs, accept);
    }

    /**
     * Executes validation checks for a hazard list.
     * @param hazardList The HazardList to check.
     * @param accept
     */
    checkHazardList(hazardList: HazardList, accept: ValidationAcceptor): void {
        this.checkReferenceListForDuplicates(hazardList, hazardList.refs, accept);
    }

    /**
     * Controls whether the ids of the given elements are unique.
     * @param allElements The elements which IDs should be checked.
     * @param accept
     */
    private checkIDsAreUnique(allElements: elementWithName[], accept: ValidationAcceptor): void {
        const names = new Set();
        for (const node of allElements) {
            const name = node?.name;
            if (name !== "") {
                if (names.has(name)) {
                    accept("error", "All identifiers must be unique.", { node: node, property: "name" });
                } else {
                    names.add(name);
                }
            }
        }
    }

    /**
     * Controls whether all aspects of STPA are defined.
     * @param model The model to control.
     * @param accept
     */
    private checkAllAspectsPresent(model: Model, accept: ValidationAcceptor): void {
        // determine position of info
        let lineCount = model.$document?.textDocument.lineCount;
        if (lineCount === undefined) {
            lineCount = 0;
        }
        const start: Position = { line: lineCount, character: 0 };
        const end: Position = { line: lineCount + 1, character: 0 };
        let text = "The following aspects are missing:\n";
        let missing = false;

        // check which aspects of STPA are not defined
        if (!model.losses || model.losses?.length === 0) {
            text += "Losses\n";
            missing = true;
        }
        if (!model.hazards || model.hazards?.length === 0) {
            text += "Hazards\n";
            missing = true;
        }
        if (!model.systemLevelConstraints || model.systemLevelConstraints?.length === 0) {
            text += "SystemConstraints\n";
            missing = true;
        }
        if (!model.controlStructure || model.controlStructure?.nodes?.length === 0) {
            text += "ControlStructure\n";
            missing = true;
        }
        if (!model.responsibilities || model.responsibilities?.length === 0) {
            text += "Responsibilities\n";
            missing = true;
        }
        if ((!model.allUCAs || model.allUCAs?.length === 0) && (!model.rules || model.rules?.length === 0)) {
            text += "UCAs\n";
            missing = true;
        }
        if (!model.controllerConstraints || model.controllerConstraints?.length === 0) {
            text += "ControllerConstraints\n";
            missing = true;
        }
        if (!model.scenarios || model.scenarios?.length === 0) {
            text += "LossScenarios\n";
            missing = true;
        }
        if (!model.safetyCons || model.safetyCons?.length === 0) {
            text += "SafetyRequirements\n";
            missing = true;
        }
        if (missing) {
            accept("info", text, { node: model, range: { start: start, end: end } });
        }
    }

    /**
     * Checks whether the model contains any TODOs.
     * @param model The model to check.
     * @param accept
     */
    protected checkForTODOs(model: Model, accept: ValidationAcceptor): void {
        model.losses.forEach(loss => {
            if (loss.description && loss.description.includes("TODO")) {
                accept("info", "This element contains a TODO", { node: loss, property: "description" });
            }
        });
        model.hazards.forEach(hazard => {
            if (hazard.description && hazard.description.includes("TODO")) {
                accept("info", "This element contains a TODO", { node: hazard, property: "description" });
            }
        });
        model.systemLevelConstraints.forEach(sysCon => {
            if (sysCon.description && sysCon.description.includes("TODO")) {
                accept("info", "This element contains a TODO", { node: sysCon, property: "description" });
            }
        });
        model.responsibilities.forEach(resp => {
            resp.responsiblitiesForOneSystem.forEach(responsibility => {
                if (responsibility.description && responsibility.description.includes("TODO")) {
                    accept("info", "This element contains a TODO", { node: responsibility, property: "description" });
                }
            });
        });
        model.allUCAs.forEach(uca => {
            uca.providingUcas.forEach(providingUca => {
                if (providingUca.description && providingUca.description.includes("TODO")) {
                    accept("info", "This element contains a TODO", { node: providingUca, property: "description" });
                }
            });
            uca.notProvidingUcas.forEach(notProvidingUca => {
                if (notProvidingUca.description && notProvidingUca.description.includes("TODO")) {
                    accept("info", "This element contains a TODO", { node: notProvidingUca, property: "description" });
                }
            });
            uca.wrongTimingUcas.forEach(wrongTimingUca => {
                if (wrongTimingUca.description && wrongTimingUca.description.includes("TODO")) {
                    accept("info", "This element contains a TODO", { node: wrongTimingUca, property: "description" });
                }
            });
            uca.continousUcas.forEach(continousUca => {
                if (continousUca.description && continousUca.description.includes("TODO")) {
                    accept("info", "This element contains a TODO", { node: continousUca, property: "description" });
                }
            });
        });
        model.controllerConstraints.forEach(constraint => {
            if (constraint.description && constraint.description.includes("TODO")) {
                accept("info", "This element contains a TODO", { node: constraint, property: "description" });
            }
        });
        model.scenarios.forEach(scenario => {
            if (scenario.description && scenario.description.includes("TODO")) {
                accept("info", "This element contains a TODO", { node: scenario, property: "description" });
            }
        });
        model.safetyCons.forEach(safetyReq => {
            if (safetyReq.description && safetyReq.description.includes("TODO")) {
                accept("info", "This element contains a TODO", { node: safetyReq, property: "description" });
            }
        });
    }

    /**
     * Checks whether IDs are mentioned more than once in a reference list.
     * @param main The AstNode containing the {@code list}.
     * @param list The list of the references to check.
     * @param accept
     */
    private checkReferenceListForDuplicates(
        main: elementWithRefs,
        list: Reference<elementWithName>[],
        accept: ValidationAcceptor
    ): void {
        const names = new Set();
        for (let i = 0; i < list.length; i++) {
            const ref = list[i];
            const element = ref?.ref;
            // needs to be checked in order to get the name
            if (element) {
                const name = element.name;
                if (name !== "") {
                    if (names.has(name)) {
                        accept("warning", "Duplicate reference.", { node: main, property: "refs", index: i });
                    } else {
                        names.add(name);
                    }
                }
            }
        }
    }

    /**
     * Checks whether subelements (subhazards or systemsubconstraints) have the name of the parent as prefix.
     * @param name The name of the parent AstNode.
     * @param subElements List of the subelements to check.
     * @param accept
     */
    private checkPrefixOfSubElements(
        name: string,
        subElements: (Hazard | SystemConstraint)[],
        accept: ValidationAcceptor
    ): void {
        for (const element of subElements) {
            if (!element.name.startsWith(name + ".")) {
                accept("warning", "Subelements should have as prefix the name of the parent", {
                    node: element,
                    property: "name",
                });
            }
        }
    }

    /**
     * Check whether subhazards only reference the losses the parent references too.
     * @param losses List of loss references of the main hazard.
     * @param subHazards List of the subHazards to check.
     * @param accept
     */
    private checkReferencedLossesOfSubHazard(
        losses: Reference<Loss>[],
        subHazards: Hazard[],
        accept: ValidationAcceptor
    ): void {
        for (const hazard of subHazards) {
            for (let i = 0; i < hazard.refs.length; i++) {
                const loss = hazard.refs[i];
                let found = false;
                const lossName = loss.ref?.name;
                for (const parentLoss of losses) {
                    const parentLossName = parentLoss.ref?.name;
                    if (lossName === parentLossName) {
                        found = true;
                    }
                }
                if (!found) {
                    accept("error", "SubHazards are only allowed to reference losses the parent references too", {
                        node: hazard,
                        property: "refs",
                        index: i,
                    });
                }
            }
        }
    }

    /**
     * Collects all IDs that are referenced by any element.
     * @param allElements Elements which references should be collected.
     * @returns A set with all referenced IDs.
     */
    private collectReferences(allElements: elementWithRefs[]): Set<string> {
        const refs = new Set<string>();
        for (const node of allElements) {
            if (node) {
                for (const ref of node.refs) {
                    if (ref?.ref) {
                        refs.add(ref.ref?.name);
                    }
                }
            }
        }
        return refs;
    }
}
