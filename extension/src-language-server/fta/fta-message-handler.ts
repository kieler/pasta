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

import { LangiumSprottySharedServices } from "langium-sprotty";
import { Connection } from "vscode-languageserver";
import { ModelFTA } from "../generated/ast.js";
import { getModel } from "../utils.js";
import { determineCutSetsForFT, determineMinimalCutSets } from "./analysis/fta-cutSet-calculator.js";
import { FtaServices } from "./fta-module.js";
import { cutSetsToString, namedFtaElement } from "./utils.js";

/**
 * Adds handlers for notifications regarding fta.
 * @param connection
 * @param ftaServices
 * @param sharedServices
 */
export function addFTANotificationHandler(
    connection: Connection,
    ftaServices: FtaServices,
    sharedServices: LangiumSprottySharedServices
): void {
    addCutSetsHandler(connection, ftaServices, sharedServices);
}

/**
 * Adds handlers for requests regarding the cut sets.
 * @param connection
 * @param ftaServices
 * @param sharedServices
 */
function addCutSetsHandler(
    connection: Connection,
    ftaServices: FtaServices,
    sharedServices: LangiumSprottySharedServices
): void {
    connection.onRequest("cutSets/generate", async (content: { uri: string; startId?: string }) => {
        return cutSetsRequested(content.uri, ftaServices, sharedServices, false, content.startId);
    });
    connection.onRequest("cutSets/generateMinimal", async (content: { uri: string; startId?: string }) => {
        return cutSetsRequested(content.uri, ftaServices, sharedServices, true, content.startId);
    });
    connection.onRequest("cutSets/reset", () => {
        return resetCutSets(ftaServices);
    });
}

/**
 * Determines the (minimal) cut sets and return them as a list of strings.
 * @param uri The uri of the model for which the cut sets should be determined.
 * @param ftaServices
 * @param sharedServices
 * @param minimal Determines whether all cut sets or only the minimal cut sets should be determined.
 * @returns the (minimal) cut sets of the model given by {@code uri} as list of strings.
 */
async function cutSetsRequested(
    uri: string,
    ftaServices: FtaServices,
    sharedServices: LangiumSprottySharedServices,
    minimal: boolean,
    startId?: string
): Promise<string[]> {
    const model = (await getModel(uri, sharedServices)) as ModelFTA;
    const nodes: namedFtaElement[] = [...model.components, ...model.conditions, ...model.gates];
    if (model.topEvent) {
        nodes.push(model.topEvent);
    }
    const startNode = startId ? nodes.find(node => node.name === startId) : undefined;
    const cutSets = minimal ? determineMinimalCutSets(nodes, startNode) : determineCutSetsForFT(nodes, startNode);
    // determine single points of failure
    const spofs: string[] = [];
    for (const cutSet of cutSets) {
        if (cutSet.size === 1) {
            spofs.push([...cutSet][0].name);
        }
    }
    ftaServices.options.SynthesisOptions.setSpofs(spofs);
    // create dropdown values
    const cutSetsString = cutSetsToString(cutSets);
    const dropdownValues = cutSetsString.map(cutSet => {
        return { displayName: cutSet, id: cutSet };
    });
    ftaServices.options.SynthesisOptions.updateCutSetsOption(dropdownValues);
    return cutSetsString;
}

function resetCutSets(ftaServices: FtaServices): void {
    ftaServices.options.SynthesisOptions.resetCutSets();
    return;
}

/**
 * Handles the initialization of the FTA configuration.
 * @param clientId The client id.
 * @param options The options for the configuration.
 * @param ftaServices The services for FTA.
 */
export function handleFTAConfigInit(clientId: string, options: Record<string, any>, ftaServices: FtaServices): void {
    if (options["synthesisOptions"] && clientId !== "") {
        Object.entries(options["synthesisOptions"]).forEach(([key, value]) => {
            ftaServices.options.SynthesisOptions.setOption(key, value);
        });
    }
}

/**
 * Resets the FTA configuration.
 * @param ftaServices The services for FTA.
 */
export function handleFTAConfigReset(ftaServices: FtaServices): void {
    ftaServices.options.SynthesisOptions.resetAll();
}
