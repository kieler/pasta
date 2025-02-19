/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2022 by
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

import { TableWebview } from "@kieler/table-webview/lib/table-webview";
import * as vscode from "vscode";
import { SendContextTableDataAction } from "./actions";
import { ContextTableData } from "./utils-classes";

export class ContextTablePanel extends TableWebview {
    constructor(identifier: string, localResourceRoots: vscode.Uri[], scriptUri: vscode.Uri, cssUri?: vscode.Uri) {
        super(identifier, localResourceRoots, scriptUri, cssUri);
        this.createWebviewPanel([]);
    }

    setData(data: ContextTableData): void {
        this.sendToWebview({ action: SendContextTableDataAction.create(data) });
    }
}
