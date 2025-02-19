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

import type { Reference } from "langium";
import { LangiumSprottySharedServices } from "langium-sprotty";
import { Children, Component, Hazard, LossScenario, Model, ModelFTA, OR, TopEvent } from "../../generated/ast.js";
import { getModel } from "../../utils.js";

/**
 * Create the fault trees for an stpa model as ASTs
 * @param uri The uri of the stpa file for which the fault trees should be created.
 * @param shared The shared services of Langium and Sprotty.
 * @returns the ASTs of the created fault trees.
 */
export async function createFaultTrees(uri: string, shared: LangiumSprottySharedServices): Promise<ModelFTA[]> {
    // get the current model
    const model = (await getModel(uri, shared)) as Model;
    const faultTrees: ModelFTA[] = [];
    // sort scenarios based on their hazard
    const scenarios: Map<string, LossScenario[]> = sortScenarios(model);
    // create fault tree for each hazard
    for (const hazard of model.hazards) {
        faultTrees.push(createFaulTreeForHazard(scenarios, hazard));
    }
    return faultTrees;
}

/**
 * Sorts the loss scenarios in {@code model} based on their hazard.
 * @param model The model containing the loss scenarios.
 * @returns the sorted loss scenarios.
 */
function sortScenarios(model: Model): Map<string, LossScenario[]> {
    const scenarios: Map<string, LossScenario[]> = new Map();
    for (const scenario of model.scenarios) {
        const hazards = scenario.uca?.ref ? scenario.uca.ref.list.refs : scenario.list.refs;
        for (const hazard of hazards || []) {
            const hazardName = hazard.$refText;
            addToListMap(scenarios, hazardName, scenario);
        }
    }
    return scenarios;
}

/**
 * Creates a fault tree with {@code hazard} as top event.
 * @param hazard The hazard for which the fault tree should be created.
 * @returns the AST of the created fault tree with {@code hazard} as top event.
 */
function createFaulTreeForHazard(scenarios: Map<string, LossScenario[]>, hazard: Hazard): ModelFTA {
    const ftaModel = {} as ModelFTA;
    ftaModel.components = [];
    ftaModel.gates = [];

    // sort scenarios by their causal factor
    const causalFactors: Map<string, LossScenario[]> = new Map();
    for (const scenario of scenarios.get(hazard.name) || []) {
        const causalFactor = scenario.factor;
        if (causalFactor) {
            addToListMap(causalFactors, causalFactor, scenario);
        } else {
            addToListMap(causalFactors, "No causal factor", scenario);
        }
    }

    // add scenarios as components ordered by their causal factor
    for (const causalFactor of causalFactors.keys()) {
        for (const scenario of causalFactors.get(causalFactor) || []) {
            const component = {
                name: scenario.name,
                description: scenario.description,
                $container: ftaModel,
                $type: "Component",
            } as Component;
            ftaModel.components.push(component);
        }
    }

    // create gate for each causal factor
    let counter = 1;
    for (const causalFactor of causalFactors.keys()) {
        const children = causalFactors.get(causalFactor)?.map(scenario => {
            return {
                ref: ftaModel.components.find(component => component.name === scenario.name),
                $refText: scenario.name,
            } as Reference<Children>;
        });
        if (children) {
            const gate = {
                name: `G${counter}`,
                description: causalFactor,
                children,
                $container: ftaModel,
                $type: "OR",
            } as OR;
            ftaModel.gates.push(gate);
            counter++;
        }
    }

    // create gate to connect top event with all other gates
    const gateChildren = ftaModel.gates.map(gate => {
        return { ref: gate, $refText: gate.name } as Reference<Children>;
    });
    const gate = {
        name: `G0`,
        children: gateChildren,
        $container: ftaModel,
        $type: "OR",
    } as OR;
    ftaModel.gates.push(gate);

    // create top event
    const topEvent = {
        name: hazard.description,
        child: { ref: gate, $refText: gate.name },
        $container: ftaModel,
        $type: "TopEvent",
    } as TopEvent;
    ftaModel.topEvent = topEvent;

    return ftaModel;
}

/**
 * Adds {@code value} to the list of {@code map} at {@code key}.
 * @param map The map to which the value should be added.
 * @param key The key at which the value should be added.
 * @param value The value which should be added.
 */
function addToListMap(map: Map<string, any[]>, key: string, value: any): void {
    if (map.has(key)) {
        const currentValues = map.get(key);
        if (currentValues) {
            currentValues.push(value);
        }
    } else {
        map.set(key, [value]);
    }
}
