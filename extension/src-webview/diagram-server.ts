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

import { injectable } from "inversify";
import { ActionHandlerRegistry } from "sprotty";
import { Action, ActionMessage, CollapseExpandAction } from "sprotty-protocol";
import { VscodeLspEditDiagramServer } from "sprotty-vscode-webview/lib/lsp/editing";
import { SvgAction } from "./actions";

@injectable()
export class PastaDiagramServer extends VscodeLspEditDiagramServer {

    protected sendMessage(message: ActionMessage): void {
        console.log("send to server: " + message.action.kind);
        super.sendMessage(message);
    }

    initialize(registry: ActionHandlerRegistry): void {
        super.initialize(registry);
        registry.register(SvgAction.KIND, this);
    }

    handleLocally(action: Action): boolean {
        switch (action.kind) {
            case SvgAction.KIND:
            case CollapseExpandAction.KIND:
                this.handleSvgAction(action as SvgAction);
        }
        return super.handleLocally(action);
    }

    /**
     * Forwards the {@code action} to the server.
     * @param action The SVGAction.
     * @returns 
     */
    handleSvgAction(action: SvgAction | CollapseExpandAction): boolean {
        this.forwardToServer(action);
        return false;
    }

}