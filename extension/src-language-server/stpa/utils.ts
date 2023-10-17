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

import { LangiumSharedServices } from "langium";
import { LangiumSprottySharedServices } from "langium-sprotty";
import { Range } from "vscode-languageserver";
import {
    Command,
    Context,
    ControllerConstraint,
    Graph,
    Hazard,
    HazardList,
    Loss,
    LossScenario,
    Model,
    Node,
    Responsibility,
    Rule,
    SafetyConstraint,
    SystemConstraint,
    UCA,
    Variable,
} from "../generated/ast";
import { getModel } from "../utils";

export type leafElement =
    | Loss
    | Hazard
    | SystemConstraint
    | Responsibility
    | UCA
    | ControllerConstraint
    | LossScenario
    | SafetyConstraint
    | Context;
export type elementWithName =
    | Loss
    | Hazard
    | SystemConstraint
    | Responsibility
    | UCA
    | ControllerConstraint
    | LossScenario
    | SafetyConstraint
    | Node
    | Variable
    | Graph
    | Command
    | Context
    | Rule;
export type elementWithRefs =
    | Hazard
    | SystemConstraint
    | Responsibility
    | HazardList
    | ControllerConstraint
    | SafetyConstraint;

/**
 * Returns the control actions defined in the file given by the {@code uri}.
 * @param uri Uri of the file which control actions should be returned.
 * @param shared The shared services of Langium.
 * @returns the control actions that are defined in the file determined by the {@code uri}.
 */
export async function getControlActions(
    uri: string,
    shared: LangiumSprottySharedServices | LangiumSharedServices
): Promise<Record<string, string[]>> {
    const controlActionsMap: Record<string, string[]> = {};
    // get the model from the file determined by the uri
    const model = await getModel(uri, shared) as Model;
    // collect control actions grouped by their controller
    model.controlStructure?.nodes.forEach((systemComponent) => {
        systemComponent.actions.forEach((action) => {
            action.comms.forEach((command) => {
                const actionList = controlActionsMap[systemComponent.name];
                if (actionList !== undefined) {
                    actionList.push(command.name);
                } else {
                    controlActionsMap[systemComponent.name] = [command.name];
                }
            });
        });
    });
    return controlActionsMap;
}

/**
 * Collects the {@code topElements}, their children, their children's children and so on.
 * @param topElements The top elements that possbible have children.
 * @returns A list with the given {@code topElements} and their descendants.
 */
export function collectElementsWithSubComps(topElements: (Hazard | SystemConstraint)[]): (Hazard | SystemConstraint)[] {
    let result = topElements;
    let todo = topElements;
    for (let i = 0; i < todo.length; i++) {
        const current = todo[i];
        if (current.subComponents) {
            result = result.concat(current.subComponents);
            todo = todo.concat(current.subComponents);
        }
    }
    return result;
}

export class StpaResult {
    title: string;
    losses: StpaComponent[] = [];
    hazards: StpaComponent[] = [];
    systemLevelConstraints: StpaComponent[] = [];
    // sorted by system components
    responsibilities: Record<string, StpaComponent[]> = {};
    // sorted first by control action, then by uca type
    ucas: Record<string, Record<string, StpaComponent[]>> = {};
    // sorted by control action
    controllerConstraints: Record<string, StpaComponent[]> = {};
    // sorted by control action and by ucas
    ucaScenarios: Record<string, Record<string, StpaComponent[]>> = {};
    scenarios: StpaComponent[] = [];
    safetyConstraints: StpaComponent[] = [];
}

export class StpaComponent {
    id: string;
    description: string;
    references?: string;
    subComponents?: StpaComponent[];
}

/**
 * Provides the different UCA types.
 */
export class UCA_TYPE {
    static NOT_PROVIDED = "not-provided";
    static PROVIDED = "provided";
    static TOO_EARLY = "too-early";
    static TOO_LATE = "too-late";
    static APPLIED_TOO_LONG = "applied-too-long";
    static STOPPED_TOO_SOON = "stopped-too-soon";
    static WRONG_TIME = "wrong-time";
    static CONTINUOUS = "continuous-problem";
    static UNDEFINED = "undefined";
}

/**
 * Determines the range of the component identified by {@code label} in the editor,
 * @param model The current STPA model.
 * @param label The label of the searched component.
 * @returns The range of the component idenified by the label or undefined if no component was found.
 */
export function getRangeOfNodeSTPA(model: Model, label: string): Range | undefined {
    let range: Range | undefined = undefined;
    const elements: elementWithName[] = [
        ...model.losses,
        ...model.hazards,
        ...model.hazards.flatMap((hazard) => hazard.subComponents),
        ...model.systemLevelConstraints,
        ...model.systemLevelConstraints.flatMap((constraint) => constraint.subComponents),
        ...model.responsibilities.flatMap((resp) => resp.responsiblitiesForOneSystem),
        ...model.allUCAs.flatMap((ucas) =>
            ucas.providingUcas.concat(ucas.notProvidingUcas, ucas.wrongTimingUcas, ucas.continousUcas)
        ),
        ...model.rules.flatMap((rule) => rule.contexts),
        ...model.controllerConstraints,
        ...model.scenarios,
        ...model.safetyCons,
    ];
    if (model.controlStructure) {
        elements.push(...model.controlStructure.nodes);
    }
    elements.forEach((component) => {
        if (component.name === label) {
            range = component.$cstNode?.range;
            return;
        }
    });
    return range;
}

/**
 * Decides whether {@code rule} contains a context that is the same as {@code context}.
 * Same means here that if the same variables are contained they have the same values. 
 * The values of other variables are irrelevant.
 * @param context The context, which should be compared to the ones of the {@code rule}.
 * @param rule The rule that contains the contexts to which {@code context} should be compared to.
 * @returns the context that is the same as {@code context} or undefined if none exists.
 */
export function sameContext(context: Context, rule: Rule): Context | undefined {
    for (const otherContext of rule.contexts) {
        let same = true;
        // iterate over the variables of the context
        for (let i = 0; i < context.vars.length; i++) {
            const curVar = context.vars[i];
            const otherVar = otherContext.vars.find((variable) => variable.$refText === curVar.$refText);
            if (otherVar) {
                // if the other context contains the the same variable,
                // check whether their values are the same
                const curVal = context.values[i];
                const index = otherContext.vars.indexOf(otherVar);
                const otherVal = otherContext.values[index];
                if (curVal !== otherVal) {
                    same = false;
                }
            }
        }
        if (same) {
            return otherContext;
        }
    }
    return undefined;
}