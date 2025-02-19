/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2022-2023 by
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

import { DocumentState } from "langium";
import { LangiumSprottySharedServices } from "langium-sprotty";
import { TextDocumentContentChangeEvent } from "vscode";
import { Connection, URI } from "vscode-languageserver";
import { diagramSizes } from "../diagram-server.js";
import { serializeFTAAST } from "../fta/utils.js";
import { updateValidationChecks } from "../utils.js";
import { setCurrentCursorOffset } from "./diagram/utils.js";
import { createFaultTrees } from "./ftaGeneration/fta-generation.js";
import { generateLTLFormulae } from "./modelChecking/model-checking.js";
import { createResultData } from "./result-report/result-generator.js";
import { StpaServices } from "./stpa-module.js";
import { getControlActions } from "./utils.js";

let lastUri: URI;

/** Needed to enforce IDs on a document that has been changed. */
let textChange: boolean = false;
let textChanges: TextDocumentContentChangeEvent[] = [];
let changeUri: string;

/**
 * Adds handlers for notifications regarding stpa.
 * @param connection
 * @param stpaServices
 */
export function addSTPANotificationHandler(
    connection: Connection,
    stpaServices: StpaServices,
    sharedServices: LangiumSprottySharedServices
): void {
    addContextTableHandler(connection, stpaServices);
    addTextChangeHandler(connection, stpaServices, sharedServices);
    addVerificationHandler(connection, sharedServices);
    addResultHandler(connection, sharedServices);
    addFTAGeneratorHandler(connection, sharedServices);
}

/**
 * Adds handlers for notifications regarding the context table.
 * @param connection
 * @param stpaServices
 */
function addContextTableHandler(connection: Connection, stpaServices: StpaServices): void {
    // the data needed to create the context table is requested
    connection.onNotification("contextTable/getData", async uri => {
        // data is computed and send back to the extension
        lastUri = uri;
        const contextTable = stpaServices.contextTable.ContextTableProvider;
        const data = await contextTable.getData(uri);
        connection.sendNotification("contextTable/data", data);
    });
    // a cell in the context table is selected
    connection.onNotification("contextTable/selected", text => {
        // compute the range of the textual definition of the selected UCA
        const contextTable = stpaServices.contextTable.ContextTableProvider;
        const range = contextTable.getRangeOfUCA(lastUri, text);
        if (range) {
            // highlight the textual definition in the editor
            connection.sendNotification("editor/highlight", {
                startLine: range.start.line,
                startChar: range.start.character,
                endLine: range.end.line,
                endChar: range.end.character,
                uri: lastUri,
            });
        } else {
            console.log("The selected UCA could not be found in the editor.");
        }
    });
}

/**
 * Adds handlers for notifications regarding changes in the editor.
 * @param connection
 * @param stpaServices
 * @param sharedServices
 */
function addTextChangeHandler(
    connection: Connection,
    stpaServices: StpaServices,
    sharedServices: LangiumSprottySharedServices
): void {
    // text in the editor changed
    connection.onNotification("editor/textChange", async ({ changes, uri }) => {
        // save the changes and the uri of the file. Before we can do something we have to wait until the document is built (see below).
        textChange = true;
        textChanges = changes;
        changeUri = uri;
    });
    sharedServices.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, async () => {
        // document built is finished
        if (textChange) {
            // built was triggered because of changes in the editor
            // enforce correct IDs for the STPA components by sending the computed edits to the extension
            const edits = await stpaServices.utility.IDEnforcer.enforceIDs(textChanges, changeUri);
            if (edits.length !== 0) {
                connection.sendNotification("editor/workspaceedit", { edits, uri: changeUri });
            }
            // reset saved changes
            textChange = false;
            textChanges = [];
        }
    });
    // update the cursor position on editor change
    connection.onNotification("editor/change", async offset => {
        setCurrentCursorOffset(offset);
    });
}

/**
 * Adds handlers for verification.
 * @param connection
 * @param sharedServices
 */
function addVerificationHandler(connection: Connection, sharedServices: LangiumSprottySharedServices): void {
    // LTL generation
    connection.onRequest("verification/generateLTL", async (uri: string) => {
        // generate and send back the LTL formula based on the STPA UCAs
        const formulas = await generateLTLFormulae(uri, sharedServices);
        return formulas;
    });
    // get the control actions
    connection.onRequest("verification/getControlActions", async (uri: string) => {
        const controlActions = await getControlActions(uri, sharedServices);
        return controlActions;
    });
}

/**
 * Adds handlers for notifications regarding the STPA result.
 * @param connection
 * @param sharedServices
 */
function addResultHandler(connection: Connection, sharedServices: LangiumSprottySharedServices): void {
    // creates and send back the STPA result data
    connection.onRequest("result/getData", async (uri: string) => {
        const data = await createResultData(uri, sharedServices);
        return data;
    });
    // create the diagrams needed for the STPA result report and send back the widths of them.
    connection.onRequest("result/createDiagrams", async msg => {
        const diagramServerManager = sharedServices.diagram.DiagramServerManager;
        await diagramServerManager.acceptAction(msg);
        return diagramSizes;
    });
}

/**
 * Adds handlers for requests regarding the fault tree creation.
 * @param connection
 */
function addFTAGeneratorHandler(connection: Connection, sharedServices: LangiumSprottySharedServices): void {
    // creates and serializes fault trees
    connection.onRequest("generate/faultTrees", async (uri: string) => {
        const models = await createFaultTrees(uri, sharedServices);
        const texts = models.map(model => serializeFTAAST(model));
        return texts;
    });
}

/**
 * Handles the initialization of the STPA configuration.
 * @param clientId The client id.
 * @param options The options for the configuration.
 * @param stpaServices The services for STPA.
 */
export function handleSTPAConfigInit(clientId: string, options: Record<string, any>, stpaServices: StpaServices): void {
    // update validation checks
    if (options["validation"]) {
        updateValidationChecks(options["validation"], stpaServices.validation.StpaValidator);
    }
    // update synthesis options
    if (options["synthesisOptions"] && clientId !== "") {
        Object.entries(options["synthesisOptions"]).forEach(([key, value]) => {
            stpaServices.options.SynthesisOptions.setOption(key, value);
        });
    }
    // update ID generation option
    if (options["IDGeneration"]) {
        Object.entries(options["IDGeneration"]).forEach(([key, value]) => {
            if (key === "generateIDs") {
                if (value) {
                    stpaServices.utility.IDEnforcer.enable();
                } else {
                    stpaServices.utility.IDEnforcer.disable();
                }
            }
        });
    }
}

/**
 * Resets the STPA configuration.
 * @param stpaServices The services for STPA.
 */
export function handleSTPAConfigReset(stpaServices: StpaServices): void {
    // reset validation checks
    const validator = stpaServices.validation.StpaValidator;
    validator.checkResponsibilitiesForConstraints = true;
    validator.checkConstraintsForUCAs = true;
    validator.checkScenariosForUCAs = true;
    validator.checkSafetyRequirementsForUCAs = true;
    validator.checkMissingFeedback = true;
    // reset synthesis options
    stpaServices.options.SynthesisOptions.resetAll();
    // reset ID generation option
    stpaServices.utility.IDEnforcer.enable();
}
