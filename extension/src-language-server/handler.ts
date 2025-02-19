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

import { LangiumSprottySharedServices } from "langium-sprotty";
import { Connection, Range } from "vscode-languageserver";
import { handleFTAConfigInit, handleFTAConfigReset } from "./fta/fta-message-handler.js";
import { FtaServices } from "./fta/fta-module.js";
import { getRangeOfNodeFTA } from "./fta/utils.js";
import { Model, isModel, isModelFTA } from "./generated/ast.js";
import { handleSTPAConfigInit, handleSTPAConfigReset } from "./stpa/message-handler.js";
import { StpaServices } from "./stpa/stpa-module.js";
import { getRangeOfNodeSTPA } from "./stpa/utils.js";
import { getModel } from "./utils.js";

/**
 * Adds handler for notifications.
 * @param connection Connection to the extension.
 * @param shared Shared services containing the workspace.
 */
export function addNotificationHandler(
    connection: Connection,
    shared: LangiumSprottySharedServices,
    stpaServices: StpaServices,
    ftaServices: FtaServices
): void {
    // tells the extension that the language server is ready
    shared.lsp.LanguageServer.onInitialized(() => {
        connection.sendNotification("ready");
    });
    // node selection in diagram
    connection.onNotification("diagram/selected", async (msg: { label: string; uri: string }) => {
        // get the current model
        const model = (await getModel(msg.uri, shared)) as Model;

        let range: Range | undefined = undefined;
        // determine the range in the editor of the component identified by "label"
        if (isModel(model)) {
            range = getRangeOfNodeSTPA(model, msg.label);
        } else if (isModelFTA(model)) {
            range = getRangeOfNodeFTA(model, msg.label);
        }
        if (range) {
            // notify extension to highlight the range in the editor
            connection.sendNotification("editor/highlight", {
                startLine: range.start.line,
                startChar: range.start.character,
                endLine: range.end.line,
                endChar: range.end.character,
                uri: msg.uri,
            });
        } else {
            console.log("The selected element could not be found in the editor.");
        }
    });
    // handle configuration/storage init
    connection.onNotification("config/init", ({ clientId, options }) => {
        handleSTPAConfigInit(clientId, options, stpaServices);
        handleFTAConfigInit(clientId, options, ftaServices);
    });

    // handle reset of the storage
    connection.onRequest("config/reset", () => {
        handleSTPAConfigReset(stpaServices);
        handleFTAConfigReset(ftaServices);
    });
}
