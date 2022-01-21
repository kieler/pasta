/********************************************************************************
 * Copyright (c) 2018-2021 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import * as path from 'path';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { LspLabelEditActionHandler, WorkspaceEditActionHandler, SprottyLspEditVscodeExtension } from "sprotty-vscode/lib/lsp/editing";
import { SprottyDiagramIdentifier, SprottyLspWebview } from 'sprotty-vscode/lib/lsp';
import { SprottyWebview } from 'sprotty-vscode/lib/sprotty-webview';
import {Action} from 'sprotty-protocol'

export class STPALspVscodeExtension extends SprottyLspEditVscodeExtension {
 
    constructor(context: vscode.ExtensionContext) {
        super('stpa', context);
    }

    protected registerCommands() {
        // command to change hiararchy visualization in the STPA diagram
        super.registerCommands();
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.hierarchy', (...commandArgs: any) => {
                const lC = this.languageClient;
                if (lC)
                    lC.sendNotification('hierarchy')
            }));
        // command to set the colors in the STPA diagram to colorful
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.color.colorful', (...commandArgs: any) => {
                const activeWebview = this.findActiveWebview();
                if (activeWebview)
                    activeWebview.dispatch({
                        kind: 'colorful'
                    } as Action);
            }));
        // command to set the colors in the STPA diagram to print style
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.color.printStyle', (...commandArgs: any) => {
                const activeWebview = this.findActiveWebview();
                if (activeWebview)
                    activeWebview.dispatch({
                        kind: 'printStyle'
                    } as Action);
            }));
        // command to set the colors in the STPA diagram to standard
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.color.standard', (...commandArgs: any) => {
                const activeWebview = this.findActiveWebview();
                if (activeWebview)
                    activeWebview.dispatch({
                        kind: 'standardColor'
                    } as Action);
            }));
        // command to change the forms in the STPA diagram
        this.context.subscriptions.push(
            vscode.commands.registerCommand(this.extensionPrefix + '.diagram.forms', (...commandArgs: any) => {
                const activeWebview = this.findActiveWebview();
                if (activeWebview)
                    activeWebview.dispatch({
                        kind: 'forms'
                    } as Action);
            }));
    }

    protected getDiagramType(commandArgs: any[]): string | undefined {
        if (commandArgs.length === 0
            || commandArgs[0] instanceof vscode.Uri && commandArgs[0].path.endsWith('.stpa')) {
            return 'stpa-diagram';
        }
        return undefined;
    }

    createWebView(identifier: SprottyDiagramIdentifier): SprottyWebview {
        const webview = new SprottyLspWebview({
            extension: this,
            identifier,
            localResourceRoots: [
                this.getExtensionFileUri('pack')
            ],
            scriptUri: this.getExtensionFileUri('pack', 'webview.js'),
            singleton: false // Change this to `true` to enable a singleton view
        });
        webview.addActionHandler(WorkspaceEditActionHandler);
        webview.addActionHandler(LspLabelEditActionHandler);
        return webview;
    }

    protected activateLanguageClient(context: vscode.ExtensionContext): LanguageClient {
        const serverModule = context.asAbsolutePath(path.join('pack', 'language-server'));
        // The debug options for the server
        // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
        // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
        const debugOptions = { execArgv: ['--nolazy', `--inspect${process.env.DEBUG_BREAK ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`] };

        // If the extension is launched in debug mode then the debug server options are used
        // Otherwise the run options are used
        const serverOptions: ServerOptions = {
            run: { module: serverModule, transport: TransportKind.ipc },
            debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
        };

        const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.stpa');
        context.subscriptions.push(fileSystemWatcher);

        // Options to control the language client
        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ scheme: 'file', language: 'stpa' }],
            synchronize: {
                // Notify the server about file changes to files contained in the workspace
                fileEvents: fileSystemWatcher
            }
        };

        // Create the language client and start the client.
        const languageClient = new LanguageClient(
            'stpa',
            'stpa',
            serverOptions,
            clientOptions
        );

        // Start the client. This will also launch the server
        context.subscriptions.push(languageClient.start());
        return languageClient;
    }
}
 